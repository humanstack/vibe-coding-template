import YAML from 'yaml';
import { z } from 'zod';
import { YamlSpec, YamlFeature, YamlIntegration } from '../types/env';

// Zod schemas for YAML validation
const YamlFeatureSchema = z.object({
  name: z.string().min(1, 'Feature name is required'),
  description: z.string().min(1, 'Feature description is required'),
  type: z.enum(['page', 'component', 'api', 'service', 'database']),
  config: z.record(z.unknown()).optional(),
});

const YamlIntegrationSchema = z.object({
  name: z.string().min(1, 'Integration name is required'),
  type: z.enum(['database', 'auth', 'payment', 'storage', 'email', 'analytics']),
  provider: z.string().min(1, 'Integration provider is required'),
  config: z.record(z.unknown()).optional(),
});

const YamlSpecSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().optional(),
  version: z.string().optional().default('1.0.0'),
  type: z.enum(['web-app', 'api', 'static', 'fullstack']),
  framework: z.enum(['nextjs', 'react-vite', 'cloudflare-workers', 'static']).optional(),
  features: z.array(YamlFeatureSchema).min(1, 'At least one feature is required'),
  integrations: z.array(YamlIntegrationSchema).optional().default([]),
  environment: z.record(z.string()).optional().default({}),
  mcp_servers: z.array(z.string()).optional().default([]),
});

export interface ParseResult {
  success: boolean;
  data?: YamlSpec;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface DependencyAnalysis {
  requiredMCPServers: string[];
  optionalMCPServers: string[];
  detectedTechStack: string;
  suggestedFramework: string;
  environmentVariables: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class YamlParserService {
  /**
   * Parse and validate YAML content
   */
  parse(content: string): ParseResult {
    try {
      // Parse YAML to object
      const parsed = YAML.parse(content);

      if (!parsed || typeof parsed !== 'object') {
        return {
          success: false,
          errors: [{
            path: '',
            message: 'Invalid YAML structure: expected an object',
            code: 'INVALID_STRUCTURE'
          }]
        };
      }

      // Validate against schema
      const result = YamlSpecSchema.safeParse(parsed);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return {
          success: false,
          errors
        };
      }

      // Generate warnings for potential issues
      const warnings = this.generateWarnings(result.data);

      return {
        success: true,
        data: result.data,
        warnings
      };
    } catch (error) {
      if (error instanceof YAML.YAMLParseError) {
        return {
          success: false,
          errors: [{
            path: `line ${error.linePos?.[0]?.line || 'unknown'}`,
            message: error.message,
            code: 'YAML_PARSE_ERROR'
          }]
        };
      }

      return {
        success: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          code: 'UNKNOWN_ERROR'
        }]
      };
    }
  }

  /**
   * Analyze dependencies and requirements from parsed YAML
   */
  analyzeDependencies(spec: YamlSpec): DependencyAnalysis {
    const requiredMCPServers: string[] = ['claude', 'filesystem', 'vercel'];
    const optionalMCPServers: string[] = [];
    const environmentVariables: string[] = [];

    // Detect tech stack based on type and framework
    let detectedTechStack = 'static';
    let suggestedFramework = spec.framework || 'react-vite';

    if (spec.type === 'web-app' || spec.type === 'fullstack') {
      detectedTechStack = 'react';
      suggestedFramework = spec.framework || 'react-vite';
    } else if (spec.type === 'api') {
      detectedTechStack = 'cloudflare-workers';
      suggestedFramework = 'cloudflare-workers';
    }

    // Analyze integrations for MCP server requirements
    for (const integration of spec.integrations || []) {
      switch (integration.type) {
        case 'database':
          if (integration.provider === 'supabase') {
            optionalMCPServers.push('supabase');
            environmentVariables.push('SUPABASE_URL', 'SUPABASE_ANON_KEY');
          } else if (integration.provider === 'planetscale' || integration.provider === 'mysql') {
            environmentVariables.push('DATABASE_URL');
          }
          break;
        case 'auth':
          if (integration.provider === 'privy') {
            environmentVariables.push('PRIVY_APP_ID', 'PRIVY_APP_SECRET');
          } else if (integration.provider === 'supabase') {
            optionalMCPServers.push('supabase');
          }
          break;
        case 'payment':
          if (integration.provider === 'stripe') {
            optionalMCPServers.push('stripe');
            environmentVariables.push('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET');
          }
          break;
        case 'email':
          if (integration.provider === 'resend') {
            optionalMCPServers.push('resend');
            environmentVariables.push('RESEND_API_KEY');
          }
          break;
        case 'storage':
          if (integration.provider === 'github') {
            optionalMCPServers.push('github');
            environmentVariables.push('GITHUB_TOKEN');
          }
          break;
      }
    }

    // Add explicit MCP servers from spec
    for (const server of spec.mcp_servers || []) {
      if (!requiredMCPServers.includes(server) && !optionalMCPServers.includes(server)) {
        optionalMCPServers.push(server);
      }
    }

    // Add environment variables from spec
    for (const envVar of Object.keys(spec.environment || {})) {
      if (!environmentVariables.includes(envVar)) {
        environmentVariables.push(envVar);
      }
    }

    // Estimate complexity based on features and integrations
    const featureCount = spec.features.length;
    const integrationCount = (spec.integrations || []).length;
    const hasDatabase = (spec.integrations || []).some(i => i.type === 'database');
    const hasAuth = (spec.integrations || []).some(i => i.type === 'auth');

    let estimatedComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (featureCount > 5 || integrationCount > 3 || (hasDatabase && hasAuth)) {
      estimatedComplexity = 'complex';
    } else if (featureCount > 2 || integrationCount > 1) {
      estimatedComplexity = 'moderate';
    }

    return {
      requiredMCPServers,
      optionalMCPServers,
      detectedTechStack,
      suggestedFramework,
      environmentVariables,
      estimatedComplexity
    };
  }

  /**
   * Generate warnings for potential issues in the spec
   */
  private generateWarnings(spec: YamlSpec): string[] {
    const warnings: string[] = [];

    // Check for features without proper types
    for (const feature of spec.features) {
      if (feature.type === 'database' && !(spec.integrations || []).some(i => i.type === 'database')) {
        warnings.push(`Feature "${feature.name}" is of type "database" but no database integration is configured`);
      }
    }

    // Check for potentially exposed secrets in environment
    for (const [key, value] of Object.entries(spec.environment || {})) {
      if (value && typeof value === 'string') {
        if (value.includes('sk_') || value.includes('pk_') || value.startsWith('sk-')) {
          warnings.push(`Environment variable "${key}" appears to contain a secret key - this should be set at deployment time, not in the YAML`);
        }
      }
    }

    // Check for missing common integrations
    if (spec.type === 'web-app' || spec.type === 'fullstack') {
      if (!(spec.integrations || []).some(i => i.type === 'auth')) {
        warnings.push('No authentication integration specified - consider adding auth for production applications');
      }
    }

    // Check feature count
    if (spec.features.length > 20) {
      warnings.push('Large number of features detected - consider breaking into multiple projects for maintainability');
    }

    return warnings;
  }

  /**
   * Validate that a YAML string is syntactically correct
   */
  validateSyntax(content: string): { valid: boolean; error?: string } {
    try {
      YAML.parse(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid YAML syntax'
      };
    }
  }

  /**
   * Generate a sample YAML spec for a given type
   */
  generateSampleSpec(type: 'web-app' | 'api' | 'static' | 'fullstack'): string {
    const samples: Record<string, object> = {
      'web-app': {
        name: 'my-web-app',
        description: 'A sample web application',
        version: '1.0.0',
        type: 'web-app',
        framework: 'react-vite',
        features: [
          {
            name: 'Landing Page',
            description: 'Hero section with call-to-action',
            type: 'page'
          },
          {
            name: 'Dashboard',
            description: 'User dashboard with analytics',
            type: 'page'
          },
          {
            name: 'Navigation',
            description: 'Header navigation component',
            type: 'component'
          }
        ],
        integrations: [
          {
            name: 'Authentication',
            type: 'auth',
            provider: 'privy'
          }
        ],
        environment: {
          VITE_APP_NAME: 'My Web App'
        }
      },
      'api': {
        name: 'my-api',
        description: 'A sample API service',
        version: '1.0.0',
        type: 'api',
        framework: 'cloudflare-workers',
        features: [
          {
            name: 'Health Endpoint',
            description: 'Health check endpoint',
            type: 'api'
          },
          {
            name: 'Users API',
            description: 'CRUD operations for users',
            type: 'api'
          }
        ],
        integrations: [
          {
            name: 'Database',
            type: 'database',
            provider: 'supabase'
          }
        ]
      },
      'static': {
        name: 'my-static-site',
        description: 'A sample static website',
        version: '1.0.0',
        type: 'static',
        framework: 'static',
        features: [
          {
            name: 'Home Page',
            description: 'Landing page with hero section',
            type: 'page'
          },
          {
            name: 'About Page',
            description: 'About us page',
            type: 'page'
          }
        ]
      },
      'fullstack': {
        name: 'my-fullstack-app',
        description: 'A sample full-stack application',
        version: '1.0.0',
        type: 'fullstack',
        framework: 'react-vite',
        features: [
          {
            name: 'Landing Page',
            description: 'Marketing landing page',
            type: 'page'
          },
          {
            name: 'Dashboard',
            description: 'Authenticated user dashboard',
            type: 'page'
          },
          {
            name: 'API Service',
            description: 'Backend API for data management',
            type: 'service'
          }
        ],
        integrations: [
          {
            name: 'Database',
            type: 'database',
            provider: 'supabase'
          },
          {
            name: 'Authentication',
            type: 'auth',
            provider: 'privy'
          },
          {
            name: 'Payments',
            type: 'payment',
            provider: 'stripe'
          }
        ],
        environment: {
          VITE_APP_NAME: 'My Fullstack App'
        }
      }
    };

    return YAML.stringify(samples[type], { indent: 2 });
  }
}
