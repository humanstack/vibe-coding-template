import { Hono } from 'hono';
import { Env } from '../types/env';
import { YamlParserService } from '../services/yaml-parser';
import { SecurityAuditorService } from '../services/security-auditor';
import { requireAuth } from '../middleware/auth';

const yamlRoutes = new Hono<{ Bindings: Env }>();

// POST /yaml/validate - Validate YAML syntax and structure
yamlRoutes.post('/validate', async (c) => {
  requireAuth(c);

  const body = await c.req.json() as { content: string };

  if (!body.content) {
    return c.json({ error: 'YAML content is required' }, 400);
  }

  const parser = new YamlParserService();
  const result = parser.parse(body.content);

  if (!result.success) {
    return c.json({
      valid: false,
      errors: result.errors
    });
  }

  // Also run security validation on the YAML content
  const auditor = new SecurityAuditorService();
  const securityIssues = auditor.validateYamlSecurity(body.content);

  return c.json({
    valid: true,
    data: result.data,
    warnings: result.warnings,
    securityIssues: securityIssues.length > 0 ? securityIssues : undefined
  });
});

// POST /yaml/analyze - Analyze YAML for dependencies and tech stack
yamlRoutes.post('/analyze', async (c) => {
  requireAuth(c);

  const body = await c.req.json() as { content: string };

  if (!body.content) {
    return c.json({ error: 'YAML content is required' }, 400);
  }

  const parser = new YamlParserService();
  const parseResult = parser.parse(body.content);

  if (!parseResult.success) {
    return c.json({
      error: 'Invalid YAML',
      errors: parseResult.errors
    }, 400);
  }

  const analysis = parser.analyzeDependencies(parseResult.data!);

  // Import MCP service for server recommendations
  const { analyzeMCPRequirements } = await import('../services/mcp');
  const mcpRequirements = analyzeMCPRequirements(parseResult.data!);

  return c.json({
    spec: parseResult.data,
    analysis: {
      ...analysis,
      mcpServers: {
        required: mcpRequirements.required,
        recommended: mcpRequirements.recommended
      }
    },
    warnings: parseResult.warnings
  });
});

// GET /yaml/sample/:type - Get a sample YAML spec
yamlRoutes.get('/sample/:type', async (c) => {
  const type = c.req.param('type') as 'web-app' | 'api' | 'static' | 'fullstack';

  const validTypes = ['web-app', 'api', 'static', 'fullstack'];
  if (!validTypes.includes(type)) {
    return c.json({
      error: 'Invalid type',
      validTypes
    }, 400);
  }

  const parser = new YamlParserService();
  const sample = parser.generateSampleSpec(type);

  return c.text(sample, 200, {
    'Content-Type': 'text/yaml'
  });
});

// POST /yaml/preview - Preview what will be generated (without deploying)
yamlRoutes.post('/preview', async (c) => {
  requireAuth(c);

  const body = await c.req.json() as { content: string };

  if (!body.content) {
    return c.json({ error: 'YAML content is required' }, 400);
  }

  const parser = new YamlParserService();
  const parseResult = parser.parse(body.content);

  if (!parseResult.success) {
    return c.json({
      error: 'Invalid YAML',
      errors: parseResult.errors
    }, 400);
  }

  const spec = parseResult.data!;
  const analysis = parser.analyzeDependencies(spec);

  // Generate a preview of the project structure
  const projectStructure = generateProjectStructurePreview(spec, analysis.suggestedFramework);

  return c.json({
    name: spec.name,
    description: spec.description,
    type: spec.type,
    framework: analysis.suggestedFramework,
    techStack: analysis.detectedTechStack,
    complexity: analysis.estimatedComplexity,
    features: spec.features.map(f => ({
      name: f.name,
      type: f.type,
      description: f.description
    })),
    integrations: spec.integrations?.map(i => ({
      name: i.name,
      type: i.type,
      provider: i.provider
    })),
    environmentVariables: analysis.environmentVariables,
    projectStructure,
    warnings: parseResult.warnings
  });
});

/**
 * Generate a preview of the project file structure
 */
function generateProjectStructurePreview(
  spec: { name: string; type: string; features: Array<{ name: string; type: string }>; integrations?: Array<{ type: string; provider: string }> },
  framework: string
): string[] {
  const files: string[] = [];

  // Config files
  files.push('package.json');
  files.push('tsconfig.json');
  files.push('.gitignore');
  files.push('.env.example');

  if (framework === 'react-vite' || framework === 'react') {
    files.push('vite.config.ts');
    files.push('tailwind.config.js');
    files.push('postcss.config.js');
    files.push('index.html');
    files.push('src/main.tsx');
    files.push('src/App.tsx');
    files.push('src/index.css');
    files.push('src/vite-env.d.ts');
  } else if (framework === 'nextjs') {
    files.push('next.config.js');
    files.push('tailwind.config.js');
    files.push('postcss.config.js');
    files.push('src/app/layout.tsx');
    files.push('src/app/page.tsx');
    files.push('src/app/globals.css');
  } else if (framework === 'cloudflare-workers') {
    files.push('wrangler.toml');
    files.push('src/index.ts');
  }

  // Feature files
  for (const feature of spec.features) {
    const fileName = feature.name.toLowerCase().replace(/\s+/g, '-');

    switch (feature.type) {
      case 'page':
        if (framework === 'nextjs') {
          files.push(`src/app/${fileName}/page.tsx`);
        } else {
          files.push(`src/pages/${fileName}.tsx`);
        }
        break;
      case 'component':
        files.push(`src/components/${fileName}.tsx`);
        break;
      case 'api':
      case 'service':
        files.push(`src/services/${fileName}.ts`);
        break;
    }
  }

  // Integration files
  if (spec.integrations) {
    for (const integration of spec.integrations) {
      if (integration.type === 'auth' && integration.provider === 'privy') {
        files.push('src/providers/privy-provider.tsx');
        files.push('src/hooks/use-auth.ts');
      }
      if (integration.type === 'database' && integration.provider === 'supabase') {
        files.push('src/lib/supabase.ts');
      }
      if (integration.type === 'payment' && integration.provider === 'stripe') {
        files.push('src/lib/stripe.ts');
      }
    }
  }

  return files.sort();
}

export { yamlRoutes };
