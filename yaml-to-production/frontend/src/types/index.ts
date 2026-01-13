export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  yaml_content: string;
  parsed_config?: string;
  tech_stack?: string;
  status: 'draft' | 'processing' | 'deployed' | 'failed';
  security_score?: number;
  vercel_project_id?: string;
  vercel_deployment_id?: string;
  production_url?: string;
  preview_url?: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  user_id: string;
  status: 'pending' | 'validating' | 'generating' | 'auditing' | 'packaging' | 'uploading' | 'building' | 'deploying' | 'success' | 'failed';
  vercel_deployment_id?: string;
  vercel_deployment_url?: string;
  logs: string;
  progress: number;
  current_stage?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  generated_files_count: number;
  security_score?: number;
}

export interface CustomDomain {
  id: string;
  project_id: string;
  domain: string;
  verified: boolean;
  dns_records: string;
  verification_token: string;
  created_at: string;
  verified_at?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'ai' | 'database' | 'storage' | 'auth' | 'payment' | 'email' | 'analytics' | 'other';
  required: boolean;
  configSchema: Record<string, unknown>;
  oauthUrl?: string;
  documentationUrl?: string;
  iconUrl?: string;
}

export interface YamlSpec {
  name: string;
  description?: string;
  version?: string;
  type: 'web-app' | 'api' | 'static' | 'fullstack';
  framework?: string;
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

export interface ValidationResult {
  valid: boolean;
  data?: YamlSpec;
  errors?: Array<{ path: string; message: string; code: string }>;
  warnings?: string[];
  securityIssues?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    recommendation: string;
  }>;
}

export interface AnalysisResult {
  spec: YamlSpec;
  analysis: {
    requiredMCPServers: string[];
    optionalMCPServers: string[];
    detectedTechStack: string;
    suggestedFramework: string;
    environmentVariables: string[];
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    mcpServers: {
      required: MCPServer[];
      recommended: MCPServer[];
    };
  };
  warnings?: string[];
}

export interface SecurityAudit {
  score: number;
  passed: boolean;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    file?: string;
    line?: number;
    recommendation: string;
  }>;
  recommendations: string[];
}

export interface DeploymentProgress {
  stage: string;
  progress: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiKey {
  id: string;
  keyName: string;
  keyType: 'openai' | 'anthropic' | 'vercel' | 'stripe' | 'database' | 'custom';
  createdAt: string;
  updatedAt: string;
  configured: boolean;
}

export interface User {
  id: string;
  email?: string;
  wallet?: string;
}
