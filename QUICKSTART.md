# Quick Start Guide

## Prerequisites
- Node.js 18 or higher
- npm
- MetaMask or compatible Web3 wallet (optional, for viewing your orders)

## Installation

1. **Install all dependencies:**
```bash
npm install
```

This will install dependencies for both backend and frontend workspaces.

## Running the Application

### Option 1: Run Both (Recommended)
Start both backend and frontend in parallel:
```bash
npm run dev
```

- Backend API: http://localhost:3001
- Frontend UI: http://localhost:5173

### Option 2: Run Separately

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

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
