import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { Env } from './types/env';
import { authMiddleware } from './middleware/auth';
import { projectRoutes } from './routes/projects';
import { deploymentRoutes } from './routes/deployments';
import { yamlRoutes } from './routes/yaml';
import { domainRoutes } from './routes/domains';
import { mcpRoutes } from './routes/mcp';
import { DeploymentSession } from './services/deployment-session';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://prototype.cafe'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// API version prefix
const api = new Hono<{ Bindings: Env }>();

// Public routes (no auth required)
api.get('/mcp/servers', async (c) => {
  const mcpService = await import('./services/mcp');
  const servers = mcpService.getAvailableMCPServers();
  return c.json({ servers });
});

// Protected routes (auth required)
api.use('/*', authMiddleware);

// Mount route handlers
api.route('/projects', projectRoutes);
api.route('/deployments', deploymentRoutes);
api.route('/yaml', yamlRoutes);
api.route('/domains', domainRoutes);
api.route('/mcp', mcpRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
  }, 500);
});

// Export Durable Object
export { DeploymentSession };

export default app;
