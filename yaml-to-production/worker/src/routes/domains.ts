import { Hono } from 'hono';
import { Env } from '../types/env';
import { DatabaseService } from '../services/database';
import { VercelDeployerService } from '../services/vercel-deployer';
import { requireAuth } from '../middleware/auth';
import { decrypt } from '../utils/encryption';
import { z } from 'zod';

const domainRoutes = new Hono<{ Bindings: Env }>();

const AddDomainSchema = z.object({
  projectId: z.string().min(1),
  domain: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/, 'Invalid domain format')
});

// GET /domains - List user's custom domains
domainRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const projectId = c.req.query('projectId');

  if (projectId) {
    // Get domains for specific project
    const project = await db.getProjectById(projectId);
    if (!project || project.user_id !== user.id) {
      return c.json({ error: 'Project not found' }, 404);
    }
    const domains = await db.getCustomDomainsByProjectId(projectId);
    return c.json({ domains });
  }

  // Get all domains for user's projects
  const projects = await db.getProjectsByUserId(user.id);
  const allDomains = [];

  for (const project of projects) {
    const domains = await db.getCustomDomainsByProjectId(project.id);
    allDomains.push(...domains.map(d => ({ ...d, projectName: project.name })));
  }

  return c.json({ domains: allDomains });
});

// POST /domains - Add a custom domain
domainRoutes.post('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json();
  const validation = AddDomainSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'Validation error',
      details: validation.error.errors
    }, 400);
  }

  const { projectId, domain } = validation.data;

  // Check project ownership
  const project = await db.getProjectById(projectId);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (!project.vercel_project_id) {
    return c.json({ error: 'Project must be deployed before adding custom domains' }, 400);
  }

  // Get Vercel token
  let vercelToken = c.env.VERCEL_API_TOKEN;
  const userVercelKey = await db.getUserApiKey(user.id, 'vercel');

  if (userVercelKey) {
    try {
      vercelToken = await decrypt(userVercelKey.encrypted_value, userVercelKey.iv, c.env.ENCRYPTION_KEY);
    } catch {
      // Use default token
    }
  }

  if (!vercelToken) {
    return c.json({ error: 'No Vercel API token configured' }, 400);
  }

  // Add domain to Vercel
  const deployer = new VercelDeployerService(vercelToken);

  try {
    const vercelDomain = await deployer.addDomain(project.vercel_project_id, domain);

    // Create domain record in database
    const customDomain = await db.createCustomDomain({
      projectId,
      userId: user.id,
      domain
    });

    return c.json({
      domain: customDomain,
      dnsConfiguration: {
        records: JSON.parse(customDomain.dns_records),
        instructions: [
          'Add the following DNS records at your domain provider:',
          `1. CNAME record: ${domain} → cname.vercel-dns.com`,
          `2. TXT record: _vercel.${domain} → ${customDomain.verification_token}`,
          'DNS propagation may take up to 48 hours.'
        ]
      },
      vercelVerification: vercelDomain.verification
    }, 201);
  } catch (error) {
    return c.json({
      error: 'Failed to add domain',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// POST /domains/:id/verify - Verify domain DNS configuration
domainRoutes.post('/:id/verify', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const domainId = c.req.param('id');

  const customDomain = await db.getCustomDomainById(domainId);

  if (!customDomain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  if (customDomain.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Get project for Vercel project ID
  const project = await db.getProjectById(customDomain.project_id);
  if (!project?.vercel_project_id) {
    return c.json({ error: 'Project not found or not deployed' }, 400);
  }

  // Get Vercel token
  let vercelToken = c.env.VERCEL_API_TOKEN;
  const userVercelKey = await db.getUserApiKey(user.id, 'vercel');

  if (userVercelKey) {
    try {
      vercelToken = await decrypt(userVercelKey.encrypted_value, userVercelKey.iv, c.env.ENCRYPTION_KEY);
    } catch {
      // Use default token
    }
  }

  if (!vercelToken) {
    return c.json({ error: 'No Vercel API token configured' }, 400);
  }

  const deployer = new VercelDeployerService(vercelToken);

  try {
    const verified = await deployer.verifyDomain(project.vercel_project_id, customDomain.domain);

    if (verified) {
      await db.updateCustomDomain(domainId, {
        verified: true,
        verifiedAt: new Date().toISOString()
      });

      return c.json({
        verified: true,
        message: 'Domain verified successfully!'
      });
    }

    // Get domain config for more details
    try {
      const config = await deployer.getDomainConfig(customDomain.domain);
      return c.json({
        verified: false,
        message: 'DNS not configured correctly',
        currentConfig: {
          nameservers: config.nameservers,
          cnames: config.cnames,
          aValues: config.aValues,
          conflicts: config.conflicts,
          misconfigured: config.misconfigured
        },
        requiredConfig: JSON.parse(customDomain.dns_records)
      });
    } catch {
      return c.json({
        verified: false,
        message: 'DNS verification pending. Please ensure DNS records are configured correctly.',
        requiredConfig: JSON.parse(customDomain.dns_records)
      });
    }
  } catch (error) {
    return c.json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /domains/:id - Remove a custom domain
domainRoutes.delete('/:id', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const domainId = c.req.param('id');

  const customDomain = await db.getCustomDomainById(domainId);

  if (!customDomain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  if (customDomain.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Get project for Vercel project ID
  const project = await db.getProjectById(customDomain.project_id);

  if (project?.vercel_project_id) {
    // Get Vercel token
    let vercelToken = c.env.VERCEL_API_TOKEN;
    const userVercelKey = await db.getUserApiKey(user.id, 'vercel');

    if (userVercelKey) {
      try {
        vercelToken = await decrypt(userVercelKey.encrypted_value, userVercelKey.iv, c.env.ENCRYPTION_KEY);
      } catch {
        // Use default token
      }
    }

    if (vercelToken) {
      const deployer = new VercelDeployerService(vercelToken);
      try {
        await deployer.removeDomain(project.vercel_project_id, customDomain.domain);
      } catch {
        // Continue even if Vercel removal fails
      }
    }
  }

  // Delete from database
  await db.deleteCustomDomain(domainId, user.id);

  return c.json({ success: true });
});

// GET /domains/:id/config - Get DNS configuration instructions
domainRoutes.get('/:id/config', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const domainId = c.req.param('id');

  const customDomain = await db.getCustomDomainById(domainId);

  if (!customDomain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  if (customDomain.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const dnsRecords = JSON.parse(customDomain.dns_records);

  return c.json({
    domain: customDomain.domain,
    verified: customDomain.verified === 1,
    verifiedAt: customDomain.verified_at,
    dnsRecords,
    instructions: {
      title: 'DNS Configuration',
      steps: [
        {
          step: 1,
          action: 'Log in to your domain registrar or DNS provider',
          details: 'Common providers: GoDaddy, Namecheap, Cloudflare, Route53'
        },
        {
          step: 2,
          action: 'Add a CNAME record',
          details: `Name: ${customDomain.domain.split('.')[0] === customDomain.domain ? '@' : customDomain.domain.split('.')[0]}, Value: cname.vercel-dns.com`
        },
        {
          step: 3,
          action: 'Add a TXT record for verification',
          details: `Name: _vercel, Value: ${customDomain.verification_token}`
        },
        {
          step: 4,
          action: 'Wait for DNS propagation',
          details: 'This can take up to 48 hours, but usually completes within a few minutes'
        },
        {
          step: 5,
          action: 'Click "Verify DNS" to check configuration',
          details: 'We\'ll automatically detect when your DNS is properly configured'
        }
      ],
      tips: [
        'If using Cloudflare, make sure to set the proxy status to "DNS only" (gray cloud)',
        'Some providers require you to remove the domain suffix from the record name',
        'If verification fails, double-check for typos in the DNS records'
      ]
    }
  });
});

export { domainRoutes };
