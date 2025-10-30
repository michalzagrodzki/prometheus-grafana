const express = require('express');
const client = require('prom-client');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Basic JSON logger that writes to stdout and a log file for Promtail/Loki
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logStream = fs.createWriteStream(path.join(logDirectory, 'app.log'), { flags: 'a' });

function writeLog(level, message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  const line = `${JSON.stringify(entry)}\n`;
  logStream.write(line);
  process.stdout.write(line);
}

const logger = {
  info: (message, metadata) => writeLog('info', message, metadata),
  error: (message, metadata) => writeLog('error', message, metadata)
};

logStream.on('error', (err) => {
  process.stderr.write(`Logger stream error: ${err.message}\n`);
});

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom Metrics
// 1. Counter - tracks total number of requests processed
const requestCounter = new client.Counter({
  name: 'app_requests_total',
  help: 'Total number of requests processed',
  labelNames: ['status', 'endpoint'],
  registers: [register]
});

// 2. Gauge - tracks current active connections (goes up and down)
const activeConnectionsGauge = new client.Gauge({
  name: 'app_active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// 3. Gauge - tracks temperature reading (simulated sensor data)
const temperatureGauge = new client.Gauge({
  name: 'app_temperature_celsius',
  help: 'Current temperature reading in Celsius',
  registers: [register]
});

// 4. Histogram - tracks request duration
const requestDurationHistogram = new client.Histogram({
  name: 'app_request_duration_seconds',
  help: 'Duration of requests in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// 5. Counter - tracks errors
const errorCounter = new client.Counter({
  name: 'app_errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register]
});

// Function to generate random metrics at random intervals
function generateRandomMetrics() {
  // Random interval between 500ms and 3000ms
  const randomInterval = Math.floor(Math.random() * 2500) + 500;
  
  setTimeout(() => {
    // Simulate request processing
    const statusCodes = ['200', '201', '400', '404', '500'];
    const endpoints = ['/api/users', '/api/products', '/api/orders'];
    const randomStatus = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    // Increment request counter
    requestCounter.inc({ status: randomStatus, endpoint: randomEndpoint });
    
    // Update active connections (random number between 0 and 50)
    const activeConnections = Math.floor(Math.random() * 50);
    activeConnectionsGauge.set(activeConnections);
    
    // Update temperature (random between 18 and 35 degrees)
    const temperature = (Math.random() * 17 + 18).toFixed(2);
    temperatureGauge.set(parseFloat(temperature));
    
    // Simulate request duration (random between 0.1 and 3 seconds)
    const duration = Math.random() * 2.9 + 0.1;
    requestDurationHistogram.observe({ endpoint: randomEndpoint }, duration);
    
    // Occasionally simulate errors (10% chance)
    if (Math.random() < 0.1) {
      const errorTypes = ['timeout', 'validation', 'database', 'network'];
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      errorCounter.inc({ type: randomError });
      logger.error('Simulated application error', {
        endpoint: randomEndpoint,
        errorType: randomError
      });
    }
    
    logger.info('Generated metrics samples', {
      endpoint: randomEndpoint,
      status: randomStatus,
      connections: activeConnections,
      temperature: parseFloat(temperature),
      durationMs: Math.round(duration * 1000)
    });
    
    // Schedule next random metric generation
    generateRandomMetrics();
  }, randomInterval);
}

// Request logging middleware for Loki
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('HTTP request completed', {
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs)
    });
  });
  next();
});

// Metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Metrics Generator for Prometheus',
    endpoints: {
      metrics: '/metrics',
      health: '/health'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info('Metrics server started', { port: PORT, endpoint: '/metrics' });
  logger.info('Starting random metrics generation loop');
  
  // Start generating random metrics
  generateRandomMetrics();
});

const shutdown = () => {
  logger.info('Shutting down metrics server');
  logStream.end(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
