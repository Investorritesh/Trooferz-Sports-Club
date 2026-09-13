import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { pingDb } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import sportsRoutes from './routes/sportsRoutes.js';
import facilitiesRoutes from './routes/facilitiesRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
const PORT = env.port;

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    service: 'Trooferz Sports Club API',
    status: 'running',
    health: '/api/health',
    version: '1.1.0'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await pingDb();
    res.json({ ok: true, service: 'trooferz-api', database: 'connected', version: '1.1.0' });
  } catch (error) {
    res.status(503).json({ ok: false, service: 'trooferz-api', database: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await pingDb();
    const server = app.listen(PORT, () => {
      console.log(`Trooferz API running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other Node process or change PORT in backend/.env.`);
        process.exit(1);
      }
      console.error('[SERVER_ERROR]', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Database connection failed:', error?.message || error);
    console.error('Check backend/.env and confirm XAMPP MySQL is running on the configured DB port.');
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('[UNHANDLED_REJECTION]', error);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
  process.exit(1);
});

start();
