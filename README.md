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

Before you begin, you'll need to install the following software on your computer:

| Requirement | Version | Download Link | Why You Need It |
|-------------|---------|---------------|-----------------|
| Node.js | 18+ | [Download Node.js](https://nodejs.org/en/download) | JavaScript runtime for running the application |
| npm | Included with Node.js | Installs automatically with Node.js | Package manager for installing dependencies |
| Git | Latest | [Download Git](https://git-scm.com/downloads) | Version control for cloning the repository |
| MetaMask (optional) | Latest | [Install MetaMask](https://metamask.io/download/) | Web3 wallet for viewing your Polymarket orders |

#### Step 1: Install Node.js and npm

**For Windows:**
1. Go to [nodejs.org](https://nodejs.org/en/download) and click the **Windows Installer** button
2. Download the **LTS (Long Term Support)** version
3. Run the downloaded `.msi` file
4. Follow the installation wizard (accept all defaults)
5. **Verify installation** by opening Command Prompt or PowerShell and running:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers like `v18.x.x` and `9.x.x`

**For macOS:**
1. Go to [nodejs.org](https://nodejs.org/en/download) and click the **macOS Installer** button
2. Download the **LTS (Long Term Support)** version
3. Run the downloaded `.pkg` file
4. Follow the installation wizard
5. **Verify installation** by opening Terminal and running:
   ```bash
   node --version
   npm --version
   ```

**For Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository for latest version
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 2: Install Git (if not already installed)

**For Windows:**
1. Go to [git-scm.com/downloads](https://git-scm.com/downloads) and click **Windows**
2. Download and run the installer
3. Accept all default settings during installation

**For macOS:**
```bash
# If you have Homebrew installed:
brew install git

# Or download from git-scm.com
```

**Verify Git installation:**
```bash
git --version
```

#### Step 3: Install MetaMask (Optional - for viewing your orders)

MetaMask is a browser extension that allows you to connect your wallet to see your Polymarket orders.

**Chrome/Brave/Edge:**
1. Go to [metamask.io/download](https://metamask.io/download/)
2. Click **Install MetaMask for Chrome**
3. Click **Add to Chrome**
4. Follow the setup wizard to create a new wallet or import an existing one

**Firefox:**
1. Go to [metamask.io/download](https://metamask.io/download/)
2. Click **Install MetaMask for Firefox**
3. Click **Add to Firefox**
4. Follow the setup wizard

> **Note:** MetaMask is only needed if you want to view your own orders. You can still browse markets and use the simulator without it.

---

### Installation

#### Step 1: Clone the Repository

Open your terminal/command prompt and run:

```bash
# Clone the repository
git clone https://github.com/soucek420/polymarket_bot.git

# Navigate into the project folder
cd polymarket_bot
```

**What this does:** Downloads a copy of the project code to your computer.

#### Step 2: Install Dependencies

Inside the project folder, run:

```bash
npm install
```

**What this does:**
- Downloads all required libraries for both the backend and frontend
- Creates a `node_modules` folder with all dependencies
- This may take 2-5 minutes depending on your internet speed

**Troubleshooting:**
- If you see `npm ERR!`, try running: `npm cache clean --force` then `npm install` again
- On Windows, if you get permission errors, run Command Prompt as Administrator
- On macOS/Linux, if you get permission errors, check that you own the directory

#### Step 3: Set Up Environment Variables

You need to create two configuration files for the application to run properly.

**Create Backend Environment File:**

1. Navigate to the backend package:
   ```bash
   cd packages/backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Or manually create a new file called `.env`:
   - **Windows:** Type `notepad .env` and press Enter
   - **macOS/Linux:** Type `touch .env` then `nano .env` (or use any text editor)

3. The `.env` file should contain:
   ```env
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

4. Save and close the file

**Create Frontend Environment File:**

1. Navigate to the frontend package:
   ```bash
   cd ../frontend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Or manually create a new file called `.env`:
   - **Windows:** Type `notepad .env` and press Enter
   - **macOS/Linux:** Type `touch .env` then `nano .env`

3. The `.env` file should contain:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. Save and close the file

5. Go back to the project root:
   ```bash
   cd ../..
   ```

**What this does:** Tells the frontend where to find the backend API, and sets which port the backend listens on.

---

### Running the Application

#### Option 1: Run Both Servers (Recommended)

From the project root folder, run:

```bash
npm run dev
```

**What this does:**
- Starts the **Backend API** on `http://localhost:3001`
- Starts the **Frontend** on `http://localhost:5173`
- Runs both in parallel using a single command

**Verify it's working:**
1. Open your browser and go to: `http://localhost:5173`
2. You should see the application loading
3. If you see a page with "Markets with Rewards" heading, it's working!

#### Option 2: Run Servers Separately

If you prefer to run them in separate terminal windows:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```
You should see: `Server running on port 3001`

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
You should see: `Local: http://localhost:5173/`

---

### Building for Production

When you're ready to deploy, build the application:

```bash
npm run build
```

**What this does:**
- Compiles the backend TypeScript to JavaScript in `packages/backend/dist/`
- Builds the frontend for production in `packages/frontend/dist/`
- Optimizes code for better performance

**To run the production build:**
```bash
# Start the backend (serves both API and frontend)
cd packages/backend
npm start
```

The production build will be available at `http://localhost:3001`

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
Copy `packages/backend/.env.example` to `packages/backend/.env`:
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables
Copy `packages/frontend/.env.example` to `packages/frontend/.env`:
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
