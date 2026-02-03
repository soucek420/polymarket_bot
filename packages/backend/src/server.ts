import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import marketsRouter from './routes/markets';
import rewardsRouter from './routes/rewards';
import simulatorRouter from './routes/simulator';
import { marketCache, orderBookCache, userOrderCache } from './utils/cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/markets', marketsRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/simulator', simulatorRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
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
