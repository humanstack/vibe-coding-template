import { MCPServerConfig } from '../types/env';

export interface MCPServer {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'ai' | 'database' | 'storage' | 'auth' | 'payment' | 'email' | 'analytics' | 'other';
  required: boolean;
  configSchema: object;
  oauthUrl?: string;
  documentationUrl?: string;
  iconUrl?: string;
}

// Available MCP servers configuration
const MCP_SERVERS: MCPServer[] = [
  {
    id: 'mcp-claude',
    name: 'claude',
    displayName: 'Claude AI',
    description: 'Anthropic Claude for AI-powered code generation and analysis',
    category: 'ai',
    required: true,
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Anthropic API key'
        }
      },
      required: ['apiKey']
    },
    documentationUrl: 'https://docs.anthropic.com'
  },
  {
    id: 'mcp-filesystem',
    name: 'filesystem',
    displayName: 'File System',
    description: 'Local file system access for project management',
    category: 'storage',
    required: true,
    configSchema: {
      type: 'object',
      properties: {}
    },
    documentationUrl: 'https://modelcontextprotocol.io'
  },
  {
    id: 'mcp-vercel',
    name: 'vercel',
    displayName: 'Vercel',
    description: 'Vercel deployment platform integration for automatic deployments',
    category: 'storage',
    required: true,
    configSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Vercel API token from vercel.com/account/tokens'
        }
      },
      required: ['token']
    },
    oauthUrl: 'https://vercel.com/integrations',
    documentationUrl: 'https://vercel.com/docs/rest-api'
  },
  {
    id: 'mcp-github',
    name: 'github',
    displayName: 'GitHub',
    description: 'GitHub integration for repository management and version control',
    category: 'storage',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'GitHub personal access token'
        }
      },
      required: ['token']
    },
    oauthUrl: 'https://github.com/login/oauth/authorize',
    documentationUrl: 'https://docs.github.com'
  },
  {
    id: 'mcp-supabase',
    name: 'supabase',
    displayName: 'Supabase',
    description: 'Supabase database, authentication, and storage integration',
    category: 'database',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Supabase project URL'
        },
        anonKey: {
          type: 'string',
          description: 'Supabase anon/public key'
        },
        serviceKey: {
          type: 'string',
          description: 'Supabase service role key (optional)'
        }
      },
      required: ['url', 'anonKey']
    },
    documentationUrl: 'https://supabase.com/docs'
  },
  {
    id: 'mcp-stripe',
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe payment processing for subscriptions and one-time payments',
    category: 'payment',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        secretKey: {
          type: 'string',
          description: 'Stripe secret key'
        },
        publishableKey: {
          type: 'string',
          description: 'Stripe publishable key'
        },
        webhookSecret: {
          type: 'string',
          description: 'Stripe webhook signing secret'
        }
      },
      required: ['secretKey', 'publishableKey']
    },
    oauthUrl: 'https://connect.stripe.com/oauth/authorize',
    documentationUrl: 'https://stripe.com/docs'
  },
  {
    id: 'mcp-resend',
    name: 'resend',
    displayName: 'Resend',
    description: 'Resend email service for transactional and marketing emails',
    category: 'email',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Resend API key'
        },
        fromEmail: {
          type: 'string',
          description: 'Default from email address'
        }
      },
      required: ['apiKey']
    },
    documentationUrl: 'https://resend.com/docs'
  },
  {
    id: 'mcp-posthog',
    name: 'posthog',
    displayName: 'PostHog',
    description: 'PostHog product analytics for user behavior tracking',
    category: 'analytics',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'PostHog API key'
        },
        host: {
          type: 'string',
          description: 'PostHog host URL (default: https://app.posthog.com)'
        }
      },
      required: ['apiKey']
    },
    documentationUrl: 'https://posthog.com/docs'
  },
  {
    id: 'mcp-cloudflare',
    name: 'cloudflare',
    displayName: 'Cloudflare',
    description: 'Cloudflare Workers, KV, D1, and R2 for edge computing and storage',
    category: 'storage',
    required: false,
    configSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Cloudflare account ID'
        },
        apiToken: {
          type: 'string',
          description: 'Cloudflare API token'
        }
      },
      required: ['accountId', 'apiToken']
    },
    documentationUrl: 'https://developers.cloudflare.com'
  }
];

/**
 * Get all available MCP servers
 */
export function getAvailableMCPServers(): MCPServer[] {
  return MCP_SERVERS;
}

/**
 * Get required MCP servers
 */
export function getRequiredMCPServers(): MCPServer[] {
  return MCP_SERVERS.filter(server => server.required);
}

/**
 * Get optional MCP servers
 */
export function getOptionalMCPServers(): MCPServer[] {
  return MCP_SERVERS.filter(server => !server.required);
}

/**
 * Get MCP server by ID
 */
export function getMCPServerById(id: string): MCPServer | undefined {
  return MCP_SERVERS.find(server => server.id === id);
}

/**
 * Get MCP server by name
 */
export function getMCPServerByName(name: string): MCPServer | undefined {
  return MCP_SERVERS.find(server => server.name === name);
}

/**
 * Get MCP servers by category
 */
export function getMCPServersByCategory(category: MCPServer['category']): MCPServer[] {
  return MCP_SERVERS.filter(server => server.category === category);
}

/**
 * Analyze YAML spec to determine required MCP servers
 */
export function analyzeMCPRequirements(yamlSpec: {
  type: string;
  integrations?: Array<{ type: string; provider: string }>;
  mcp_servers?: string[];
}): {
  required: MCPServer[];
  recommended: MCPServer[];
} {
  const required = getRequiredMCPServers();
  const recommended: MCPServer[] = [];

  // Add servers based on integrations
  for (const integration of yamlSpec.integrations || []) {
    let server: MCPServer | undefined;

    switch (integration.provider.toLowerCase()) {
      case 'supabase':
        server = getMCPServerByName('supabase');
        break;
      case 'stripe':
        server = getMCPServerByName('stripe');
        break;
      case 'resend':
        server = getMCPServerByName('resend');
        break;
      case 'github':
        server = getMCPServerByName('github');
        break;
      case 'posthog':
        server = getMCPServerByName('posthog');
        break;
      case 'cloudflare':
        server = getMCPServerByName('cloudflare');
        break;
    }

    if (server && !required.find(s => s.id === server!.id) && !recommended.find(s => s.id === server!.id)) {
      recommended.push(server);
    }
  }

  // Add explicitly requested MCP servers
  for (const serverName of yamlSpec.mcp_servers || []) {
    const server = getMCPServerByName(serverName);
    if (server && !required.find(s => s.id === server.id) && !recommended.find(s => s.id === server.id)) {
      recommended.push(server);
    }
  }

  return { required, recommended };
}

/**
 * Validate MCP server configuration
 */
export function validateMCPConfig(serverId: string, config: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const server = getMCPServerById(serverId);
  if (!server) {
    return { valid: false, errors: ['Unknown MCP server'] };
  }

  const errors: string[] = [];
  const schema = server.configSchema as {
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };

  // Check required fields
  for (const field of schema.required || []) {
    if (!(field in config) || config[field] === undefined || config[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types
  for (const [field, value] of Object.entries(config)) {
    const fieldSchema = schema.properties[field];
    if (fieldSchema) {
      if (fieldSchema.type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${field} must be a string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
