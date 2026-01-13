export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SECRETS: KVNamespace;

  // R2 Bucket
  PROJECT_FILES: R2Bucket;

  // Durable Objects
  DEPLOYMENT_SESSION: DurableObjectNamespace;

  // Environment variables
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY: string;
  VERCEL_API_TOKEN: string;
  PRIVY_APP_ID: string;
  PRIVY_APP_SECRET: string;
  ENCRYPTION_KEY: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  yaml_content: string;
  parsed_config: string | null;
  tech_stack: string | null;
  status: 'draft' | 'processing' | 'deployed' | 'failed';
  security_score: number | null;
  vercel_project_id: string | null;
  vercel_deployment_id: string | null;
  production_url: string | null;
  preview_url: string | null;
  environment: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  user_id: string;
  status: 'pending' | 'validating' | 'generating' | 'auditing' | 'packaging' | 'uploading' | 'building' | 'deploying' | 'success' | 'failed';
  vercel_deployment_id: string | null;
  vercel_deployment_url: string | null;
  logs: string;
  progress: number;
  current_stage: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  generated_files_count: number;
  security_score: number | null;
}

export interface CustomDomain {
  id: string;
  project_id: string;
  user_id: string;
  domain: string;
  verified: number; // SQLite boolean (0 or 1)
  dns_records: string;
  verification_token: string;
  created_at: string;
  verified_at: string | null;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  key_name: string;
  key_type: string;
  encrypted_value: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  required: number;
  config_schema: string;
  oauth_url: string | null;
  documentation_url: string | null;
  icon_url: string | null;
  enabled: number;
  created_at: string;
}

export interface YamlSpec {
  name: string;
  description?: string;
  version?: string;
  type: 'web-app' | 'api' | 'static' | 'fullstack';
  framework?: 'nextjs' | 'react-vite' | 'cloudflare-workers' | 'static';
  features: YamlFeature[];
  integrations?: YamlIntegration[];
  environment?: Record<string, string>;
  mcp_servers?: string[];
}

export interface YamlFeature {
  name: string;
  description: string;
  type: 'page' | 'component' | 'api' | 'service' | 'database';
  config?: Record<string, unknown>;
}

export interface YamlIntegration {
  name: string;
  type: 'database' | 'auth' | 'payment' | 'storage' | 'email' | 'analytics';
  provider: string;
  config?: Record<string, unknown>;
}

export interface SecurityAuditResult {
  score: number;
  passed: boolean;
  issues: SecurityIssue[];
  recommendations: string[];
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
}

export interface DeploymentProgress {
  stage: 'validating' | 'generating' | 'auditing' | 'packaging' | 'uploading' | 'building' | 'deploying' | 'complete' | 'failed';
  progress: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface GeneratedCode {
  files: GeneratedFile[];
  techStack: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  envVars: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'config' | 'style' | 'asset';
}

export interface GenerationProgress {
  stage: string;
  message: string;
  filesGenerated: number;
  totalFiles: number;
  progress: number;
}
