require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/database');
const { seedAdminUser } = require('./utils/seedAdmin');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const employeeRoutes = require('./routes/employee.routes');
const inviteRoutes = require('./routes/invite.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============== CRITICAL FIX FOR RENDER ==============
// Trust proxy - Required for rate limiter to work behind Render's proxy
// This must be set BEFORE any middleware that uses the client IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust the first proxy (Render's load balancer)
  console.log('✓ Trust proxy enabled for production');
} else {
  app.set('trust proxy', 1); // Also enable for development to be safe
}
// =====================================================

// Security middleware
app.use(helmet({
  // Allow Render's proxy to pass through
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(mongoSanitize());

// CORS configuration - Updated to handle multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'https://novus-vy80.onrender.com', // Explicitly add your frontend URL
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

// Log allowed origins in production for debugging
if (process.env.NODE_ENV === 'production') {
  console.log('✓ CORS allowed origins:', allowedOrigins);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`⚠ Blocked request from origin: ${origin}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - Note: Now works correctly because trust proxy is set
app.use('/api/auth', rateLimiter);

// Health check route (public, no rate limit)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'NovusGuard API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/invite', inviteRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ Database connected');

    // Seed admin user
    await seedAdminUser();
    console.log('✓ Admin user seeded');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`✓ Production URL: https://novus-backend-jqax.onrender.com`);
      }
    });
  } catch (error) {
    console.error('✗ Server initialization failed:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('✗ Unhandled Rejection:', err);
  // Don't exit immediately in production, but log and exit gracefully
  console.error('Server will shut down...');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('✗ Uncaught Exception:', err);
  console.error('Server will shut down...');
  process.exit(1);
});

startServer();