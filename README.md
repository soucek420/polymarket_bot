# Polymarket Liquidity Rewards Optimizer

A comprehensive analytics and simulation tool for understanding and optimizing Polymarket liquidity reward earnings. This is **NOT a trading bot** - it's an educational tool that helps market makers analyze their positions, simulate order moves, and compare market efficiency.

## 🎯 Key Features

### Real-Time Analysis
- **Live Market Data**: Fetches current market prices, reward pools, and order books
- **Reward Calculation**: Accurately calculates your liquidity rewards using Polymarket's formula
- **Competition Analysis**: Estimates other market makers' positions and your market share

### Interactive Simulation
- **Order Move Simulator**: See exactly how moving your order 1¢ affects your rewards
- **Price/Size Adjustments**: Interactive sliders to test different order configurations
- **Live Delta Calculation**: Real-time feedback on reward changes

### Market Intelligence
- **Efficiency Rankings**: Compare all markets by reward-per-dollar-at-risk
- **Portfolio Overview**: Total rewards, capital at risk, best/worst performers
- **Visual Analytics**: Score curves, competition charts, and market tables

### Three Key Questions Answered
1. **"If I move my order 1¢, how much more do I earn?"** → Order Simulator with live deltas
2. **"Which market pays best per risk?"** → Market Table sorted by efficiency
3. **"How much reward am I losing by being outside the band?"** → Reward Chart with band visualization

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **State Management**: TanStack Query + Zustand
- **Math**: decimal.js for precise financial calculations
- **Charts**: Recharts for data visualization
- **Wallet**: ethers.js for wallet connection

### Project Structure
```
polymarket_bot/
├── packages/
│   ├── backend/          # Express API server
│   │   ├── src/
│   │   │   ├── api/      # Polymarket API client & wallet integration
│   │   │   ├── engine/   # Core reward calculation logic
│   │   │   ├── simulator/# Order & market simulation
│   │   │   ├── routes/   # REST API endpoints
│   │   │   ├── types/    # TypeScript interfaces
│   │   │   └── utils/    # Helpers & caching
│   │   └── package.json
│   │
│   └── frontend/         # React application
│       ├── src/
│       │   ├── components/ # UI components
│       │   ├── hooks/      # React Query hooks
│       │   ├── store/      # Zustand state
│       │   └── utils/      # API client & formatting
│       └── package.json
│
└── package.json          # Monorepo root
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet (for viewing your orders)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd polymarket_bot
```

2. **Install dependencies**
```bash
npm install
```

This will install dependencies for both backend and frontend packages.

### Running the Application

#### Development Mode (Both servers)
```bash
npm run dev
```

This starts:
- Backend API server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

#### Backend Only
```bash
npm run dev:backend
```

#### Frontend Only
```bash
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

This builds both packages:
- Backend: Compiled to `packages/backend/dist/`
- Frontend: Compiled to `packages/frontend/dist/`

## 📊 How It Works

### Reward Calculation Formula

Polymarket uses a sophisticated scoring system for liquidity rewards:

1. **Order Score**: `S(v,s) = ((v - s) / v)²`
   - `v` = max reward spread (e.g., 0.05 = 5%)
   - `s` = distance from midpoint
   - Orders outside the band get score = 0

2. **Q Values**: 
   - `Q₁` = sum of (score × size) for YES orders
   - `Q₂` = sum of (score × size) for NO orders

3. **Two-Sided Rule**:
   - If midpoint ∈ [0.10, 0.90]: `Qmin = max(min(Q₁, Q₂), max(Q₁/3, Q₂/3))`
   - Otherwise: `Qmin = min(Q₁, Q₂)`

4. **User Share**: `Your Qmin / Total Qmin` (including competition)

5. **Daily Reward**: `User Share × Daily Pool`

### API Endpoints

#### Markets
- `GET /api/markets` - All markets with rewards
- `GET /api/markets/:id` - Single market details
- `GET /api/markets/:id/orderbook` - Order book data
- `GET /api/markets/:id/stats` - Market statistics

#### Rewards
- `POST /api/rewards/calculate` - Calculate rewards for wallet + market
- `POST /api/rewards/estimate` - Estimate competition
- `POST /api/rewards/batch` - Calculate all positions for wallet

#### Simulator
- `POST /api/simulator/move` - Simulate order price/size change
- `POST /api/simulator/price-adjustment` - Simulate moving all orders
- `POST /api/simulator/market-comparison` - Rank markets by efficiency
- `POST /api/simulator/portfolio` - Full portfolio analysis

## 🎮 Usage Guide

### 1. Connect Your Wallet
Click "Connect Wallet" in the top right. This allows the app to fetch your open orders from Polymarket.

### 2. View Your Portfolio
The "Portfolio Stats" section shows:
- Total daily rewards across all positions
- Total capital at risk
- Number of active markets
- Best and worst performing markets

### 3. Select a Market
Click on any market in the "Markets with Rewards" list to:
- View order book and midpoint
- See reward band boundaries
- Analyze competition

### 4. Simulate Order Moves
Use the "Order Simulator" to:
- Adjust price with slider or input
- Change order size
- See real-time impact on rewards
- View percentage change and dollar amounts

### 5. Analyze Competition
The "Competition Analysis" chart shows:
- Your Qmin vs other makers
- Your estimated market share
- Total competition in the market

### 6. Compare Markets
The "Market Rankings" table displays:
- All your positions ranked by efficiency
- Daily reward per market
- Capital at risk
- Reward per dollar at risk
- Reward per 100 shares

## 🔧 Configuration

### Backend Environment Variables
Create `packages/backend/.env`:
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables
Create `packages/frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

## 🧪 Testing

The backend includes pure mathematical functions that can be tested:

```bash
cd packages/backend
npm test
```

## 📈 Performance & Caching

- **Market Data**: Cached for 10 seconds
- **Order Books**: Cached for 5 seconds
- **User Orders**: Cached for 15 seconds
- **Auto-refetch**: Markets refetch every 10s, order books every 5s
- **Debounced Simulation**: 300ms delay on slider changes

## 🔒 Security & Privacy

- **No Private Keys**: Only reads public order data
- **No Trading**: This is an analytics tool only
- **Local Storage**: Only stores wallet address and theme preference
- **Read-Only**: Cannot place, modify, or cancel orders

## 🎨 Features Highlight

### Order Simulator
- Interactive price slider within reward band
- Real-time delta calculation
- Visual feedback on score changes
- Distance from midpoint tracking

### Score Curve Visualization
- Shows reward score vs price
- Highlights midpoint and reward band
- Area chart showing qualifying region
- Reference lines for key prices

### Market Efficiency Table
- Sortable by efficiency, reward, or capital
- Color-coded scores (green = high, red = low)
- Click to select market
- Responsive design

### Dark Mode
- Fully themed UI
- Persists preference
- Smooth transitions
- Chart colors optimized for both modes

## 🐛 Troubleshooting

### "MetaMask is not installed"
Install MetaMask browser extension or use a compatible Web3 wallet.

### "Market not found"
The market may not have active rewards or may have ended.

### "No markets available"
Wait a moment - markets are being fetched from Polymarket API.

### Charts not displaying
Ensure you've selected a market and connected your wallet.

## 🤝 Contributing

This is an educational project. Contributions welcome:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## ⚠️ Disclaimer

This tool is for educational and analytical purposes only. It:
- Does NOT place, modify, or cancel orders
- Does NOT guarantee reward calculations
- Should NOT be used as sole basis for trading decisions
- Estimates competition based on visible order book depth

Always verify calculations and understand the risks of market making.

## 📜 License

MIT License - See LICENSE file for details

## 🔗 Resources

- [Polymarket](https://polymarket.com)
- [Polymarket API Documentation](https://docs.polymarket.com)
- [Liquidity Rewards Program](https://polymarket.com/rewards)

## 👨‍💻 Support

For issues or questions:
1. Check existing GitHub issues
2. Review the troubleshooting section
3. Create a new issue with details

---

**Built with ❤️ for the Polymarket community**
