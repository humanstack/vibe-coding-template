import { Hono } from 'hono';
import { Env } from '../types/env';
import { DatabaseService } from '../services/database';
import { requireAuth } from '../middleware/auth';
import { encrypt, decrypt, maskSecret } from '../utils/encryption';
import {
  getAvailableMCPServers,
  getMCPServerById,
  validateMCPConfig,
  analyzeMCPRequirements
} from '../services/mcp';
import { z } from 'zod';

const mcpRoutes = new Hono<{ Bindings: Env }>();

// GET /mcp/servers - List all available MCP servers (already public in main router)
mcpRoutes.get('/servers', async (c) => {
  const servers = getAvailableMCPServers();
  return c.json({ servers });
});

// GET /mcp/servers/:id - Get specific MCP server details
mcpRoutes.get('/servers/:id', async (c) => {
  const serverId = c.req.param('id');
  const server = getMCPServerById(serverId);

  if (!server) {
    return c.json({ error: 'MCP server not found' }, 404);
  }

  return c.json({ server });
});

// POST /mcp/analyze - Analyze YAML spec for MCP requirements
mcpRoutes.post('/analyze', async (c) => {
  requireAuth(c);

  const body = await c.req.json() as {
    type: string;
    integrations?: Array<{ type: string; provider: string }>;
    mcp_servers?: string[];
  };

  const requirements = analyzeMCPRequirements(body);

  return c.json({
    required: requirements.required,
    recommended: requirements.recommended
  });
});

// POST /mcp/configure - Configure MCP server for a project
const ConfigureSchema = z.object({
  projectId: z.string().min(1),
  serverId: z.string().min(1),
  config: z.record(z.string())
});

mcpRoutes.post('/configure', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json();
  const validation = ConfigureSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'Validation error',
      details: validation.error.errors
    }, 400);
  }

  const { projectId, serverId, config } = validation.data;

  // Verify project ownership
  const project = await db.getProjectById(projectId);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Validate server exists
  const server = getMCPServerById(serverId);
  if (!server) {
    return c.json({ error: 'MCP server not found' }, 404);
  }

  // Validate configuration
  const configValidation = validateMCPConfig(serverId, config);
  if (!configValidation.valid) {
    return c.json({
      error: 'Invalid configuration',
      details: configValidation.errors
    }, 400);
  }

  // Encrypt sensitive values and store
  const encryptedConfig: Record<string, unknown> = {};
  const sensitiveFields = ['apiKey', 'token', 'secret', 'secretKey', 'serviceKey', 'webhookSecret'];

  for (const [key, value] of Object.entries(config)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      // Store sensitive values as encrypted API keys
      const { encrypted, iv } = await encrypt(value, c.env.ENCRYPTION_KEY);
      await db.createUserApiKey({
        userId: user.id,
        keyName: `${serverId}-${key}`,
        keyType: server.category,
        encryptedValue: encrypted,
        iv
      });
      encryptedConfig[key] = '[ENCRYPTED]';
    } else {
      encryptedConfig[key] = value;
    }
  }

  // Save MCP selection
  await db.createUserMCPSelection({
    userId: user.id,
    projectId,
    mcpServerId: serverId,
    config: encryptedConfig
  });

  return c.json({
    success: true,
    server: server.displayName,
    configured: true
  });
});

// POST /mcp/authorize - Mark MCP server as authorized (after OAuth flow)
mcpRoutes.post('/authorize', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json() as {
    projectId: string;
    serverId: string;
    authCode?: string;
  };

  if (!body.projectId || !body.serverId) {
    return c.json({ error: 'projectId and serverId are required' }, 400);
  }

  // Verify project ownership
  const project = await db.getProjectById(body.projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Mark as authorized
  await db.updateUserMCPSelection(user.id, body.projectId, body.serverId, true);

  return c.json({
    success: true,
    message: 'MCP server authorized successfully'
  });
});

// GET /mcp/selections/:projectId - Get MCP selections for a project
mcpRoutes.get('/selections/:projectId', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('projectId');

  // Verify project ownership
  const project = await db.getProjectById(projectId);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const selections = await db.getUserMCPSelections(user.id, projectId);

  return c.json({
    selections: selections.map(s => ({
      ...s,
      config: s.config ? JSON.parse(s.config) : null
    }))
  });
});

// API Keys management routes
// GET /mcp/keys - List user's stored API keys (masked)
mcpRoutes.get('/keys', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const keys = await db.getUserApiKeys(user.id);

  return c.json({
    keys: keys.map(k => ({
      id: k.id,
      keyName: k.key_name,
      keyType: k.key_type,
      createdAt: k.created_at,
      updatedAt: k.updated_at,
      // Never return the actual encrypted value
      configured: true
    }))
  });
});

// POST /mcp/keys - Store a new API key
const StoreKeySchema = z.object({
  keyName: z.string().min(1).max(100),
  keyType: z.enum(['openai', 'anthropic', 'vercel', 'stripe', 'database', 'custom']),
  value: z.string().min(1)
});

mcpRoutes.post('/keys', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json();
  const validation = StoreKeySchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'Validation error',
      details: validation.error.errors
    }, 400);
  }

  const { keyName, keyType, value } = validation.data;

  // Encrypt the value
  const { encrypted, iv } = await encrypt(value, c.env.ENCRYPTION_KEY);

  // Store the key
  const key = await db.createUserApiKey({
    userId: user.id,
    keyName,
    keyType,
    encryptedValue: encrypted,
    iv
  });

  return c.json({
    id: key.id,
    keyName: key.key_name,
    keyType: key.key_type,
    maskedValue: maskSecret(value),
    createdAt: key.created_at
  }, 201);
});

// DELETE /mcp/keys/:name - Delete an API key
mcpRoutes.delete('/keys/:name', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const keyName = c.req.param('name');

  const deleted = await db.deleteUserApiKey(user.id, keyName);

  if (!deleted) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ success: true });
});

// POST /mcp/keys/test - Test an API key (verify it works)
mcpRoutes.post('/keys/test', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json() as { keyName: string };

  if (!body.keyName) {
    return c.json({ error: 'keyName is required' }, 400);
  }

  const key = await db.getUserApiKey(user.id, body.keyName);

  if (!key) {
    return c.json({ error: 'Key not found' }, 404);
  }

  try {
    const decrypted = await decrypt(key.encrypted_value, key.iv, c.env.ENCRYPTION_KEY);

    // Test the key based on type
    let testResult: { valid: boolean; message: string };

    switch (key.key_type) {
      case 'vercel':
        testResult = await testVercelToken(decrypted);
        break;
      case 'anthropic':
        testResult = await testAnthropicKey(decrypted);
        break;
      case 'openai':
        testResult = await testOpenAIKey(decrypted);
        break;
      case 'stripe':
        testResult = await testStripeKey(decrypted);
        break;
      default:
        testResult = { valid: true, message: 'Key stored successfully (not tested)' };
    }

    return c.json(testResult);
  } catch (error) {
    return c.json({
      valid: false,
      message: 'Failed to decrypt key'
    }, 500);
  }
});

// Helper functions to test API keys
async function testVercelToken(token: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const user = await response.json() as { user: { username: string } };
      return { valid: true, message: `Connected as ${user.user.username}` };
    }

    return { valid: false, message: 'Invalid Vercel token' };
  } catch {
    return { valid: false, message: 'Failed to connect to Vercel' };
  }
}

async function testAnthropicKey(key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    });

    if (response.ok || response.status === 400) {
      // 400 means the key is valid but request was malformed (which is fine for testing)
      return { valid: true, message: 'Anthropic API key is valid' };
    }

    return { valid: false, message: 'Invalid Anthropic API key' };
  } catch {
    return { valid: false, message: 'Failed to connect to Anthropic' };
  }
}

async function testOpenAIKey(key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });

    if (response.ok) {
      return { valid: true, message: 'OpenAI API key is valid' };
    }

    return { valid: false, message: 'Invalid OpenAI API key' };
  } catch {
    return { valid: false, message: 'Failed to connect to OpenAI' };
  }
}

async function testStripeKey(key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` }
    });

    if (response.ok) {
      return { valid: true, message: 'Stripe API key is valid' };
    }

    return { valid: false, message: 'Invalid Stripe API key' };
  } catch {
    return { valid: false, message: 'Failed to connect to Stripe' };
  }
}

export { mcpRoutes };
