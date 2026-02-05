# Quick Start Guide

This guide will get you up and running in under 10 minutes.

## Prerequisites

| Software | Download Link | Version |
|----------|---------------|---------|
| Node.js | [Download](https://nodejs.org/en/download) | 18+ |
| Git | [Download](https://git-scm.com/downloads) | Latest |
| MetaMask (optional) | [Install](https://metamask.io/download/) | Latest |

### Quick Prerequisites Check

Before starting, verify you have the required software:

```bash
# Check Node.js (should show v18.x.x or higher)
node --version

# Check npm (should show 9.x.x or higher)
npm --version

# Check Git (should show any version)
git --version
```

If any command shows "command not found", follow the detailed installation steps in the main [README.md](README.md).

---

## Installation (3 Steps)

### Step 1: Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/yourusername/polymarket-liquidity-rewards-optimizer.git
cd polymarket-liquidity-rewards-optimizer
```

### Step 2: Install Dependencies

In the project folder, run:

```bash
npm install
```

This downloads all required packages for both backend and frontend. **Takes 2-5 minutes.**

### Step 3: Confirm Environment Files

The repository already includes `.env` files in both packages. Adjust the values if you need different ports.

**Backend `.env` file:**

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env` file:**

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Running the Application

### Start Everything at Once (Recommended)

From the project root:

```bash
npm run dev
```

You should see output like:
```
> Server running on port 3001
> Local: http://localhost:5173/
```

### Access the Application

1. Open your browser: **[http://localhost:5173](http://localhost:5173)**
2. Wait 10-15 seconds for markets to load
3. Click **"Connect Wallet"** (top right) to see your orders (optional)

---

## Alternative: Run Separately

Useful for debugging:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `node: command not found` | Install Node.js from [nodejs.org](https://nodejs.org/en/download) |
| `npm install` fails | Run `npm cache clean --force` then try again |
| Port 3001 in use | Kill other processes or change `PORT` in `packages/backend/.env` |
| Blank page at localhost:5173 | Wait 15 seconds for backend to start, then refresh |
| "Cannot connect to backend" | Make sure backend is running on port 3001 |

For detailed troubleshooting, see the [Troubleshooting](#troubleshooting) section below.

## Building for Production

Build both packages:
```bash
npm run build
```

Or build individually:
```bash
npm run build:backend
npm run build:frontend
```

## Project Structure

```
polymarket_bot/
├── packages/
│   ├── backend/              # Express API + Calculation Engine
│   │   ├── src/
│   │   │   ├── api/          # Polymarket API client
│   │   │   ├── engine/       # Reward calculation logic
│   │   │   ├── simulator/    # Order simulation
│   │   │   ├── routes/       # REST API endpoints
│   │   │   └── server.ts     # Express server
│   │   └── dist/             # Built JavaScript
│   │
│   └── frontend/             # React App
│       ├── src/
│       │   ├── components/   # UI components
│       │   ├── hooks/        # React Query hooks
│       │   └── store/        # Zustand state
│       └── dist/             # Built static files
│
├── package.json              # Monorepo root
└── README.md                 # Full documentation
```

## Using the Application

1. **Open the frontend** at http://localhost:5173

2. **Connect your wallet** (optional):
   - Click "Connect Wallet" in the top right
   - Approve MetaMask connection
   - Your open orders will be automatically fetched

3. **Browse markets**:
   - View all markets with active reward programs
   - Click on any market to select it

4. **Analyze rewards**:
   - See your estimated daily rewards
   - View competition analysis
   - Check your market share

5. **Simulate order moves**:
   - Use the Order Simulator
   - Adjust price with the slider
   - See real-time impact on rewards

6. **Compare markets**:
   - View Market Rankings table
   - Sort by efficiency, reward, or capital
   - Identify best opportunities

## API Endpoints

The backend exposes these endpoints at http://localhost:3001/api:

### Markets
- `GET /markets` - All markets with rewards
- `GET /markets/:id` - Single market details
- `GET /markets/:id/orderbook` - Order book data

### Rewards
- `POST /rewards/calculate` - Calculate user rewards
- `POST /rewards/estimate` - Estimate competition
- `POST /rewards/batch` - Calculate all user positions

### Simulator
- `POST /simulator/move` - Simulate order move
- `POST /simulator/market-comparison` - Compare markets
- `POST /simulator/portfolio` - Portfolio analysis

## Environment Variables

### Backend (.env in packages/backend/)
```
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env in packages/frontend/)
```
VITE_API_URL=http://localhost:3001/api
```

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on port 3001
- Check if frontend proxy is configured correctly

### "MetaMask not found"
- Install MetaMask extension
- Or use any compatible Web3 wallet

### "No markets found"
- Wait 10-15 seconds for markets to load
- Check browser console for API errors

### Port already in use
Change ports in environment variables and vite.config.ts

## Development Tips

- Backend uses `tsx watch` for hot reload
- Frontend uses Vite HMR for instant updates
- Changes to backend require restart
- Changes to frontend are instant

## Testing API Endpoints

Use curl or Postman to test API endpoints:

```bash
# Get all markets
curl http://localhost:3001/api/markets

# Get market order book
curl http://localhost:3001/api/markets/:marketId/orderbook

# Health check
curl http://localhost:3001/health
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the reward calculation logic in `packages/backend/src/engine/`
- Customize the UI in `packages/frontend/src/components/`
- Add new features or improvements

## Support

For issues or questions:
1. Check the main README.md
2. Review console errors
3. Create a GitHub issue with details

---

**Happy optimizing! 🚀**
