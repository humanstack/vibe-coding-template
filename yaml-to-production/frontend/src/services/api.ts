import type {
  Project,
  Deployment,
  CustomDomain,
  MCPServer,
  ValidationResult,
  AnalysisResult,
  ApiKey,
} from '@/types';

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Projects API
export const projectsApi = {
  list: (token: string, limit = 50, offset = 0) =>
    fetchApi<{ projects: Project[]; pagination: { limit: number; offset: number; total: number } }>(
      `/projects?limit=${limit}&offset=${offset}`,
      {},
      token
    ),

  get: (token: string, id: string) =>
    fetchApi<{ project: Project; deployments: Deployment[] }>(`/projects/${id}`, {}, token),

  create: (token: string, data: { name: string; description?: string; yamlContent: string; environment?: string; region?: string }) =>
    fetchApi<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }, token),

  update: (token: string, id: string, data: Partial<Project>) =>
    fetchApi<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }, token),

  redeploy: (token: string, id: string) =>
    fetchApi<{ message: string; deployment: Deployment }>(`/projects/${id}/redeploy`, { method: 'POST' }, token),
};

// Deployments API
export const deploymentsApi = {
  list: (token: string, limit = 50) =>
    fetchApi<{ deployments: Deployment[] }>(`/deployments?limit=${limit}`, {}, token),

  get: (token: string, id: string) =>
    fetchApi<{ deployment: Deployment; securityAudit?: any }>(`/deployments/${id}`, {}, token),

  create: (token: string, projectId: string, envVars?: Record<string, string>) =>
    fetchApi<{ deployment: Deployment; message: string; websocketUrl: string }>(
      '/deployments',
      { method: 'POST', body: JSON.stringify({ projectId, envVars }) },
      token
    ),

  getLogs: (token: string, id: string) =>
    fetchApi<{ logs: Array<{ timestamp: string; level: string; message: string }> }>(
      `/deployments/${id}/logs`,
      {},
      token
    ),

  cancel: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/deployments/${id}/cancel`, { method: 'POST' }, token),
};

// YAML API
export const yamlApi = {
  validate: (token: string, content: string) =>
    fetchApi<ValidationResult>('/yaml/validate', { method: 'POST', body: JSON.stringify({ content }) }, token),

  analyze: (token: string, content: string) =>
    fetchApi<AnalysisResult>('/yaml/analyze', { method: 'POST', body: JSON.stringify({ content }) }, token),

  getSample: async (type: 'web-app' | 'api' | 'static' | 'fullstack') => {
    const response = await fetch(`${API_BASE}/yaml/sample/${type}`);
    if (!response.ok) throw new ApiError(response.status, 'Failed to get sample');
    return response.text();
  },

  preview: (token: string, content: string) =>
    fetchApi<{
      name: string;
      description?: string;
      type: string;
      framework: string;
      techStack: string;
      complexity: string;
      features: Array<{ name: string; type: string; description: string }>;
      integrations?: Array<{ name: string; type: string; provider: string }>;
      environmentVariables: string[];
      projectStructure: string[];
      warnings?: string[];
    }>('/yaml/preview', { method: 'POST', body: JSON.stringify({ content }) }, token),
};

// Domains API
export const domainsApi = {
  list: (token: string, projectId?: string) =>
    fetchApi<{ domains: (CustomDomain & { projectName?: string })[] }>(
      `/domains${projectId ? `?projectId=${projectId}` : ''}`,
      {},
      token
    ),

  add: (token: string, projectId: string, domain: string) =>
    fetchApi<{
      domain: CustomDomain;
      dnsConfiguration: { records: any[]; instructions: string[] };
      vercelVerification?: any;
    }>('/domains', { method: 'POST', body: JSON.stringify({ projectId, domain }) }, token),

  verify: (token: string, id: string) =>
    fetchApi<{
      verified: boolean;
      message: string;
      currentConfig?: any;
      requiredConfig?: any;
    }>(`/domains/${id}/verify`, { method: 'POST' }, token),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/domains/${id}`, { method: 'DELETE' }, token),

  getConfig: (token: string, id: string) =>
    fetchApi<{
      domain: string;
      verified: boolean;
      verifiedAt?: string;
      dnsRecords: any[];
      instructions: any;
    }>(`/domains/${id}/config`, {}, token),
};

// MCP API
export const mcpApi = {
  getServers: () =>
    fetchApi<{ servers: MCPServer[] }>('/mcp/servers'),

  getServer: (id: string) =>
    fetchApi<{ server: MCPServer }>(`/mcp/servers/${id}`),

  analyze: (token: string, spec: { type: string; integrations?: any[]; mcp_servers?: string[] }) =>
    fetchApi<{ required: MCPServer[]; recommended: MCPServer[] }>(
      '/mcp/analyze',
      { method: 'POST', body: JSON.stringify(spec) },
      token
    ),

  configure: (token: string, projectId: string, serverId: string, config: Record<string, string>) =>
    fetchApi<{ success: boolean; server: string; configured: boolean }>(
      '/mcp/configure',
      { method: 'POST', body: JSON.stringify({ projectId, serverId, config }) },
      token
    ),

  authorize: (token: string, projectId: string, serverId: string, authCode?: string) =>
    fetchApi<{ success: boolean; message: string }>(
      '/mcp/authorize',
      { method: 'POST', body: JSON.stringify({ projectId, serverId, authCode }) },
      token
    ),

  getSelections: (token: string, projectId: string) =>
    fetchApi<{ selections: any[] }>(`/mcp/selections/${projectId}`, {}, token),

  // API Keys
  getKeys: (token: string) =>
    fetchApi<{ keys: ApiKey[] }>('/mcp/keys', {}, token),

  storeKey: (token: string, keyName: string, keyType: string, value: string) =>
    fetchApi<ApiKey>(
      '/mcp/keys',
      { method: 'POST', body: JSON.stringify({ keyName, keyType, value }) },
      token
    ),

  deleteKey: (token: string, keyName: string) =>
    fetchApi<{ success: boolean }>(`/mcp/keys/${keyName}`, { method: 'DELETE' }, token),

  testKey: (token: string, keyName: string) =>
    fetchApi<{ valid: boolean; message: string }>(
      '/mcp/keys/test',
      { method: 'POST', body: JSON.stringify({ keyName }) },
      token
    ),
};

export { ApiError };
