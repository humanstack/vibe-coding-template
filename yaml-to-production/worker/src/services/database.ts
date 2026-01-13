import { Env, Project, Deployment, CustomDomain, UserApiKey } from '../types/env';
import { nanoid } from 'nanoid';

export class DatabaseService {
  constructor(private db: D1Database) {}

  // Project operations
  async createProject(data: {
    userId: string;
    name: string;
    description?: string;
    yamlContent: string;
    parsedConfig?: Record<string, unknown>;
    techStack?: string;
    environment?: string;
    region?: string;
  }): Promise<Project> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO projects (id, user_id, name, description, yaml_content, parsed_config, tech_stack, environment, region, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.userId,
      data.name,
      data.description || null,
      data.yamlContent,
      data.parsedConfig ? JSON.stringify(data.parsedConfig) : null,
      data.techStack || null,
      data.environment || 'development',
      data.region || 'iad1',
      now,
      now
    ).run();

    return this.getProjectById(id) as Promise<Project>;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();
    return result || null;
  }

  async getProjectsByUserId(userId: string, limit = 50, offset = 0): Promise<Project[]> {
    const results = await this.db.prepare(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(userId, limit, offset).all<Project>();
    return results.results || [];
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const allowedFields = ['name', 'description', 'yaml_content', 'parsed_config', 'tech_stack', 'status',
      'security_score', 'vercel_project_id', 'vercel_deployment_id', 'production_url', 'preview_url',
      'environment', 'region'];

    for (const [key, value] of Object.entries(data)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        updates.push(`${snakeKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) return this.getProjectById(id);

    values.push(id);
    await this.db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return this.getProjectById(id);
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(id, userId).run();
    return result.meta.changes > 0;
  }

  // Deployment operations
  async createDeployment(data: {
    projectId: string;
    userId: string;
  }): Promise<Deployment> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO deployments (id, project_id, user_id, status, started_at, logs)
      VALUES (?, ?, ?, 'pending', ?, '[]')
    `).bind(id, data.projectId, data.userId, now).run();

    return this.getDeploymentById(id) as Promise<Deployment>;
  }

  async getDeploymentById(id: string): Promise<Deployment | null> {
    const result = await this.db.prepare('SELECT * FROM deployments WHERE id = ?').bind(id).first<Deployment>();
    return result || null;
  }

  async getDeploymentsByProjectId(projectId: string, limit = 20): Promise<Deployment[]> {
    const results = await this.db.prepare(
      'SELECT * FROM deployments WHERE project_id = ? ORDER BY started_at DESC LIMIT ?'
    ).bind(projectId, limit).all<Deployment>();
    return results.results || [];
  }

  async getDeploymentsByUserId(userId: string, limit = 50): Promise<Deployment[]> {
    const results = await this.db.prepare(
      'SELECT * FROM deployments WHERE user_id = ? ORDER BY started_at DESC LIMIT ?'
    ).bind(userId, limit).all<Deployment>();
    return results.results || [];
  }

  async updateDeployment(id: string, data: {
    status?: string;
    vercelDeploymentId?: string;
    vercelDeploymentUrl?: string;
    progress?: number;
    currentStage?: string;
    completedAt?: string;
    errorMessage?: string;
    generatedFilesCount?: number;
    securityScore?: number;
  }): Promise<Deployment | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.vercelDeploymentId !== undefined) { updates.push('vercel_deployment_id = ?'); values.push(data.vercelDeploymentId); }
    if (data.vercelDeploymentUrl !== undefined) { updates.push('vercel_deployment_url = ?'); values.push(data.vercelDeploymentUrl); }
    if (data.progress !== undefined) { updates.push('progress = ?'); values.push(data.progress); }
    if (data.currentStage !== undefined) { updates.push('current_stage = ?'); values.push(data.currentStage); }
    if (data.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(data.completedAt); }
    if (data.errorMessage !== undefined) { updates.push('error_message = ?'); values.push(data.errorMessage); }
    if (data.generatedFilesCount !== undefined) { updates.push('generated_files_count = ?'); values.push(data.generatedFilesCount); }
    if (data.securityScore !== undefined) { updates.push('security_score = ?'); values.push(data.securityScore); }

    if (updates.length === 0) return this.getDeploymentById(id);

    values.push(id);
    await this.db.prepare(`UPDATE deployments SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return this.getDeploymentById(id);
  }

  async appendDeploymentLog(id: string, logEntry: { timestamp: string; level: string; message: string }): Promise<void> {
    const deployment = await this.getDeploymentById(id);
    if (!deployment) return;

    const logs = JSON.parse(deployment.logs || '[]');
    logs.push(logEntry);

    await this.db.prepare('UPDATE deployments SET logs = ? WHERE id = ?').bind(JSON.stringify(logs), id).run();
  }

  // Custom domain operations
  async createCustomDomain(data: {
    projectId: string;
    userId: string;
    domain: string;
  }): Promise<CustomDomain> {
    const id = nanoid();
    const verificationToken = nanoid(32);
    const now = new Date().toISOString();

    const dnsRecords = JSON.stringify([
      { type: 'CNAME', name: data.domain, value: 'cname.vercel-dns.com' },
      { type: 'TXT', name: `_vercel.${data.domain}`, value: verificationToken }
    ]);

    await this.db.prepare(`
      INSERT INTO custom_domains (id, project_id, user_id, domain, verification_token, dns_records, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, data.projectId, data.userId, data.domain, verificationToken, dnsRecords, now).run();

    return this.getCustomDomainById(id) as Promise<CustomDomain>;
  }

  async getCustomDomainById(id: string): Promise<CustomDomain | null> {
    const result = await this.db.prepare('SELECT * FROM custom_domains WHERE id = ?').bind(id).first<CustomDomain>();
    return result || null;
  }

  async getCustomDomainsByProjectId(projectId: string): Promise<CustomDomain[]> {
    const results = await this.db.prepare(
      'SELECT * FROM custom_domains WHERE project_id = ? ORDER BY created_at DESC'
    ).bind(projectId).all<CustomDomain>();
    return results.results || [];
  }

  async updateCustomDomain(id: string, data: { verified?: boolean; verifiedAt?: string }): Promise<CustomDomain | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.verified !== undefined) { updates.push('verified = ?'); values.push(data.verified ? 1 : 0); }
    if (data.verifiedAt !== undefined) { updates.push('verified_at = ?'); values.push(data.verifiedAt); }

    if (updates.length === 0) return this.getCustomDomainById(id);

    values.push(id);
    await this.db.prepare(`UPDATE custom_domains SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return this.getCustomDomainById(id);
  }

  async deleteCustomDomain(id: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM custom_domains WHERE id = ? AND user_id = ?').bind(id, userId).run();
    return result.meta.changes > 0;
  }

  // User API keys operations (encrypted)
  async createUserApiKey(data: {
    userId: string;
    keyName: string;
    keyType: string;
    encryptedValue: string;
    iv: string;
  }): Promise<UserApiKey> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO user_api_keys (id, user_id, key_name, key_type, encrypted_value, iv, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, key_name) DO UPDATE SET
        encrypted_value = excluded.encrypted_value,
        iv = excluded.iv,
        updated_at = excluded.updated_at
    `).bind(id, data.userId, data.keyName, data.keyType, data.encryptedValue, data.iv, now, now).run();

    const result = await this.db.prepare(
      'SELECT * FROM user_api_keys WHERE user_id = ? AND key_name = ?'
    ).bind(data.userId, data.keyName).first<UserApiKey>();
    return result!;
  }

  async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    const results = await this.db.prepare(
      'SELECT * FROM user_api_keys WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<UserApiKey>();
    return results.results || [];
  }

  async getUserApiKey(userId: string, keyName: string): Promise<UserApiKey | null> {
    const result = await this.db.prepare(
      'SELECT * FROM user_api_keys WHERE user_id = ? AND key_name = ?'
    ).bind(userId, keyName).first<UserApiKey>();
    return result || null;
  }

  async deleteUserApiKey(userId: string, keyName: string): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM user_api_keys WHERE user_id = ? AND key_name = ?'
    ).bind(userId, keyName).run();
    return result.meta.changes > 0;
  }

  // Security audit operations
  async createSecurityAudit(data: {
    deploymentId: string;
    projectId: string;
    score: number;
    passed: boolean;
    issues: unknown[];
    recommendations: string[];
    scannedFilesCount: number;
  }): Promise<void> {
    const id = nanoid();
    const now = new Date().toISOString();

    const criticalCount = data.issues.filter((i: any) => i.severity === 'critical').length;
    const highCount = data.issues.filter((i: any) => i.severity === 'high').length;
    const mediumCount = data.issues.filter((i: any) => i.severity === 'medium').length;
    const lowCount = data.issues.filter((i: any) => i.severity === 'low').length;

    await this.db.prepare(`
      INSERT INTO security_audits (id, deployment_id, project_id, score, passed, issues, recommendations,
        scanned_files_count, critical_count, high_count, medium_count, low_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.deploymentId, data.projectId, data.score, data.passed ? 1 : 0,
      JSON.stringify(data.issues), JSON.stringify(data.recommendations),
      data.scannedFilesCount, criticalCount, highCount, mediumCount, lowCount, now
    ).run();
  }

  async getSecurityAuditByDeploymentId(deploymentId: string): Promise<any | null> {
    const result = await this.db.prepare(
      'SELECT * FROM security_audits WHERE deployment_id = ?'
    ).bind(deploymentId).first();
    return result || null;
  }

  // MCP server operations
  async getMCPServers(): Promise<any[]> {
    const results = await this.db.prepare(
      'SELECT * FROM mcp_server_configs WHERE enabled = 1 ORDER BY required DESC, name ASC'
    ).all();
    return results.results || [];
  }

  async getMCPServerById(id: string): Promise<any | null> {
    const result = await this.db.prepare('SELECT * FROM mcp_server_configs WHERE id = ?').bind(id).first();
    return result || null;
  }

  async createUserMCPSelection(data: {
    userId: string;
    projectId: string;
    mcpServerId: string;
    config?: Record<string, unknown>;
  }): Promise<void> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO user_mcp_selections (id, user_id, project_id, mcp_server_id, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, project_id, mcp_server_id) DO UPDATE SET
        config = excluded.config
    `).bind(id, data.userId, data.projectId, data.mcpServerId, data.config ? JSON.stringify(data.config) : null, now).run();
  }

  async getUserMCPSelections(userId: string, projectId: string): Promise<any[]> {
    const results = await this.db.prepare(`
      SELECT ums.*, msc.name, msc.display_name, msc.description, msc.category, msc.required
      FROM user_mcp_selections ums
      JOIN mcp_server_configs msc ON ums.mcp_server_id = msc.id
      WHERE ums.user_id = ? AND ums.project_id = ?
    `).bind(userId, projectId).all();
    return results.results || [];
  }

  async updateUserMCPSelection(userId: string, projectId: string, mcpServerId: string, authorized: boolean): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE user_mcp_selections SET authorized = ?, authorized_at = ?
      WHERE user_id = ? AND project_id = ? AND mcp_server_id = ?
    `).bind(authorized ? 1 : 0, authorized ? now : null, userId, projectId, mcpServerId).run();
  }
}
