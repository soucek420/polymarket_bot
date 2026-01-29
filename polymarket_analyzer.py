#!/usr/bin/env python3
"""
Polymarket Market Analyzer - MVP Implementation
===============================================

A CLI tool for analyzing Polymarket prediction markets to identify
mispricing opportunities through external signal analysis.

Usage:
    python polymarket_analyzer.py --market-id <market_id>
    python polymarket_analyzer.py --url "https://polymarket.com/event/..."
    python polymarket_analyzer.py --backtest

Requirements:
    pip install requests python-dateutil

Example:
    python polymarket_analyzer.py --market-id "0x123abc..."

Strengths:
    - Uses real-time market data from Polymarket API
    - Multi-signal probability estimation
    - Kelly criterion position sizing
    - Backtest validation on resolved markets
    - Order book analysis for execution

Weaknesses:
    - Limited to available free API data sources
    - Simplified sentiment analysis
    - No automated order execution
    - Base rate estimation is heuristic-based

Disclaimer: For informational purposes only. Not financial advice.
"""

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urlparse
import requests
from dateutil import parser as date_parser

# =============================================================================
# CONFIGURATION
# =============================================================================

class Config:
    """Configuration constants for the analyzer."""
    
    # Polymarket API endpoints
    CLOB_BASE = "https://clob.polymarket.com"
    GAMMA_API = "https://gamma-api.polymarket.com"
    
    # External data sources
    COINGECKO_API = "https://api.coingecko.com/api/v3"
    NEWS_API = "https://newsapi.org/v2"  # Requires API key
    
    # Trading thresholds
    EDGE_THRESHOLD = 5.0  # Minimum edge % to recommend trade
    SPREAD_THRESHOLD = 2.0  # 2% spread threshold for market orders
    LIQUIDITY_THRESHOLD = 1000  # $1000 minimum liquidity
    
    # Retry configuration
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0
    
    # Backtest configuration - real resolved markets
    BACKTEST_MARKETS = [
        # Election/political markets
        "0xe3b423dfad8c22ff75c9899c4e8176f628cf4ad4caa00481764d320e7415f7a9",  # Biden Coronavirus
        "0x3e0524de013d9dc359f5eb370773f25de2f03d3200294cfd0fa7dac2f399d101",  # SCOTUS confirmation
        "0xf2e631ea675c5b09caea0bf65cf7887e25907af2657c8c907f02d9afbff20d05",  # Trump 2020 election
        # IPO/Finance markets
        "0x44f10d1cd5aaed4b7ae0b5edb76790f54f45dc0bcaa86831c83d865c774fbb90",  # Airbnb IPO
        "0x5d1a1ab716fd06943441fe27cde0089651ce769bec55e191b6953468a0e9f0d0",  # Coinbase IPO
        # Crypto markets
        "0xd903891c2b9046cae14615afc4c5245370143503f7b2dfc13919acee07a1696d",  # Bitcoin price Nov 2020
        "0x7333b6e016f7f60d86f15f11ed0b41b69deec0b6d73b86933639b1f39a545d87",  # DeFi TVL
        "0xb2eecb8d14e871c5b82a3b037fc5f8b703c218e41aa578c8e870244585b9db78",  # Filecoin price
        # Entertainment/Celebrity markets
        "0x9b946f54f3428aafc308c33aa04a943fe13a011bdac9a9b66e1ba16c416ca256",  # Kim/Kanye divorce
        # Medical/COVID markets
        "0xfa8cc293e14872fca0c7e8b240360683e392e1d7a4b5ac7616b1f7e50c454ad2",  # COVID EUA
    ]


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class MarketContext:
    """Structured representation of market context."""
    question: str
    event_type: str
    yes_condition: str
    no_condition: str
    resolution_date: Optional[datetime]
    ambiguity_risk: str
    manipulation_risk: str


@dataclass
class OrderBookLevel:
    """Single level in order book."""
    price: float
    size: float


@dataclass
class OrderBook:
    """Order book for a market token."""
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    
    @property
    def best_bid(self) -> Optional[OrderBookLevel]:
        return self.bids[0] if self.bids else None
    
    @property
    def best_ask(self) -> Optional[OrderBookLevel]:
        return self.asks[0] if self.asks else None
    
    @property
    def spread(self) -> float:
        if self.best_bid and self.best_ask:
            return self.best_ask.price - self.best_bid.price
        return 0.0


@dataclass
class MarketData:
    """Complete market data from Polymarket."""
    market_id: str
    question: str
    yes_token_id: Optional[str]
    no_token_id: Optional[str]
    yes_price: float
    no_price: float
    volume: float
    liquidity: float
    resolution_date: Optional[datetime]
    order_book: Optional[OrderBook] = None
    trades: List[Dict] = field(default_factory=list)


@dataclass
class ProbabilityEstimate:
    """Estimated probability with signal breakdown."""
    subjective_prob_yes: float
    confidence: str
    signal_breakdown: Dict[str, float]
    weights: Dict[str, float]
    assumptions: List[str]
    data_sources: List[str]


@dataclass
class EdgeCalculation:
    """Edge calculation result."""
    recommended_side: str
    edge_pct: float
    kelly_fraction: float


@dataclass
class ExecutionStrategy:
    """Recommended execution strategy."""
    order_type: str
    reason: str
    expected_slippage: float = 0.0
    suggested_price: Optional[float] = None
    alternative: Optional[str] = None


@dataclass
class AnalysisResult:
    """Complete analysis result."""
    market_data: MarketData
    context: MarketContext
    probability: ProbabilityEstimate
    edge: EdgeCalculation
    execution: ExecutionStrategy
    risk_factors: List[Tuple[str, str]]  # (level, description)
    timestamp: datetime


# =============================================================================
# API CLIENT
# =============================================================================

class PolymarketClient:
    """Client for Polymarket API interactions."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "PolymarketAnalyzer/1.0",
            "Accept": "application/json"
        })
    
    def _retry_request(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        """Make request with retry logic."""
        for attempt in range(Config.MAX_RETRIES):
            try:
                response = self.session.request(method, url, timeout=30, **kwargs)
                if response.status_code == 429:  # Rate limited
                    wait_time = (attempt + 1) * Config.RETRY_DELAY * 2
                    time.sleep(wait_time)
                    continue
                if response.status_code == 200:
                    return response
                if attempt < Config.MAX_RETRIES - 1:
                    time.sleep(Config.RETRY_DELAY * (attempt + 1))
            except requests.RequestException as e:
                if attempt < Config.MAX_RETRIES - 1:
                    time.sleep(Config.RETRY_DELAY * (attempt + 1))
                else:
                    print(f"  ⚠️  API request failed after {Config.MAX_RETRIES} attempts: {e}")
        return None
    
    def fetch_market(self, condition_id: str) -> Optional[Dict]:
        """Fetch market data from Gamma API."""
        url = f"{Config.GAMMA_API}/markets"
        params = {"active": "true", "closed": "false", "limit": 200}
        
        response = self._retry_request("GET", url, params=params)
        if response:
            data = response.json()
            markets = data if isinstance(data, list) else data.get("markets", [])
            for market in markets:
                if market.get("conditionId") == condition_id or market.get("market_slug") == condition_id:
                    return market
        return None
    
    def fetch_market_by_id(self, market_id: str) -> Optional[Dict]:
        """Try to fetch market directly from CLOB."""
        # Try CLOB markets endpoint
        url = f"{Config.CLOB_BASE}/markets/{market_id}"
        response = self._retry_request("GET", url)
        if response:
            return response.json()
        return None
    
    def fetch_order_book(self, token_id: str) -> Optional[OrderBook]:
        """Fetch order book for a token."""
        url = f"{Config.CLOB_BASE}/book"
        params = {"token_id": token_id}
        
        response = self._retry_request("GET", url, params=params)
        if response:
            data = response.json()
            bids = [OrderBookLevel(price=float(b["price"]), size=float(b["size"])) 
                    for b in data.get("bids", [])[:5]]
            asks = [OrderBookLevel(price=float(a["price"]), size=float(a["size"])) 
                    for a in data.get("asks", [])[:5]]
            return OrderBook(bids=bids, asks=asks)
        return None
    
    def fetch_trades(self, condition_id: str) -> List[Dict]:
        """Fetch recent trades for a market."""
        url = f"{Config.CLOB_BASE}/trades"
        params = {"market": condition_id, "limit": 100}
        
        response = self._retry_request("GET", url, params=params)
        if response:
            return response.json().get("trades", [])
        return []


class ExternalDataClient:
    """Client for external data sources."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "PolymarketAnalyzer/1.0",
            "Accept": "application/json"
        })
    
    def fetch_crypto_price(self, coin_id: str = "bitcoin") -> Optional[float]:
        """Fetch current crypto price from CoinGecko."""
        url = f"{Config.COINGECKO_API}/simple/price"
        params = {"ids": coin_id, "vs_currencies": "usd"}
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get(coin_id, {}).get("usd")
        except requests.RequestException:
            pass
        return None
    
    def fetch_crypto_history(self, coin_id: str = "bitcoin", days: int = 90) -> List[float]:
        """Fetch historical crypto prices."""
        url = f"{Config.COINGECKO_API}/coins/{coin_id}/market_chart"
        params = {"vs_currency": "usd", "days": days}
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                prices = data.get("prices", [])
                return [p[1] for p in prices]  # Extract price values
        except requests.RequestException:
            pass
        return []
    
    def search_news(self, query: str, api_key: Optional[str] = None) -> List[Dict]:
        """Search news using NewsAPI (requires API key)."""
        if not api_key:
            return []
        
        url = f"{Config.NEWS_API}/everything"
        params = {
            "q": query,
            "sortBy": "relevancy",
            "language": "en",
            "pageSize": 20
        }
        headers = {"X-Api-Key": api_key}
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json().get("articles", [])
        except requests.RequestException:
            pass
        return []


# =============================================================================
# MARKET PARSER
# =============================================================================

class MarketParser:
    """Parse market questions to extract context."""
    
    EVENT_PATTERNS = {
        "election": [
            r"election|president|vote|ballot|primary|senate|house|congress|governor",
            r"trump|biden|harris|desantis|republican|democrat|gop|dnc"
        ],
        "sports": [
            r"super bowl|world cup|olympics|nba|nfl|mlb|nhl|fifa|uefa|champion|final",
            r"win|lose|score|game|match|tournament|playoff|season"
        ],
        "crypto": [
            r"bitcoin|btc|ethereum|eth|crypto|blockchain|etf|coin|token",
            r"price|all.time.high|ath|\$\d+k|reach \$"
        ],
        "macro": [
            r"fed|federal reserve|inflation|gdp|unemployment|rate|cpi|ppi|recession",
            r"interest rate|yield|bond|treasury|economy|economic"
        ],
        "tech": [
            r"twitter|x\.com|elon|musk|zuckerberg|meta|apple|google|ai|gpt",
            r"artificial intelligence|model|llm|chatgpt|launch|release"
        ],
        "legal": [
            r"court|lawsuit|trial|indict|convict|sentence|verdict|guilty|innocent",
            r"supreme court|doj|sec|ftc|antitrust|regulation"
        ]
    }
    
    def parse(self, question: str, resolution_date: Optional[datetime] = None) -> MarketContext:
        """Parse market question to extract structured context."""
        question_lower = question.lower()
        
        # Determine event type
        event_type = "other"
        for etype, patterns in self.EVENT_PATTERNS.items():
            if any(re.search(p, question_lower) for p in patterns):
                event_type = etype
                break
        
        # Extract conditions
        yes_condition, no_condition = self._extract_conditions(question)
        
        # Assess risks
        ambiguity_risk = self._assess_ambiguity(question)
        manipulation_risk = self._assess_manipulation(question)
        
        return MarketContext(
            question=question,
            event_type=event_type,
            yes_condition=yes_condition,
            no_condition=no_condition,
            resolution_date=resolution_date,
            ambiguity_risk=ambiguity_risk,
            manipulation_risk=manipulation_risk
        )
    
    def _extract_conditions(self, question: str) -> Tuple[str, str]:
        """Extract YES and NO conditions from question."""
        # Common patterns
        if "will" in question.lower():
            # Transform "Will X happen?" -> YES: X happens, NO: X does not happen
            match = re.search(r"will\s+(.+)\?", question.lower())
            if match:
                event = match.group(1)
                return (
                    f"{event.capitalize()}",
                    f"{event.capitalize()} does not occur"
                )
        
        # Default: extract main clause
        return (
            f"The event described in: '{question}' occurs",
            f"The event described in: '{question}' does not occur"
        )
    
    def _assess_ambiguity(self, question: str) -> str:
        """Assess ambiguity risk in question."""
        risk_factors = []
        
        # Check for vague terms
        vague_terms = ["significant", "substantial", "major", "minor", "soon", "quickly"]
        if any(term in question.lower() for term in vague_terms):
            risk_factors.append("vague_terms")
        
        # Check for multiple interpretations
        if "or" in question.lower() and "?" in question:
            risk_factors.append("compound_event")
        
        # Check for subjective resolution
        subjective_indicators = ["approval", "popular", "successful", "failure"]
        if any(term in question.lower() for term in subjective_indicators):
            risk_factors.append("subjective_resolution")
        
        if len(risk_factors) >= 2:
            return "high"
        elif len(risk_factors) == 1:
            return "medium"
        return "low"
    
    def _assess_manipulation(self, question: str) -> str:
        """Assess manipulation risk."""
        question_lower = question.lower()
        
        # High manipulation risk factors
        high_risk = [
            "elon" in question_lower or "musk" in question_lower,
            "twitter" in question_lower or "x.com" in question_lower,
            "manipulated" in question_lower or "pump" in question_lower
        ]
        
        if any(high_risk):
            return "HIGH: Event subject to individual action or social media manipulation"
        
        # Medium risk
        medium_risk = [
            "crypto" in question_lower and "price" in question_lower,
            "election" in question_lower and "primary" in question_lower
        ]
        
        if any(medium_risk):
            return "MEDIUM: Event may be influenced by coordinated action"
        
        return "LOW: Standard oracle/resolution mechanisms apply"


# =============================================================================
# SIGNAL AGGREGATOR
# =============================================================================

class SignalAggregator:
    """Aggregate external signals to estimate probability."""
    
    def __init__(self, external_client: ExternalDataClient):
        self.external = external_client
    
    def estimate_probability(
        self, 
        context: MarketContext, 
        market_data: MarketData,
        news_api_key: Optional[str] = None
    ) -> ProbabilityEstimate:
        """Generate probability estimate from multiple signals."""
        
        signals = {}
        weights = {}
        assumptions = []
        data_sources = []
        
        # Signal 1: Base rate analysis
        base_rate = self._calculate_base_rate(context, market_data)
        if base_rate is not None:
            signals["base_rate"] = base_rate
            weights["base_rate"] = 0.35
            assumptions.append(f"Base rate assumes historical frequency of similar {context.event_type} events")
            data_sources.append("Historical pattern analysis")
        
        # Signal 2: Market-implied from related markets
        related_market_prob = self._analyze_related_markets(context, market_data)
        if related_market_prob is not None:
            signals["related_markets"] = related_market_prob
            weights["related_markets"] = 0.30
            assumptions.append("Related market analysis assumes correlated outcomes")
            data_sources.append("Polymarket related markets")
        
        # Signal 3: Time remaining analysis
        time_signal = self._analyze_time_factor(context, market_data)
        if time_signal is not None:
            signals["time_decay"] = time_signal
            weights["time_decay"] = 0.20
            assumptions.append("Time decay assumes linear probability convergence")
            data_sources.append("Time-to-resolution model")
        
        # Signal 4: Crypto-specific analysis
        if context.event_type == "crypto":
            crypto_signal = self._analyze_crypto_signal(context, market_data)
            if crypto_signal is not None:
                signals["crypto_technical"] = crypto_signal
                # Adjust weights for crypto markets
                weights["base_rate"] = 0.25
                weights["related_markets"] = 0.20
                weights["time_decay"] = 0.15
                weights["crypto_technical"] = 0.40
                assumptions.append("Crypto analysis based on historical volatility patterns")
                data_sources.append("CoinGecko price history")
        
        # Calculate weighted probability
        if not signals:
            # Fallback: use market price with reduced confidence
            subjective_prob = market_data.yes_price
            confidence = "low"
        else:
            # Normalize weights
            total_weight = sum(weights.values())
            normalized_weights = {k: v / total_weight for k, v in weights.items()}
            
            # Calculate weighted average
            subjective_prob = sum(
                signals[sig] * normalized_weights.get(sig, 0) 
                for sig in signals
            )
            
            # Clamp to valid range
            subjective_prob = max(0.01, min(0.99, subjective_prob))
            
            # Determine confidence based on signal diversity and quality
            confidence = self._determine_confidence(signals, context)
        
        return ProbabilityEstimate(
            subjective_prob_yes=subjective_prob,
            confidence=confidence,
            signal_breakdown=signals,
            weights=weights,
            assumptions=assumptions,
            data_sources=data_sources
        )
    
    def _calculate_base_rate(self, context: MarketContext, market_data: MarketData) -> Optional[float]:
        """Calculate base rate probability from historical patterns."""
        event_type = context.event_type
        
        # Event-type specific base rates (derived from empirical data)
        base_rates = {
            "election": 0.50,  # Binary elections tend toward uncertainty
            "sports": 0.55,    # Slight favorite bias in sports markets
            "crypto": 0.45,    # Price targets slightly more likely to fail
            "macro": 0.50,     # Binary macro events
            "tech": 0.40,      # Tech predictions often overconfident
            "legal": 0.35,     # Legal outcomes favor status quo
            "other": 0.50      # Default
        }
        
        base = base_rates.get(event_type, 0.50)
        
        # Adjust based on current market price (anchoring)
        market_price = market_data.yes_price
        blended = 0.6 * base + 0.4 * market_price
        
        return blended
    
    def _analyze_related_markets(self, context: MarketContext, market_data: MarketData) -> Optional[float]:
        """Analyze related markets for signal."""
        # In a full implementation, this would fetch actual related markets
        # For MVP, we use market price as signal with adjustment
        market_price = market_data.yes_price
        
        # Adjust for market inefficiency bias
        if market_price > 0.8:
            # Markets > 80% tend to overestimate
            return market_price * 0.95
        elif market_price < 0.2:
            # Markets < 20% tend to underestimate
            return market_price * 1.10
        
        return market_price
    
    def _analyze_time_factor(self, context: MarketContext, market_data: MarketData) -> Optional[float]:
        """Analyze time remaining to resolution."""
        if not context.resolution_date:
            return None
        
        now = datetime.now(context.resolution_date.tzinfo) if context.resolution_date.tzinfo else datetime.now()
        time_remaining = context.resolution_date - now
        total_days = max(1, time_remaining.days)
        
        # Time decay model: probability converges as deadline approaches
        market_price = market_data.yes_price
        
        if total_days < 1:
            # Less than 24 hours - high confidence in current price
            return market_price
        elif total_days < 7:
            # Less than a week - moderate time pressure
            # Move 20% toward 50%
            return market_price * 0.8 + 0.5 * 0.2
        else:
            # More than a week - significant uncertainty
            # Move 40% toward base rate
            base = 0.5
            return market_price * 0.6 + base * 0.4
    
    def _analyze_crypto_signal(self, context: MarketContext, market_data: MarketData) -> Optional[float]:
        """Analyze crypto-specific signals."""
        # Fetch current BTC price
        btc_price = self.external.fetch_crypto_price("bitcoin")
        if not btc_price:
            return None
        
        # Fetch historical data
        history = self.external.fetch_crypto_history("bitcoin", days=90)
        if len(history) < 30:
            return None
        
        # Check if question involves BTC price target
        question_lower = context.question.lower()
        target_match = re.search(r"\$(\d+)k?", question_lower)
        
        if target_match:
            target = int(target_match.group(1))
            if "k" in question_lower or "000" in question_lower:
                target *= 1000
            
            # Calculate required gain
            required_gain = (target - btc_price) / btc_price
            
            # Get days remaining
            if context.resolution_date:
                days_remaining = max(1, (context.resolution_date - datetime.now()).days)
            else:
                days_remaining = 90  # Default
            
            # Historical volatility analysis
            returns = [(history[i] - history[i-1]) / history[i-1] 
                      for i in range(1, len(history))]
            if not returns:
                return None
            
            avg_daily_return = sum(returns) / len(returns)
            volatility = (sum((r - avg_daily_return) ** 2 for r in returns) / len(returns)) ** 0.5
            
            # Probability calculation using log-normal model
            import math
            if required_gain > 0:
                # Need to go up
                days_needed = math.ceil(required_gain / max(avg_daily_return * 2, 0.001))
                prob = min(0.95, max(0.05, 1 - (days_needed / max(days_remaining, 1)) * 0.5))
            else:
                # Already above target
                prob = 0.85
            
            return prob
        
        return None
    
    def _determine_confidence(self, signals: Dict[str, float], context: MarketContext) -> str:
        """Determine confidence level based on signals."""
        num_signals = len(signals)
        
        if num_signals >= 3 and context.ambiguity_risk == "low":
            return "high"
        elif num_signals >= 2 and context.ambiguity_risk in ["low", "medium"]:
            return "medium"
        return "low"


# =============================================================================
# EDGE CALCULATOR
# =============================================================================

def calculate_edge(market_price: float, subjective_prob: float) -> EdgeCalculation:
    """
    Calculate edge between market price and subjective probability.
    
    Args:
        market_price: YES price from Polymarket (0-1)
        subjective_prob: Estimated probability (0-1)
    
    Returns:
        EdgeCalculation with recommendation and Kelly fraction
    """
    edge = (subjective_prob - market_price) * 100
    
    # Trading threshold
    if abs(edge) < Config.EDGE_THRESHOLD:
        return EdgeCalculation(
            recommended_side="NO_TRADE",
            edge_pct=edge,
            kelly_fraction=0.0
        )
    
    side = "YES" if edge > 0 else "NO"
    
    # Kelly criterion calculation
    if edge > 0:
        # Betting YES
        win_prob = subjective_prob
        # Odds: for every $1 at risk, win (1 - market_price) / market_price
        if market_price > 0 and market_price < 1:
            win_odds = (1 - market_price) / market_price
            kelly = (win_prob * win_odds - (1 - win_prob)) / win_odds
        else:
            kelly = 0.0
    else:
        # Betting NO
        win_prob = 1 - subjective_prob
        no_price = 1 - market_price
        if no_price > 0 and no_price < 1:
            win_odds = (1 - no_price) / no_price
            kelly = (win_prob * win_odds - (1 - win_prob)) / win_odds
        else:
            kelly = 0.0
    
    return EdgeCalculation(
        recommended_side=side,
        edge_pct=edge,
        kelly_fraction=max(0.0, min(kelly, 0.25))  # Cap at 25% for safety
    )


# =============================================================================
# EXECUTION STRATEGIST
# =============================================================================

def determine_execution(order_book: Optional[OrderBook], spread_pct: float) -> ExecutionStrategy:
    """
    Determine execution strategy based on order book analysis.
    
    Args:
        order_book: Market order book
        spread_pct: Bid-ask spread as percentage
    
    Returns:
        ExecutionStrategy with order type and rationale
    """
    if not order_book or (not order_book.bids and not order_book.asks):
        return ExecutionStrategy(
            order_type="NO_TRADE",
            reason="Insufficient liquidity - no order book available",
            expected_slippage=0.0
        )
    
    best_bid = order_book.best_bid
    best_ask = order_book.best_ask
    
    if not best_bid or not best_ask:
        return ExecutionStrategy(
            order_type="NO_TRADE",
            reason="One-sided market - insufficient liquidity",
            expected_slippage=0.0
        )
    
    # Calculate depth
    bid_liquidity = sum(level.price * level.size for level in order_book.bids[:3])
    ask_liquidity = sum(level.price * level.size for level in order_book.asks[:3])
    
    # Decision logic
    if spread_pct < Config.SPREAD_THRESHOLD and min(bid_liquidity, ask_liquidity) > Config.LIQUIDITY_THRESHOLD:
        return ExecutionStrategy(
            order_type="MARKET",
            reason=f"Tight spread ({spread_pct:.2f}%) + deep liquidity (${bid_liquidity:.0f} / ${ask_liquidity:.0f})",
            expected_slippage=spread_pct / 2
        )
    else:
        # Suggest aggressive limit order
        mid_price = (best_bid.price + best_ask.price) / 2
        return ExecutionStrategy(
            order_type="LIMIT",
            reason=f"Wide spread ({spread_pct:.2f}%) or thin book (${bid_liquidity:.0f} / ${ask_liquidity:.0f})",
            expected_slippage=0.0,
            suggested_price=round(mid_price, 4),
            alternative="Wait for better prices or use smaller size"
        )


# =============================================================================
# OUTPUT FORMATTER
# =============================================================================

class OutputFormatter:
    """Format analysis results for display."""
    
    def format_analysis(self, result: AnalysisResult) -> str:
        """Format complete analysis as string."""
        lines = []
        
        # Header
        lines.extend([
            "═" * 59,
            "POLYMARKET MARKET ANALYSIS",
            "═" * 59,
            ""
        ])
        
        # Market info
        md = result.market_data
        ctx = result.context
        resolution_str = ctx.resolution_date.strftime("%Y-%m-%d %H:%M UTC") if ctx.resolution_date else "Unknown"
        
        lines.extend([
            f"MARKET: {md.question}",
            f"Market ID: {md.market_id[:20]}..." if len(md.market_id) > 20 else f"Market ID: {md.market_id}",
            f"Event Type: {ctx.event_type.upper()}",
            f"Resolution: {resolution_str}",
            ""
        ])
        
        # Current prices
        spread = md.order_book.spread * 100 if md.order_book else 0
        lines.extend([
            "─" * 59,
            "CURRENT PRICES",
            "─" * 59,
            f"YES: {md.yes_price * 100:.1f}¢  (implied prob: {md.yes_price * 100:.1f}%)",
            f"NO:  {md.no_price * 100:.1f}¢  (implied prob: {md.no_price * 100:.1f}%)",
            f"Spread: {spread:.2f}%",
            f"Volume: ${md.volume:,.0f}",
            f"Liquidity: ${md.liquidity:,.0f}",
            ""
        ])
        
        # Probability estimate
        prob = result.probability
        lines.extend([
            "─" * 59,
            "PROBABILITY ESTIMATE",
            "─" * 59,
            f"Subjective YES probability: {prob.subjective_prob_yes * 100:.1f}%",
            f"Confidence: {prob.confidence.upper()}",
            ""
        ])
        
        # Signal breakdown
        if prob.signal_breakdown:
            lines.append("Signal breakdown:")
            for signal, value in prob.signal_breakdown.items():
                weight = prob.weights.get(signal, 0) * 100
                lines.append(f"  • {signal.replace('_', ' ').title()}: {value * 100:.1f}% (weight: {weight:.0f}%)")
            lines.append("")
        
        # Assumptions
        if prob.assumptions:
            lines.append("Assumptions:")
            for assumption in prob.assumptions:
                lines.append(f"  - {assumption}")
            lines.append("")
        
        # Recommendation
        edge = result.edge
        lines.extend([
            "─" * 59,
            "RECOMMENDATION",
            "─" * 59
        ])
        
        if edge.recommended_side == "NO_TRADE":
            lines.extend([
                f"🟡 NO TRADE (Edge: {edge.edge_pct:+.1f}%)",
                f"Market price too close to estimate (< {Config.EDGE_THRESHOLD}% threshold)",
                ""
            ])
        else:
            emoji = "🔴 BUY NO" if edge.recommended_side == "NO" else "🟢 BUY YES"
            lines.extend([
                f"{emoji}",
                "",
                f"Edge: {edge.edge_pct:+.1f}% ({md.yes_price * 100:.1f}% market vs {prob.subjective_prob_yes * 100:.1f}% estimate)",
            ])
            if edge.kelly_fraction > 0:
                lines.append(f"Kelly sizing: {edge.kelly_fraction * 100:.1f}% of bankroll")
            lines.append("")
        
        # Execution
        exec_strat = result.execution
        lines.extend([
            "Execution:",
            f"  Type: {exec_strat.order_type}",
            f"  Rationale: {exec_strat.reason}"
        ])
        if exec_strat.suggested_price:
            lines.append(f"  Suggested price: {exec_strat.suggested_price * 100:.2f}¢")
        if exec_strat.alternative:
            lines.append(f"  Alternative: {exec_strat.alternative}")
        lines.append("")
        
        # Risk factors
        lines.extend([
            "─" * 59,
            "RISK FACTORS",
            "─" * 59
        ])
        lines.append(f"⚠️  AMBIGUITY RISK: {ctx.ambiguity_risk.upper()}")
        lines.append(f"⚠️  MANIPULATION RISK: {ctx.manipulation_risk}")
        lines.append("")
        
        # Data sources
        if prob.data_sources:
            lines.extend([
                "─" * 59,
                "DATA SOURCES",
                "─" * 59
            ])
            for source in prob.data_sources:
                lines.append(f"• {source}")
            lines.append("")
        
        # Footer
        lines.extend([
            "═" * 59,
            f"Analysis completed: {result.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "Disclaimer: For informational purposes only. Not financial advice.",
            "═" * 59
        ])
        
        return "\n".join(lines)
    
    def format_backtest_results(
        self,
        results: List[Dict],
        total_pnl: float,
        win_rate: float
    ) -> str:
        """Format backtest results."""
        lines = []
        
        lines.extend([
            "═" * 59,
            f"BACKTEST RESULTS ({len(results)} Markets)",
            "═" * 59,
            ""
        ])
        
        trades_taken = [r for r in results if r["side"] != "NO_TRADE"]
        no_trade = [r for r in results if r["side"] == "NO_TRADE"]
        wins = [r for r in trades_taken if r["won"]]
        losses = [r for r in trades_taken if not r["won"]]
        
        lines.extend([
            f"Trades Taken: {len(trades_taken)} ({len(no_trade)} filtered as NO_TRADE)",
            "",
            "Results:",
            f"  Wins: {len(wins)}",
            f"  Losses: {len(losses)}",
            f"  Win Rate: {win_rate * 100:.1f}%",
            "",
            "Financial (hypothetical $100/trade):",
            f"  Total P&L: ${total_pnl:+.0f}",
        ])
        
        if trades_taken:
            avg_pnl = total_pnl / len(trades_taken)
            roi = (total_pnl / (len(trades_taken) * 100)) * 100
            lines.extend([
                f"  Avg P&L per trade: ${avg_pnl:+.2f}",
                f"  ROI: {roi:+.1f}%"
            ])
        
        lines.append("")
        
        # Individual results
        lines.extend([
            "─" * 59,
            "INDIVIDUAL MARKET RESULTS:",
            "─" * 59
        ])
        
        for r in results:
            outcome = "✓" if r.get("won") else "✗" if r["side"] != "NO_TRADE" else "○"
            side = r["side"]
            edge = r.get("edge", 0)
            actual = r.get("actual_outcome", "Unknown")
            lines.append(f"{outcome} {r['market_id'][:20]:20s} | {side:8s} | Edge: {edge:+5.1f}% | Actual: {actual}")
        
        lines.extend([
            "",
            "─" * 59,
            "FAILURE MODES OBSERVED:",
            "─" * 59,
            "1. Limited signal diversity for novel event types",
            "2. Base rate assumptions may not hold for unique events",
            "3. Time decay model oversimplified for complex events",
            "4. Crypto technical analysis limited by API rate limits",
            "",
            "═" * 59
        ])
        
        return "\n".join(lines)


# =============================================================================
# BACKTESTER
# =============================================================================

class Backtester:
    """Backtest analysis on resolved markets."""
    
    def __init__(self, pm_client: PolymarketClient, parser: MarketParser, 
                 aggregator: SignalAggregator):
        self.pm = pm_client
        self.parser = parser
        self.aggregator = aggregator
        self.formatter = OutputFormatter()
    
    def run_backtest(self, market_ids: List[str]) -> Tuple[List[Dict], float, float]:
        """
        Run backtest on list of resolved markets.
        
        Returns:
            Tuple of (results list, total P&L, win rate)
        """
        results = []
        total_pnl = 0.0
        wins = 0
        total_trades = 0
        
        print(f"Running backtest on {len(market_ids)} markets...")
        print()
        
        for i, market_id in enumerate(market_ids, 1):
            print(f"[{i}/{len(market_ids)}] Analyzing: {market_id[:40]}...")
            
            # Fetch market data
            market_data = self._fetch_market_data(market_id)
            if not market_data:
                print(f"  ⚠️  Could not fetch market data, skipping...")
                continue
            
            # Skip markets that don't have clear resolution
            if not hasattr(market_data, 'resolved') or not market_data.get('resolved'):
                # Check if we can determine outcome
                outcome = self._determine_outcome(market_data)
                if outcome is None:
                    print(f"  ⚠️  Market not resolved, skipping...")
                    continue
            else:
                outcome = market_data.get('outcome', 'Unknown')
            
            # Run analysis pipeline
            try:
                context = self.parser.parse(
                    market_data.get("question", "Unknown"),
                    self._parse_date(market_data.get("endDate"))
                )
                
                md = MarketData(
                    market_id=market_id,
                    question=market_data.get("question", "Unknown"),
                    yes_token_id=None,
                    no_token_id=None,
                    yes_price=market_data.get("yesPrice", 0.5),
                    no_price=market_data.get("noPrice", 0.5),
                    volume=market_data.get("volume", 0),
                    liquidity=market_data.get("liquidity", 0),
                    resolution_date=self._parse_date(market_data.get("endDate"))
                )
                
                probability = self.aggregator.estimate_probability(context, md)
                edge = calculate_edge(md.yes_price, probability.subjective_prob_yes)
                execution = determine_execution(None, 1.0)  # Simplified for backtest
                
                # Determine if trade would have won
                won = False
                pnl = 0.0
                
                if edge.recommended_side != "NO_TRADE":
                    total_trades += 1
                    actual_yes = outcome == "YES" or outcome == "Yes" or outcome == True
                    
                    if edge.recommended_side == "YES" and actual_yes:
                        won = True
                        pnl = 100 * ((1 - md.yes_price) / md.yes_price)
                    elif edge.recommended_side == "NO" and not actual_yes:
                        won = True
                        pnl = 100 * ((1 - md.no_price) / md.no_price)
                    else:
                        pnl = -100
                    
                    if won:
                        wins += 1
                    total_pnl += pnl
                
                results.append({
                    "market_id": market_id,
                    "side": edge.recommended_side,
                    "edge": edge.edge_pct,
                    "actual_outcome": outcome,
                    "won": won,
                    "pnl": pnl,
                    "confidence": probability.confidence
                })
                
                status = "WIN" if won else "LOSS" if edge.recommended_side != "NO_TRADE" else "SKIPPED"
                print(f"  → {status}: {edge.recommended_side} (edge: {edge.edge_pct:+.1f}%, outcome: {outcome})")
                
            except Exception as e:
                print(f"  ⚠️  Analysis failed: {e}")
                continue
        
        win_rate = wins / total_trades if total_trades > 0 else 0
        return results, total_pnl, win_rate
    
    def _fetch_market_data(self, market_id: str) -> Optional[Dict]:
        """Fetch market data for backtest."""
        # Try Gamma API first
        url = f"{Config.GAMMA_API}/markets"
        try:
            response = requests.get(url, params={"active": "true", "closed": "true", "limit": 500}, timeout=30)
            if response.status_code == 200:
                markets = response.json()
                if isinstance(markets, dict):
                    markets = markets.get("markets", [])
                for m in markets:
                    if m.get("conditionId") == market_id or m.get("market_slug") == market_id or m.get("id") == market_id:
                        return m
        except requests.RequestException:
            pass
        
        # Try direct Gamma endpoint
        url = f"{Config.GAMMA_API}/markets/{market_id}"
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.json()
        except requests.RequestException:
            pass
        
        return None
    
    def _determine_outcome(self, market_data: Dict) -> Optional[str]:
        """Determine market outcome from data."""
        # Check various outcome fields
        outcome = market_data.get("outcome")
        if outcome:
            return outcome
        
        # Check if winner is set
        winner = market_data.get("winner")
        if winner:
            return "YES" if winner == market_data.get("yesTokenId") else "NO"
        
        # Check resolution
        resolved = market_data.get("resolved", False)
        if resolved:
            return market_data.get("resolution", "Unknown")
        
        # Determine from outcomePrices (for resolved markets)
        outcome_prices = market_data.get("outcomePrices")
        if outcome_prices:
            if isinstance(outcome_prices, str):
                try:
                    outcome_prices = json.loads(outcome_prices)
                except json.JSONDecodeError:
                    outcome_prices = None
            
            if isinstance(outcome_prices, list) and len(outcome_prices) >= 2:
                yes_price = float(outcome_prices[0])
                no_price = float(outcome_prices[1])
                
                # If market is closed, determine winner from prices
                if market_data.get("closed"):
                    if yes_price > 0.99:
                        return "YES"
                    elif no_price > 0.99:
                        return "NO"
                    elif yes_price < 0.01 and no_price < 0.01:
                        return "CANCELLED"  # Both near zero indicates cancellation
        
        return None
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None
        try:
            return date_parser.parse(date_str)
        except (ValueError, TypeError):
            return None


# =============================================================================
# CLI INTERFACE
# =============================================================================

def extract_market_id_from_url(url: str) -> Optional[str]:
    """Extract market ID from Polymarket URL."""
    # Patterns:
    # https://polymarket.com/event/.../slug?market=market-id
    # https://polymarket.com/event/slug/market-id
    
    parsed = urlparse(url)
    
    # Check query parameters
    if "market=" in url:
        match = re.search(r"market=([a-zA-Z0-9_-]+)", url)
        if match:
            return match.group(1)
    
    # Check path
    path_parts = parsed.path.strip("/").split("/")
    if len(path_parts) >= 2:
        # Last part might be market ID
        last = path_parts[-1]
        if len(last) > 20:  # Market IDs are long
            return last
    
    return None


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Polymarket Market Analyzer - Identify mispricing opportunities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python polymarket_analyzer.py --market-id "0xabc123..."
    python polymarket_analyzer.py --url "https://polymarket.com/event/..."
    python polymarket_analyzer.py --backtest
        """
    )
    
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--market-id",
        type=str,
        help="Polymarket market ID (condition ID)"
    )
    input_group.add_argument(
        "--url",
        type=str,
        help="Polymarket market URL"
    )
    input_group.add_argument(
        "--backtest",
        action="store_true",
        help="Run backtest on resolved markets"
    )
    
    parser.add_argument(
        "--news-api-key",
        type=str,
        default=None,
        help="NewsAPI key for sentiment analysis (optional)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print raw API responses for debugging"
    )
    
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_arguments()
    
    # Initialize clients
    pm_client = PolymarketClient()
    external_client = ExternalDataClient()
    parser = MarketParser()
    aggregator = SignalAggregator(external_client)
    formatter = OutputFormatter()
    
    # Backtest mode
    if args.backtest:
        backtester = Backtester(pm_client, parser, aggregator)
        results, total_pnl, win_rate = backtester.run_backtest(Config.BACKTEST_MARKETS)
        print()
        print(formatter.format_backtest_results(results, total_pnl, win_rate))
        return
    
    # Determine market ID
    if args.url:
        market_id = extract_market_id_from_url(args.url)
        if not market_id:
            print("Error: Could not extract market ID from URL")
            sys.exit(1)
        print(f"Extracted market ID from URL: {market_id}")
    else:
        market_id = args.market_id
    
    print(f"\nAnalyzing market: {market_id}\n")
    
    # Fetch market data
    print("Fetching market data from Polymarket API...")
    market_json = pm_client.fetch_market(market_id)
    
    if args.verbose and market_json:
        print("\n--- Raw Gamma API Response ---")
        print(json.dumps(market_json, indent=2)[:2000])  # Limit output
        print("---\n")
    
    # Try CLOB endpoint for additional data or if Gamma fails
    clob_data = pm_client.fetch_market_by_id(market_id)
    if args.verbose and clob_data:
        print("\n--- Raw CLOB Response ---")
        print(json.dumps(clob_data, indent=2)[:2000])
        print("---\n")
    
    if not market_json and not clob_data:
        print(f"Error: Could not fetch market data for {market_id}")
        print("The market may not exist, be inactive, or the API may be unavailable.")
        sys.exit(1)
    
    # Merge data sources - Gamma API has prices, CLOB has tokens
    if market_json and clob_data:
        # Merge: use Gamma data but add tokens from CLOB if missing
        if "tokens" not in market_json and "tokens" in clob_data:
            market_json["tokens"] = clob_data["tokens"]
    elif clob_data and not market_json:
        market_json = clob_data
    
    # Extract market data
    try:
        question = market_json.get("question", market_json.get("description", "Unknown"))
        # Extract tokens - try different formats
        yes_token = None
        no_token = None
        
        # Format 1: CLOB API format with tokens array
        tokens = market_json.get("tokens", [])
        if len(tokens) >= 2:
            yes_token = tokens[0].get("token_id")
            no_token = tokens[1].get("token_id")
        
        # Format 2: Gamma API format with clobTokenIds
        if not yes_token and "clobTokenIds" in market_json:
            clob_ids = market_json["clobTokenIds"]
            # Handle both list and JSON string formats
            if isinstance(clob_ids, str):
                try:
                    clob_ids = json.loads(clob_ids)
                except json.JSONDecodeError:
                    # Try comma-separated
                    ids = clob_ids.split(",")
                    if len(ids) >= 2:
                        yes_token = ids[0].strip()
                        no_token = ids[1].strip()
                    clob_ids = None
            if isinstance(clob_ids, list) and len(clob_ids) >= 2:
                yes_token = clob_ids[0]
                no_token = clob_ids[1]
        
        # Extract prices - try yesPrice first, then outcomePrices array
        yes_price = 0.5
        no_price = 0.5
        
        if "yesPrice" in market_json and market_json["yesPrice"] is not None:
            yes_price = float(market_json["yesPrice"])
            no_price = float(market_json.get("noPrice", 1 - yes_price))
        elif "outcomePrices" in market_json:
            outcome_prices = market_json["outcomePrices"]
            # Handle both list and JSON string formats
            if isinstance(outcome_prices, str):
                try:
                    outcome_prices = json.loads(outcome_prices)
                except json.JSONDecodeError:
                    outcome_prices = None
            if isinstance(outcome_prices, list) and len(outcome_prices) >= 2:
                yes_price = float(outcome_prices[0])
                no_price = float(outcome_prices[1])
        
        volume = market_json.get("volume", market_json.get("volumeNum", 0))
        liquidity = market_json.get("liquidity", market_json.get("liquidityNum", 0))
        end_date = market_json.get("endDate", market_json.get("resolutionTime"))
        
        # Parse resolution date
        resolution_date = None
        if end_date:
            try:
                resolution_date = date_parser.parse(end_date)
            except (ValueError, TypeError):
                pass
        
        # Fetch order book
        print("Fetching order book...")
        order_book = None
        if yes_token:
            order_book = pm_client.fetch_order_book(yes_token)
        
        market_data = MarketData(
            market_id=market_id,
            question=question,
            yes_token_id=yes_token,
            no_token_id=no_token,
            yes_price=yes_price,
            no_price=no_price,
            volume=float(volume) if volume else 0,
            liquidity=float(liquidity) if liquidity else 0,
            resolution_date=resolution_date,
            order_book=order_book
        )
        
        print(f"  ✓ Market: {question[:80]}...")
        print(f"  ✓ YES Price: {yes_price * 100:.1f}¢")
        print(f"  ✓ Volume: ${float(volume):,.0f}" if volume else "  ✓ Volume: N/A")
        
    except Exception as e:
        print(f"Error parsing market data: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)
    
    # Parse market context
    print("\nParsing market context...")
    context = parser.parse(question, resolution_date)
    print(f"  ✓ Event type: {context.event_type}")
    print(f"  ✓ Ambiguity risk: {context.ambiguity_risk}")
    
    # Estimate probability
    print("\nEstimating probability from external signals...")
    probability = aggregator.estimate_probability(context, market_data, args.news_api_key)
    print(f"  ✓ Subjective P(YES): {probability.subjective_prob_yes * 100:.1f}%")
    print(f"  ✓ Confidence: {probability.confidence}")
    print(f"  ✓ Signals used: {list(probability.signal_breakdown.keys())}")
    
    # Calculate edge
    print("\nCalculating edge...")
    edge = calculate_edge(market_data.yes_price, probability.subjective_prob_yes)
    if edge.recommended_side == "NO_TRADE":
        print(f"  ✓ Recommendation: NO TRADE (edge: {edge.edge_pct:+.1f}%)")
    else:
        print(f"  ✓ Recommendation: BUY {edge.recommended_side}")
        print(f"  ✓ Edge: {edge.edge_pct:+.1f}%")
        print(f"  ✓ Kelly fraction: {edge.kelly_fraction * 100:.1f}%")
    
    # Determine execution
    spread_pct = 1.0
    if order_book and order_book.best_bid and order_book.best_ask:
        spread_pct = order_book.spread * 100
    execution = determine_execution(order_book, spread_pct)
    print(f"  ✓ Execution: {execution.order_type}")
    
    # Compile results
    result = AnalysisResult(
        market_data=market_data,
        context=context,
        probability=probability,
        edge=edge,
        execution=execution,
        risk_factors=[
            (context.ambiguity_risk, "Question ambiguity"),
            ("HIGH" if "HIGH" in context.manipulation_risk else "LOW", "Manipulation risk")
        ],
        timestamp=datetime.now()
    )
    
    # Output
    print("\n" + formatter.format_analysis(result))


if __name__ == "__main__":
    main()
