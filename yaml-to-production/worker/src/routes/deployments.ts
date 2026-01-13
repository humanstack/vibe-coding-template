import { Hono } from 'hono';
import { Env } from '../types/env';
import { DatabaseService } from '../services/database';
import { YamlParserService } from '../services/yaml-parser';
import { CodeGeneratorService } from '../services/code-generator';
import { SecurityAuditorService } from '../services/security-auditor';
import { VercelDeployerService } from '../services/vercel-deployer';
import { requireAuth } from '../middleware/auth';
import { decrypt } from '../utils/encryption';

const deploymentRoutes = new Hono<{ Bindings: Env }>();

// GET /deployments - List user's deployments
deploymentRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const limit = parseInt(c.req.query('limit') || '50');
  const deployments = await db.getDeploymentsByUserId(user.id, limit);

  return c.json({ deployments });
});

// GET /deployments/:id - Get deployment details
deploymentRoutes.get('/:id', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const deploymentId = c.req.param('id');

  const deployment = await db.getDeploymentById(deploymentId);

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  if (deployment.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Get security audit if available
  const securityAudit = await db.getSecurityAuditByDeploymentId(deploymentId);

  return c.json({
    deployment,
    securityAudit
  });
});

// POST /deployments - Create and execute a new deployment
deploymentRoutes.post('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json() as {
    projectId: string;
    envVars?: Record<string, string>;
  };

  if (!body.projectId) {
    return c.json({ error: 'Project ID is required' }, 400);
  }

  // Get the project
  const project = await db.getProjectById(body.projectId);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Create deployment record
  const deployment = await db.createDeployment({
    projectId: body.projectId,
    userId: user.id
  });

  // Update project status
  await db.updateProject(body.projectId, { status: 'processing' });

  // Get Durable Object for real-time progress
  const sessionId = c.env.DEPLOYMENT_SESSION.idFromName(deployment.id);
  const session = c.env.DEPLOYMENT_SESSION.get(sessionId);

  // Initialize the deployment session
  await session.fetch(new Request('https://internal/init', {
    method: 'POST',
    body: JSON.stringify({
      deploymentId: deployment.id,
      userId: user.id,
      projectId: body.projectId
    })
  }));

  // Start the deployment process asynchronously
  c.executionCtx.waitUntil(
    executeDeployment(c.env, db, project, deployment, body.envVars || {}, session)
  );

  return c.json({
    deployment,
    message: 'Deployment initiated',
    websocketUrl: `/api/v1/deployments/${deployment.id}/ws`
  }, 202);
});

// GET /deployments/:id/ws - WebSocket endpoint for real-time updates
deploymentRoutes.get('/:id/ws', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const deploymentId = c.req.param('id');

  const deployment = await db.getDeploymentById(deploymentId);

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  if (deployment.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Forward to Durable Object
  const sessionId = c.env.DEPLOYMENT_SESSION.idFromName(deploymentId);
  const session = c.env.DEPLOYMENT_SESSION.get(sessionId);

  const url = new URL(c.req.url);
  url.searchParams.set('userId', user.id);

  return session.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers
  }));
});

// GET /deployments/:id/logs - Get deployment logs
deploymentRoutes.get('/:id/logs', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const deploymentId = c.req.param('id');

  const deployment = await db.getDeploymentById(deploymentId);

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  if (deployment.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const logs = JSON.parse(deployment.logs || '[]');

  return c.json({ logs });
});

// POST /deployments/:id/cancel - Cancel a deployment
deploymentRoutes.post('/:id/cancel', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const deploymentId = c.req.param('id');

  const deployment = await db.getDeploymentById(deploymentId);

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  if (deployment.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (deployment.status === 'success' || deployment.status === 'failed') {
    return c.json({ error: 'Deployment already completed' }, 400);
  }

  await db.updateDeployment(deploymentId, {
    status: 'failed',
    errorMessage: 'Cancelled by user',
    completedAt: new Date().toISOString()
  });

  return c.json({ message: 'Deployment cancelled' });
});

/**
 * Execute the full deployment pipeline
 */
async function executeDeployment(
  env: Env,
  db: DatabaseService,
  project: any,
  deployment: any,
  envVars: Record<string, string>,
  session: DurableObjectStub
): Promise<void> {
  const updateProgress = async (stage: string, message: string, progress: number) => {
    await session.fetch(new Request('https://internal/progress', {
      method: 'POST',
      body: JSON.stringify({ stage, message, progress })
    }));
    await db.updateDeployment(deployment.id, {
      status: stage as any,
      currentStage: stage,
      progress
    });
  };

  const addLog = async (level: string, message: string) => {
    await session.fetch(new Request('https://internal/log', {
      method: 'POST',
      body: JSON.stringify({ level, message })
    }));
    await db.appendDeploymentLog(deployment.id, {
      timestamp: new Date().toISOString(),
      level,
      message
    });
  };

  try {
    // Step 1: Validate YAML
    await updateProgress('validating', 'Validating YAML specification...', 5);
    await addLog('info', 'Starting YAML validation');

    const parser = new YamlParserService();
    const parseResult = parser.parse(project.yaml_content);

    if (!parseResult.success) {
      throw new Error(`YAML validation failed: ${parseResult.errors?.map(e => e.message).join(', ')}`);
    }

    const yamlSpec = parseResult.data!;
    await addLog('info', `YAML validated successfully: ${yamlSpec.name}`);

    // Step 2: Analyze dependencies
    await updateProgress('validating', 'Analyzing dependencies...', 10);
    const analysis = parser.analyzeDependencies(yamlSpec);
    await addLog('info', `Tech stack detected: ${analysis.detectedTechStack}`);

    // Step 3: Generate code
    await updateProgress('generating', 'Generating code with Claude AI...', 15);
    await addLog('info', 'Starting AI-powered code generation');

    const generator = new CodeGeneratorService(env.ANTHROPIC_API_KEY);
    const generatedCode = await generator.generateCode(
      yamlSpec,
      analysis.suggestedFramework,
      (progress) => {
        updateProgress('generating', progress.message, 15 + (progress.progress * 0.25));
      }
    );

    await addLog('info', `Generated ${generatedCode.files.length} files`);
    await db.updateDeployment(deployment.id, {
      generatedFilesCount: generatedCode.files.length
    });

    // Step 4: Security audit
    await updateProgress('auditing', 'Running security audit...', 45);
    await addLog('info', 'Starting automated security audit');

    const auditor = new SecurityAuditorService();
    const auditResult = auditor.audit(generatedCode.files);

    await addLog('info', `Security score: ${auditResult.score}/100`);
    await addLog(auditResult.passed ? 'info' : 'warn', `Security audit ${auditResult.passed ? 'passed' : 'failed with warnings'}`);

    // Store security audit results
    await db.createSecurityAudit({
      deploymentId: deployment.id,
      projectId: project.id,
      score: auditResult.score,
      passed: auditResult.passed,
      issues: auditResult.issues,
      recommendations: auditResult.recommendations,
      scannedFilesCount: generatedCode.files.length
    });

    await db.updateDeployment(deployment.id, {
      securityScore: auditResult.score
    });

    if (!auditResult.passed) {
      for (const issue of auditResult.issues.filter(i => i.severity === 'critical')) {
        await addLog('error', `Critical: ${issue.description} in ${issue.file || 'unknown'}`);
      }
    }

    // Step 5: Get Vercel token
    await updateProgress('packaging', 'Preparing for deployment...', 55);

    // Try to get Vercel token from user's stored keys
    let vercelToken = env.VERCEL_API_TOKEN;
    const userVercelKey = await db.getUserApiKey(project.user_id, 'vercel');

    if (userVercelKey) {
      try {
        vercelToken = await decrypt(userVercelKey.encrypted_value, userVercelKey.iv, env.ENCRYPTION_KEY);
      } catch {
        await addLog('warn', 'Failed to decrypt user Vercel token, using default');
      }
    }

    if (!vercelToken) {
      throw new Error('No Vercel API token configured');
    }

    // Step 6: Deploy to Vercel
    await updateProgress('uploading', 'Uploading to Vercel...', 60);
    await addLog('info', 'Starting Vercel deployment');

    const deployer = new VercelDeployerService(vercelToken);

    // Merge user-provided env vars with generated ones
    const allEnvVars: Record<string, string> = {};
    for (const envVar of generatedCode.envVars) {
      if (envVars[envVar]) {
        allEnvVars[envVar] = envVars[envVar];
      }
    }

    const deployResult = await deployer.deploy(
      {
        projectName: project.name,
        files: generatedCode.files,
        envVars: allEnvVars,
        framework: analysis.suggestedFramework === 'nextjs' ? 'nextjs' : 'vite'
      },
      (stage, message, progress) => {
        updateProgress(stage === 'building' ? 'building' : 'deploying', message, 60 + (progress * 0.35));
      }
    );

    if (!deployResult.success) {
      throw new Error(deployResult.error || 'Vercel deployment failed');
    }

    await addLog('info', `Deployment successful: ${deployResult.url}`);

    // Step 7: Update project and deployment records
    await updateProgress('complete', 'Deployment complete!', 100);

    await db.updateProject(project.id, {
      status: 'deployed',
      vercel_project_id: deployResult.projectId,
      vercel_deployment_id: deployResult.deploymentId,
      production_url: deployResult.url,
      preview_url: deployResult.previewUrl,
      security_score: auditResult.score
    });

    await db.updateDeployment(deployment.id, {
      status: 'success',
      vercelDeploymentId: deployResult.deploymentId,
      vercelDeploymentUrl: deployResult.url,
      completedAt: new Date().toISOString()
    });

    // Notify completion
    await session.fetch(new Request('https://internal/complete', {
      method: 'POST',
      body: JSON.stringify({
        url: deployResult.url,
        previewUrl: deployResult.previewUrl
      })
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await addLog('error', `Deployment failed: ${errorMessage}`);

    await db.updateDeployment(deployment.id, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString()
    });

    await db.updateProject(project.id, {
      status: 'failed'
    });

    await session.fetch(new Request('https://internal/error', {
      method: 'POST',
      body: JSON.stringify({ message: errorMessage })
    }));
  }
}

export { deploymentRoutes };
