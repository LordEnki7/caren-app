import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  securityHeaders, 
  createRateLimit, 
  validateRequest, 
  SecurityAuditLogger,
  SECURITY_CONFIG 
} from "./security";

const app = express();

// Environment detection for security configuration
const isProduction = process.env.NODE_ENV === 'production';

// Configure trust proxy for proper rate limiting and security behind reverse proxy
// This enables proper IP detection for rate limiting when behind load balancers
if (isProduction) {
  // Production: Trust first proxy (commonly used behind reverse proxy/load balancer)
  app.set('trust proxy', 1);
  console.log('[TRUST_PROXY] Production mode: trusting first proxy for IP detection');
} else {
  // Development: Trust all proxies for easier local testing
  app.set('trust proxy', true);
  console.log('[TRUST_PROXY] Development mode: trusting all proxies');
}

// Security middleware (development-friendly)
if (isProduction) {
  app.use(securityHeaders);
  
  // Increased rate limiting for production (custom domain compatibility)
  app.use('/api/', createRateLimit(
    15 * 60 * 1000, // 15 minutes
    500, // 500 requests per 15 minutes (increased from 100)
    'Too many API requests from this IP, please try again later'
  ));

  // Production rate limiting for auth endpoints - stricter for security
  app.use('/api/auth/login', createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 login attempts per 15 minutes per IP
    'Too many login attempts, please try again later'
  ));
  
  app.use('/api/auth/register', createRateLimit(
    60 * 60 * 1000, // 1 hour
    5, // 5 registration attempts per hour per IP
    'Too many registration attempts, please try again later'
  ));
  
  app.use('/api/auth/demo-login', createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 demo login attempts per 15 minutes per IP
    'Too many demo login attempts, please try again later'
  ));
  
  // General auth endpoints with moderate limits
  app.use('/api/auth/', createRateLimit(
    15 * 60 * 1000, // 15 minutes
    50, // 50 requests per 15 minutes (reduced from 100)
    'Too many authentication requests, please try again later'
  ));
} else {
  // Development mode - minimal security restrictions
  app.use(securityHeaders);
  
  // Very lenient rate limiting for development auth endpoints to prevent login issues
  app.use('/api/auth/', createRateLimit(
    5 * 60 * 1000, // 5 minutes
    100, // 100 attempts per 5 minutes (very generous for development)
    'Too many authentication attempts, please try again later'
  ));
}

// Production-ready CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isProduction) {
      // Production: Allow specific domains only
      const allowedOrigins = [
        process.env.CLIENT_URL, // Main web app domain
        process.env.CUSTOM_DOMAIN_URL, // Custom domain if configured
        process.env.MOBILE_APP_DOMAIN, // Mobile app domain for API calls
        'capacitor://localhost', // Capacitor mobile app
        'ionic://localhost', // Ionic mobile app
        'http://localhost', // Local development (mobile app testing)
        'https://localhost' // Local HTTPS development
      ].filter(Boolean); // Remove undefined values
      
      if (!origin) {
        // Allow same-origin requests (no origin header)
        return callback(null, true);
      }
      
      // Check if origin matches allowed domains
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (!allowedOrigin) return false;
        // Exact match or subdomain match
        return origin === allowedOrigin || origin.endsWith(`.${allowedOrigin.replace(/^https?:\/\//, '')}`);
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`[CORS] Blocked origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    } else {
      // Development: Allow any origin for easier testing
      callback(null, true);
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization', // For Bearer tokens
    'Cache-Control',
    'Pragma',
    'X-API-Key', // For API key authentication
    'X-Custom-Domain-Token' // For custom domain authentication
  ],
  optionsSuccessStatus: 200 // Support legacy browsers
};

// Apply CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (corsOptions.origin) {
    corsOptions.origin(origin, (err, allow) => {
      if (err || !allow) {
        if (req.method === 'OPTIONS') {
          return res.status(403).json({ error: 'CORS policy violation' });
        }
        // For non-OPTIONS requests, continue but log the violation
        console.log(`[CORS] Warning: ${req.method} ${req.path} from blocked origin: ${origin}`);
      }
      
      if (allow && origin) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(corsOptions.optionsSuccessStatus);
      } else {
        next();
      }
    });
  } else {
    next();
  }
});

console.log(`[CORS] Configured for ${isProduction ? 'production' : 'development'} mode`);

// Session configuration with production security and mobile compatibility
// SECURITY FIX: Improved HTTPS detection and hardened cookie settings
const isHTTPS = process.env.FORCE_HTTPS === 'true' || 
                isProduction || 
                process.env.NODE_ENV === 'production' || 
                (process.env.DEPLOYMENT_URL && process.env.DEPLOYMENT_URL.startsWith('https://'));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || (isProduction ? 
    (() => { throw new Error('SESSION_SECRET must be set in production'); })() : 
    'caren-dev-secret-2025'
  ),
  resave: false,
  saveUninitialized: false, // Security: Prevent session fixation attacks
  cookie: {
    // SECURITY FIX: Always use secure cookies in production, flexible in development
    secure: isHTTPS,
    // SECURITY FIX: Always use httpOnly for security - prevents XSS attacks
    httpOnly: true, // Changed from isProduction to always true for security
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'strict' as const : 'lax' as const, // Stricter in production
    domain: undefined // Let browser decide the domain automatically
  },
  name: 'caren.sid',
  rolling: true
};

// For custom domain deployments, we maintain compatibility through:
// 1. Custom domain tokens (Bearer auth) for mobile apps
// 2. Secure cookies for web browser sessions
// 3. Proper CORS configuration for cross-origin requests
// 4. Trust proxy configuration for proper rate limiting
console.log(`[SESSION_CONFIG] Production mode: ${isProduction}, HTTPS: ${isHTTPS}`);
console.log(`[SESSION_CONFIG] Trust proxy: ${app.get('trust proxy')}`);
console.log(`[SESSION_CONFIG] Cookie settings - secure: ${sessionConfig.cookie.secure}, httpOnly: ${sessionConfig.cookie.httpOnly}, sameSite: ${sessionConfig.cookie.sameSite}`);
console.log(`[SESSION_CONFIG] SECURITY HARDENED: httpOnly always enabled, secure cookies for HTTPS`);

app.use(session(sessionConfig));

// Debug session middleware with error handling
app.use((req, res, next) => {
  try {
    console.log(`[SESSION_DEBUG] ${req.method} ${req.path}`);
    console.log(`[SESSION_DEBUG] Session ID: ${req.sessionID}`);
    console.log(`[SESSION_DEBUG] Cookies received:`, req.headers.cookie);
    console.log(`[SESSION_DEBUG] User-Agent:`, req.headers['user-agent']?.slice(0, 50));
    
    // Only log detailed session data for auth endpoints to reduce noise
    if (req.path.startsWith('/api/auth/')) {
      console.log(`[SESSION_DEBUG] Session data:`, (req.session as any));
    }
    next();
  } catch (error) {
    console.error('[SESSION_DEBUG] Middleware error:', error);
    next(); // Continue processing rather than stopping the request
  }
});

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add video file serving before other middleware to ensure proper MIME types
app.use('/videos', express.static(path.join(process.cwd(), 'public/videos'), {
  setHeaders: (res, filePath) => {
    console.log('[VIDEO_SERVING] Serving video file:', filePath);
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache'); // Disable caching for debugging
    }
  }
}));

// Request validation and sanitization - skip for auth endpoints
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    console.log('[MIDDLEWARE] Bypassing security validation for auth endpoint:', req.path);
    next();
  } else {
    validateRequest(req, res, next);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add subscription plans endpoint BEFORE Vite setup to prevent conflicts
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const { db } = await import("./db");
      const { subscriptionPlans } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      console.log('Direct subscription plans endpoint accessed');
      const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
      console.log('Direct endpoint returning plans:', plans.length);
      
      res.setHeader('Content-Type', 'application/json');
      res.json(plans);
    } catch (error) {
      console.error('Direct endpoint error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log security-related errors
    SecurityAuditLogger.logSuspiciousActivity('APPLICATION_ERROR', {
      error: message,
      status,
      stack: err.stack?.substring(0, 500) // Truncate stack trace
    }, req);

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const responseMessage = isProduction && status === 500 
      ? "An unexpected error occurred" 
      : message;

    res.status(status).json({ 
      message: responseMessage,
      ...(isProduction ? {} : { stack: err.stack })
    });
    
    if (status >= 500) {
      console.error(`[ERROR] ${message}`, err.stack);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
