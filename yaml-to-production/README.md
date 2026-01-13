# YAML-to-Production Microservice

Transform YAML specifications into production-ready applications instantly. This microservice eliminates technical gatekeeping and human error in the software deployment pipeline by providing a simple, actionable, and secure path from a YAML-defined idea to a live, deployed application.

## Features

- **YAML Specification Input**: Upload or paste YAML specifications defining your application
- **AI-Powered Code Generation**: Claude AI analyzes requirements and generates production-ready code
- **Automated Security Auditing**: Every deployment is scanned for vulnerabilities with a security score
- **One-Click Deployment**: Deploy to Vercel with automatic SSL, global CDN, and instant rollbacks
- **Custom Domain Management**: Add, verify, and manage custom domains for your applications
- **Project Dashboard**: Manage and redeploy projects with saved configurations

## Architecture

```
yaml-to-production/
├── worker/                    # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts          # Main entry point (Hono app)
│   │   ├── middleware/       # Auth middleware (Privy JWT)
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Core services
│   │   │   ├── database.ts   # D1 database operations
│   │   │   ├── yaml-parser.ts    # YAML validation
│   │   │   ├── code-generator.ts # Claude AI integration
│   │   │   ├── security-auditor.ts # Security scanning
│   │   │   ├── vercel-deployer.ts  # Vercel API
│   │   │   └── deployment-session.ts # Durable Object
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Encryption utilities
│   ├── migrations/           # D1 database migrations
│   ├── wrangler.toml         # Cloudflare configuration
│   └── package.json
│
└── frontend/                  # React + Vite frontend
    ├── src/
    │   ├── components/       # React components
    │   │   ├── ui/           # Shared UI components
    │   │   ├── deploy/       # Deployment wizard components
    │   │   └── dashboard/    # Dashboard components
    │   ├── pages/            # Page components
    │   ├── services/         # API client
    │   ├── hooks/            # Custom React hooks
    │   ├── stores/           # Zustand state management
    │   └── types/            # TypeScript types
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

## Tech Stack

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers with Durable Objects
- **Framework**: Hono (fast, lightweight web framework)
- **Database**: D1 (SQLite at the edge)
- **Storage**: R2 (object storage for generated files)
- **Caching**: KV (key-value storage)
- **AI**: Anthropic Claude API

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Auth**: Privy (passwordless + crypto wallets)
- **UI**: Lucide icons, Sonner toasts, Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account
- Vercel account
- Anthropic API key
- Privy account

### Backend Setup

```bash
cd yaml-to-production/worker

# Install dependencies
npm install

# Create D1 database
wrangler d1 create yaml-to-production-db

# Update wrangler.toml with your database ID

# Run migrations
wrangler d1 execute yaml-to-production-db --file=./migrations/0001_schema.sql

# Create KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create SECRETS

# Create R2 bucket
wrangler r2 bucket create yaml-to-production-projects

# Set secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put VERCEL_API_TOKEN
wrangler secret put PRIVY_APP_ID
wrangler secret put PRIVY_APP_SECRET
wrangler secret put ENCRYPTION_KEY

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd yaml-to-production/frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Privy App ID
# VITE_PRIVY_APP_ID=your-privy-app-id

# Start development server
npm run dev
```

### Environment Variables

#### Worker (Cloudflare Secrets)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `VERCEL_API_TOKEN` - Default Vercel API token
- `PRIVY_APP_ID` - Privy application ID
- `PRIVY_APP_SECRET` - Privy application secret
- `ENCRYPTION_KEY` - 256-bit hex key for encrypting user secrets

#### Frontend
- `VITE_PRIVY_APP_ID` - Privy application ID

## API Endpoints

### Projects
- `GET /api/v1/projects` - List user projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects` - Create a new project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `POST /api/v1/projects/:id/redeploy` - Trigger redeployment

### Deployments
- `GET /api/v1/deployments` - List deployments
- `GET /api/v1/deployments/:id` - Get deployment details
- `POST /api/v1/deployments` - Create deployment
- `GET /api/v1/deployments/:id/ws` - WebSocket for real-time updates
- `POST /api/v1/deployments/:id/cancel` - Cancel deployment

### YAML
- `POST /api/v1/yaml/validate` - Validate YAML syntax
- `POST /api/v1/yaml/analyze` - Analyze YAML for dependencies
- `GET /api/v1/yaml/sample/:type` - Get sample YAML
- `POST /api/v1/yaml/preview` - Preview project structure

### Domains
- `GET /api/v1/domains` - List custom domains
- `POST /api/v1/domains` - Add custom domain
- `POST /api/v1/domains/:id/verify` - Verify DNS
- `DELETE /api/v1/domains/:id` - Remove domain

### MCP Servers
- `GET /api/v1/mcp/servers` - List available MCP servers
- `POST /api/v1/mcp/configure` - Configure MCP server
- `GET /api/v1/mcp/keys` - List stored API keys
- `POST /api/v1/mcp/keys` - Store API key

## YAML Specification Format

```yaml
name: my-app
description: A sample application
version: 1.0.0
type: web-app  # web-app, api, static, fullstack

framework: react-vite  # react-vite, nextjs, cloudflare-workers, static

features:
  - name: Landing Page
    type: page
    description: Hero section with call-to-action

  - name: Dashboard
    type: page
    description: User analytics dashboard

  - name: Navigation
    type: component
    description: Header navigation bar

integrations:
  - name: Authentication
    type: auth
    provider: privy

  - name: Database
    type: database
    provider: supabase

  - name: Payments
    type: payment
    provider: stripe

environment:
  VITE_APP_NAME: My App

mcp_servers:
  - github
  - supabase
```

## Deployment

### Deploy Worker to Cloudflare
```bash
cd worker
npm run deploy:production
```

### Deploy Frontend
The frontend can be deployed to any static hosting:

```bash
cd frontend
npm run build
# Deploy the dist/ folder to Vercel, Netlify, or Cloudflare Pages
```

## Security

- All API keys are encrypted with AES-256-GCM before storage
- Privy JWT tokens are verified on every request
- Row-level security enforced at the database level
- Automated security scanning before every deployment
- No secrets are ever logged or exposed in errors

## License

MIT
