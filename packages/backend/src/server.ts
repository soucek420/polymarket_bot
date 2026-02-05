import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import marketsRouter from './routes/markets';
import rewardsRouter from './routes/rewards';
import simulatorRouter from './routes/simulator';
import { marketCache, orderBookCache, userOrderCache } from './utils/cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/markets', marketsRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/simulator', simulatorRouter);

// Serve static files from the React app
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req: Request, res: Response) => {
  // If it's an API request that didn't match any route
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
    });
  }
  
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  if (req.path === '/') {
    return res.json({
      status: 'ok',
      message: 'Backend is running. Use /api for endpoints or /health for status.',
    });
  }
  res.status(404).json({
    success: false,
    error: 'Route not found. If you are in development, please use http://localhost:5173',
  });
});

setInterval(() => {
  marketCache.cleanup();
  orderBookCache.cleanup();
  userOrderCache.cleanup();
}, 60000);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints:`);
  console.log(`   - GET  /api/markets`);
  console.log(`   - GET  /api/markets/:id`);
  console.log(`   - GET  /api/markets/:id/orderbook`);
  console.log(`   - POST /api/rewards/calculate`);
  console.log(`   - POST /api/rewards/estimate`);
  console.log(`   - POST /api/simulator/move`);
  console.log(`   - POST /api/simulator/market-comparison`);
  console.log(`   - POST /api/simulator/portfolio`);
});

export default app;
