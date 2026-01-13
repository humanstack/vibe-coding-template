import Anthropic from '@anthropic-ai/sdk';
import { YamlSpec, GeneratedCode, GeneratedFile, GenerationProgress } from '../types/env';

export type ProgressCallback = (progress: GenerationProgress) => void;

export class CodeGeneratorService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateCode(
    spec: YamlSpec,
    techStack: string,
    onProgress?: ProgressCallback
  ): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};
    const scripts: Record<string, string> = {};
    const envVars: string[] = [];

    try {
      // Step 1: Analyze and plan the project structure
      onProgress?.({
        stage: 'analyzing',
        message: 'Analyzing project requirements...',
        filesGenerated: 0,
        totalFiles: 0,
        progress: 0
      });

      const projectPlan = await this.analyzeProject(spec, techStack);

      // Step 2: Generate core configuration files
      onProgress?.({
        stage: 'generating-config',
        message: 'Generating configuration files...',
        filesGenerated: 0,
        totalFiles: projectPlan.estimatedFiles,
        progress: 10
      });

      const configFiles = await this.generateConfigFiles(spec, techStack, projectPlan);
      files.push(...configFiles);
      Object.assign(dependencies, projectPlan.dependencies);
      Object.assign(devDependencies, projectPlan.devDependencies);
      Object.assign(scripts, projectPlan.scripts);
      envVars.push(...projectPlan.envVars);

      // Step 3: Generate feature files
      let generatedCount = configFiles.length;
      for (const feature of spec.features) {
        onProgress?.({
          stage: 'generating-features',
          message: `Generating ${feature.name}...`,
          filesGenerated: generatedCount,
          totalFiles: projectPlan.estimatedFiles,
          progress: 20 + (generatedCount / projectPlan.estimatedFiles) * 30
        });

        const featureFiles = await this.generateFeatureFiles(spec, feature, techStack);
        files.push(...featureFiles);
        generatedCount += featureFiles.length;
      }

      // Step 4: Generate integration files
      for (const integration of spec.integrations || []) {
        onProgress?.({
          stage: 'generating-integrations',
          message: `Setting up ${integration.name}...`,
          filesGenerated: generatedCount,
          totalFiles: projectPlan.estimatedFiles,
          progress: 50 + (generatedCount / projectPlan.estimatedFiles) * 30
        });

        const integrationFiles = await this.generateIntegrationFiles(spec, integration, techStack);
        files.push(...integrationFiles);
        generatedCount += integrationFiles.length;
      }

      // Step 5: Generate entry point and routing
      onProgress?.({
        stage: 'finalizing',
        message: 'Finalizing project structure...',
        filesGenerated: generatedCount,
        totalFiles: projectPlan.estimatedFiles,
        progress: 80
      });

      const entryFiles = await this.generateEntryFiles(spec, techStack, files);
      files.push(...entryFiles);

      onProgress?.({
        stage: 'complete',
        message: 'Code generation complete!',
        filesGenerated: files.length,
        totalFiles: files.length,
        progress: 100
      });

      return {
        files,
        techStack,
        dependencies,
        devDependencies,
        scripts,
        envVars
      };
    } catch (error) {
      console.error('Code generation error:', error);
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeProject(spec: YamlSpec, techStack: string): Promise<{
    estimatedFiles: number;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
    envVars: string[];
  }> {
    const prompt = `Analyze this project specification and return a JSON object with the project plan.

Project Specification:
${JSON.stringify(spec, null, 2)}

Tech Stack: ${techStack}

Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "estimatedFiles": <number of files to generate>,
  "dependencies": { "<package>": "<version>" },
  "devDependencies": { "<package>": "<version>" },
  "scripts": { "<script-name>": "<command>" },
  "envVars": ["<ENV_VAR_NAME>"]
}

For a ${techStack} project, include appropriate dependencies. For React/Vite include react, react-dom, react-router-dom.
For API projects include hono or express. Include tailwindcss for styling.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    try {
      return JSON.parse(content.text);
    } catch {
      // Return default plan if parsing fails
      return this.getDefaultProjectPlan(spec, techStack);
    }
  }

  private getDefaultProjectPlan(spec: YamlSpec, techStack: string) {
    const baseDeps: Record<string, string> = {};
    const baseDevDeps: Record<string, string> = {};
    const scripts: Record<string, string> = {};
    const envVars: string[] = [];

    if (techStack === 'react-vite' || techStack === 'react') {
      Object.assign(baseDeps, {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.22.0',
        '@privy-io/react-auth': '^1.64.0'
      });
      Object.assign(baseDevDeps, {
        '@vitejs/plugin-react': '^4.2.0',
        'vite': '^5.1.0',
        'typescript': '^5.3.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        'tailwindcss': '^3.4.0',
        'postcss': '^8.4.0',
        'autoprefixer': '^10.4.0'
      });
      Object.assign(scripts, {
        'dev': 'vite',
        'build': 'tsc && vite build',
        'preview': 'vite preview',
        'lint': 'eslint . --ext ts,tsx'
      });
      envVars.push('VITE_PRIVY_APP_ID');
    } else if (techStack === 'cloudflare-workers') {
      Object.assign(baseDeps, {
        'hono': '^4.3.0'
      });
      Object.assign(baseDevDeps, {
        'wrangler': '^3.57.0',
        '@cloudflare/workers-types': '^4.20240512.0',
        'typescript': '^5.3.0'
      });
      Object.assign(scripts, {
        'dev': 'wrangler dev',
        'deploy': 'wrangler deploy'
      });
    } else if (techStack === 'nextjs') {
      Object.assign(baseDeps, {
        'next': '^14.1.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        '@privy-io/react-auth': '^1.64.0'
      });
      Object.assign(baseDevDeps, {
        'typescript': '^5.3.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        'tailwindcss': '^3.4.0',
        'postcss': '^8.4.0',
        'autoprefixer': '^10.4.0'
      });
      Object.assign(scripts, {
        'dev': 'next dev',
        'build': 'next build',
        'start': 'next start',
        'lint': 'next lint'
      });
      envVars.push('NEXT_PUBLIC_PRIVY_APP_ID');
    }

    // Add integration-specific env vars
    for (const integration of spec.integrations || []) {
      if (integration.type === 'database' && integration.provider === 'supabase') {
        envVars.push('SUPABASE_URL', 'SUPABASE_ANON_KEY');
      }
      if (integration.type === 'payment' && integration.provider === 'stripe') {
        envVars.push('STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY');
      }
    }

    const estimatedFiles = 5 + spec.features.length * 2 + (spec.integrations?.length || 0);

    return {
      estimatedFiles,
      dependencies: baseDeps,
      devDependencies: baseDevDeps,
      scripts,
      envVars
    };
  }

  private async generateConfigFiles(
    spec: YamlSpec,
    techStack: string,
    plan: { dependencies: Record<string, string>; devDependencies: Record<string, string>; scripts: Record<string, string> }
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // package.json
    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: spec.name.toLowerCase().replace(/\s+/g, '-'),
        version: spec.version || '1.0.0',
        description: spec.description || `Generated from YAML specification`,
        private: true,
        type: 'module',
        scripts: plan.scripts,
        dependencies: plan.dependencies,
        devDependencies: plan.devDependencies
      }, null, 2),
      type: 'config'
    });

    // TypeScript config
    if (techStack === 'react-vite' || techStack === 'react' || techStack === 'nextjs') {
      files.push({
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
            baseUrl: '.',
            paths: { '@/*': ['./src/*'] }
          },
          include: ['src'],
          references: [{ path: './tsconfig.node.json' }]
        }, null, 2),
        type: 'config'
      });

      files.push({
        path: 'tsconfig.node.json',
        content: JSON.stringify({
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: 'ESNext',
            moduleResolution: 'bundler',
            allowSyntheticDefaultImports: true,
            strict: true
          },
          include: ['vite.config.ts']
        }, null, 2),
        type: 'config'
      });
    }

    // Vite config for React
    if (techStack === 'react-vite' || techStack === 'react') {
      files.push({
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})`,
        type: 'config'
      });
    }

    // Tailwind config
    if (techStack !== 'cloudflare-workers') {
      files.push({
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}`,
        type: 'config'
      });

      files.push({
        path: 'postcss.config.js',
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
        type: 'config'
      });
    }

    // index.html for Vite
    if (techStack === 'react-vite' || techStack === 'react') {
      files.push({
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${spec.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
        type: 'config'
      });
    }

    // .env.example
    const envExampleLines = [
      '# Environment Variables',
      '# Copy this file to .env and fill in your values',
      ''
    ];

    for (const [key, value] of Object.entries(spec.environment || {})) {
      envExampleLines.push(`${key}=${value || ''}`);
    }

    files.push({
      path: '.env.example',
      content: envExampleLines.join('\n'),
      type: 'config'
    });

    // .gitignore
    files.push({
      path: '.gitignore',
      content: `# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# TypeScript
*.tsbuildinfo
`,
      type: 'config'
    });

    return files;
  }

  private async generateFeatureFiles(
    spec: YamlSpec,
    feature: { name: string; description: string; type: string; config?: Record<string, unknown> },
    techStack: string
  ): Promise<GeneratedFile[]> {
    const prompt = `Generate production-ready code for this feature.

Project: ${spec.name}
Tech Stack: ${techStack}

Feature:
- Name: ${feature.name}
- Description: ${feature.description}
- Type: ${feature.type}
${feature.config ? `- Config: ${JSON.stringify(feature.config)}` : ''}

Return ONLY a valid JSON array (no markdown, no code blocks) of file objects:
[
  {
    "path": "src/path/to/file.tsx",
    "content": "<complete file content>",
    "type": "source"
  }
]

Guidelines:
- Use TypeScript
- Use Tailwind CSS for styling
- Include proper imports
- Add TypeScript types/interfaces
- Make components functional and composable
- Follow best practices for ${techStack}
- For pages, include complete page components
- For components, make them reusable
- For services, include proper error handling`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    try {
      // Try to extract JSON from the response
      let jsonText = content.text;

      // Remove markdown code blocks if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText.trim());
    } catch {
      // Generate a placeholder component if parsing fails
      return this.generatePlaceholderFeature(feature, techStack);
    }
  }

  private generatePlaceholderFeature(
    feature: { name: string; description: string; type: string },
    techStack: string
  ): GeneratedFile[] {
    const componentName = feature.name.replace(/\s+/g, '');
    const fileName = feature.name.toLowerCase().replace(/\s+/g, '-');

    if (feature.type === 'page') {
      return [{
        path: `src/pages/${fileName}.tsx`,
        content: `import React from 'react';

interface ${componentName}Props {}

const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">${feature.name}</h1>
        <p className="text-gray-600">${feature.description}</p>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          {/* Add your content here */}
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default ${componentName};
`,
        type: 'source'
      }];
    }

    if (feature.type === 'component') {
      return [{
        path: `src/components/${fileName}.tsx`,
        content: `import React from 'react';

interface ${componentName}Props {
  className?: string;
}

const ${componentName}: React.FC<${componentName}Props> = ({ className = '' }) => {
  return (
    <div className={\`\${className}\`}>
      {/* ${feature.description} */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium">${feature.name}</h3>
      </div>
    </div>
  );
};

export default ${componentName};
`,
        type: 'source'
      }];
    }

    if (feature.type === 'api' || feature.type === 'service') {
      return [{
        path: `src/services/${fileName}.ts`,
        content: `/**
 * ${feature.name}
 * ${feature.description}
 */

export interface ${componentName}Response {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class ${componentName}Service {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<${componentName}Response> {
    try {
      const response = await fetch(\`\${this.baseUrl}/${fileName}\`);

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const ${fileName.replace(/-/g, '')}Service = new ${componentName}Service();
`,
        type: 'source'
      }];
    }

    return [];
  }

  private async generateIntegrationFiles(
    spec: YamlSpec,
    integration: { name: string; type: string; provider: string; config?: Record<string, unknown> },
    techStack: string
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate provider-specific integration files
    if (integration.provider === 'privy' && integration.type === 'auth') {
      files.push({
        path: 'src/providers/privy-provider.tsx',
        content: `import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyAuthProviderProps {
  children: ReactNode;
}

export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    console.warn('VITE_PRIVY_APP_ID is not set');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'github'],
        appearance: {
          theme: 'light',
          accentColor: '#0ea5e9',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
`,
        type: 'source'
      });

      files.push({
        path: 'src/hooks/use-auth.ts',
        content: `import { usePrivy } from '@privy-io/react-auth';

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    linkEmail,
    linkWallet,
  } = usePrivy();

  return {
    isLoading: !ready,
    isAuthenticated: authenticated,
    user: user ? {
      id: user.id,
      email: user.email?.address,
      wallet: user.wallet?.address,
    } : null,
    login,
    logout,
    linkEmail,
    linkWallet,
  };
}
`,
        type: 'source'
      });
    }

    if (integration.provider === 'supabase' && integration.type === 'database') {
      files.push({
        path: 'src/lib/supabase.ts',
        content: `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  // Add your database types here
};
`,
        type: 'source'
      });
    }

    if (integration.provider === 'stripe' && integration.type === 'payment') {
      files.push({
        path: 'src/lib/stripe.ts',
        content: `import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export async function createCheckoutSession(priceId: string) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  return response.json();
}
`,
        type: 'source'
      });
    }

    return files;
  }

  private async generateEntryFiles(
    spec: YamlSpec,
    techStack: string,
    existingFiles: GeneratedFile[]
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Identify pages from existing files
    const pageFiles = existingFiles.filter(f => f.path.includes('/pages/'));
    const hasAuth = spec.integrations?.some(i => i.type === 'auth');

    if (techStack === 'react-vite' || techStack === 'react') {
      // Global CSS
      files.push({
        path: 'src/index.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-height: 100vh;
}
`,
        type: 'style'
      });

      // App component with routing
      const routes = pageFiles.map(f => {
        const name = f.path.split('/').pop()?.replace('.tsx', '') || '';
        const componentName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        const path = name === 'landing-page' || name === 'home' ? '/' : `/${name}`;
        return { name, componentName, path, filePath: f.path };
      });

      const imports = routes.map(r =>
        `import ${r.componentName} from './${r.filePath.replace('src/', '').replace('.tsx', '')}';`
      ).join('\n');

      files.push({
        path: 'src/App.tsx',
        content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${hasAuth ? "import { PrivyAuthProvider } from './providers/privy-provider';" : ''}
${imports}

function App() {
  return (
    ${hasAuth ? '<PrivyAuthProvider>' : ''}
      <BrowserRouter>
        <Routes>
          ${routes.map(r => `<Route path="${r.path}" element={<${r.componentName} />} />`).join('\n          ')}
        </Routes>
      </BrowserRouter>
    ${hasAuth ? '</PrivyAuthProvider>' : ''}
  );
}

export default App;
`,
        type: 'source'
      });

      // Main entry point
      files.push({
        path: 'src/main.tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
        type: 'source'
      });

      // Vite env types
      files.push({
        path: 'src/vite-env.d.ts',
        content: `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,
        type: 'source'
      });
    }

    return files;
  }
}
