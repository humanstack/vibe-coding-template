-- YAML-to-Production D1 Database Schema
-- Version: 1.0.0

-- Projects table: stores user projects and their configurations
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    yaml_content TEXT NOT NULL,
    parsed_config TEXT, -- JSON stringified parsed YAML
    tech_stack TEXT, -- detected/selected technology stack
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'deployed', 'failed')),
    security_score INTEGER,
    vercel_project_id TEXT,
    vercel_deployment_id TEXT,
    production_url TEXT,
    preview_url TEXT,
    environment TEXT DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
    region TEXT DEFAULT 'iad1',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for faster user project lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Deployments table: tracks deployment history
CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'generating', 'auditing', 'packaging', 'uploading', 'building', 'deploying', 'success', 'failed')),
    vercel_deployment_id TEXT,
    vercel_deployment_url TEXT,
    logs TEXT, -- JSON array of log entries
    progress INTEGER DEFAULT 0, -- 0-100
    current_stage TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    error_message TEXT,
    generated_files_count INTEGER DEFAULT 0,
    security_score INTEGER
);

-- Indexes for deployment queries
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON deployments(started_at DESC);

-- Custom domains table
CREATE TABLE IF NOT EXISTS custom_domains (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    verified INTEGER DEFAULT 0, -- 0 = false, 1 = true
    dns_records TEXT, -- JSON array of required DNS records
    verification_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    verified_at TEXT
);

-- Indexes for domain lookups
CREATE INDEX IF NOT EXISTS idx_custom_domains_project_id ON custom_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);

-- User API keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_type TEXT NOT NULL CHECK (key_type IN ('openai', 'anthropic', 'vercel', 'stripe', 'database', 'custom')),
    encrypted_value TEXT NOT NULL, -- AES-256-GCM encrypted
    iv TEXT NOT NULL, -- Initialization vector for decryption
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, key_name)
);

-- Index for user API key lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- MCP server configurations table
CREATE TABLE IF NOT EXISTS mcp_server_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('ai', 'database', 'storage', 'auth', 'payment', 'email', 'analytics', 'other')),
    required INTEGER DEFAULT 0, -- 0 = optional, 1 = required
    config_schema TEXT, -- JSON schema for configuration
    oauth_url TEXT, -- OAuth authorization URL if applicable
    documentation_url TEXT,
    icon_url TEXT,
    enabled INTEGER DEFAULT 1, -- 0 = disabled, 1 = enabled
    created_at TEXT DEFAULT (datetime('now'))
);

-- User MCP server selections
CREATE TABLE IF NOT EXISTS user_mcp_selections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mcp_server_id TEXT NOT NULL REFERENCES mcp_server_configs(id),
    config TEXT, -- JSON configuration for this server
    authorized INTEGER DEFAULT 0, -- 0 = pending, 1 = authorized
    authorized_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, project_id, mcp_server_id)
);

-- Indexes for MCP selections
CREATE INDEX IF NOT EXISTS idx_user_mcp_selections_user_id ON user_mcp_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mcp_selections_project_id ON user_mcp_selections(project_id);

-- Security audit results table
CREATE TABLE IF NOT EXISTS security_audits (
    id TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- 0-100
    passed INTEGER NOT NULL, -- 0 = failed, 1 = passed
    issues TEXT, -- JSON array of security issues
    recommendations TEXT, -- JSON array of recommendations
    scanned_files_count INTEGER,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for security audit lookups
CREATE INDEX IF NOT EXISTS idx_security_audits_deployment_id ON security_audits(deployment_id);
CREATE INDEX IF NOT EXISTS idx_security_audits_project_id ON security_audits(project_id);

-- Generated files storage metadata (actual files in R2)
CREATE TABLE IF NOT EXISTS generated_files (
    id TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('source', 'config', 'style', 'asset', 'other')),
    r2_key TEXT NOT NULL, -- Key in R2 bucket
    size_bytes INTEGER,
    content_hash TEXT, -- SHA-256 hash
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for generated file lookups
CREATE INDEX IF NOT EXISTS idx_generated_files_deployment_id ON generated_files(deployment_id);

-- Insert default MCP server configurations
INSERT OR IGNORE INTO mcp_server_configs (id, name, display_name, description, category, required, config_schema, documentation_url) VALUES
    ('mcp-claude', 'claude', 'Claude AI', 'Anthropic Claude for AI-powered code generation and analysis', 'ai', 1, '{"type":"object","properties":{"apiKey":{"type":"string","description":"Anthropic API key"}}}', 'https://docs.anthropic.com'),
    ('mcp-filesystem', 'filesystem', 'File System', 'Local file system access for project management', 'storage', 1, '{"type":"object","properties":{}}', 'https://modelcontextprotocol.io'),
    ('mcp-github', 'github', 'GitHub', 'GitHub integration for repository management', 'storage', 0, '{"type":"object","properties":{"token":{"type":"string","description":"GitHub personal access token"}}}', 'https://github.com'),
    ('mcp-supabase', 'supabase', 'Supabase', 'Supabase database and authentication integration', 'database', 0, '{"type":"object","properties":{"url":{"type":"string"},"anonKey":{"type":"string"},"serviceKey":{"type":"string"}}}', 'https://supabase.com/docs'),
    ('mcp-stripe', 'stripe', 'Stripe', 'Stripe payment processing integration', 'payment', 0, '{"type":"object","properties":{"secretKey":{"type":"string"},"webhookSecret":{"type":"string"}}}', 'https://stripe.com/docs'),
    ('mcp-resend', 'resend', 'Resend', 'Resend email service integration', 'email', 0, '{"type":"object","properties":{"apiKey":{"type":"string"}}}', 'https://resend.com/docs'),
    ('mcp-vercel', 'vercel', 'Vercel', 'Vercel deployment platform integration', 'storage', 1, '{"type":"object","properties":{"token":{"type":"string","description":"Vercel API token"}}}', 'https://vercel.com/docs');

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
    AFTER UPDATE ON projects
    FOR EACH ROW
BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_api_keys_timestamp
    AFTER UPDATE ON user_api_keys
    FOR EACH ROW
BEGIN
    UPDATE user_api_keys SET updated_at = datetime('now') WHERE id = OLD.id;
END;
