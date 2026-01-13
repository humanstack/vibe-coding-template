import { Hono } from 'hono';
import { Env } from '../types/env';
import { DatabaseService } from '../services/database';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const projectRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  yamlContent: z.string().min(1),
  techStack: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  region: z.string().optional()
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  yamlContent: z.string().optional(),
  techStack: z.string().optional(),
  status: z.enum(['draft', 'processing', 'deployed', 'failed']).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  region: z.string().optional()
});

// GET /projects - List user's projects
projectRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const projects = await db.getProjectsByUserId(user.id, limit, offset);

  return c.json({
    projects,
    pagination: {
      limit,
      offset,
      total: projects.length
    }
  });
});

// GET /projects/:id - Get a specific project
projectRoutes.get('/:id', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('id');

  const project = await db.getProjectById(projectId);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Get deployments for this project
  const deployments = await db.getDeploymentsByProjectId(projectId, 10);

  return c.json({
    project,
    deployments
  });
});

// POST /projects - Create a new project
projectRoutes.post('/', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);

  const body = await c.req.json();
  const validation = CreateProjectSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'Validation error',
      details: validation.error.errors
    }, 400);
  }

  const project = await db.createProject({
    userId: user.id,
    ...validation.data
  });

  return c.json({ project }, 201);
});

// PATCH /projects/:id - Update a project
projectRoutes.patch('/:id', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('id');

  const existingProject = await db.getProjectById(projectId);

  if (!existingProject) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (existingProject.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json();
  const validation = UpdateProjectSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'Validation error',
      details: validation.error.errors
    }, 400);
  }

  const project = await db.updateProject(projectId, validation.data);

  return c.json({ project });
});

// DELETE /projects/:id - Delete a project
projectRoutes.delete('/:id', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('id');

  const deleted = await db.deleteProject(projectId, user.id);

  if (!deleted) {
    return c.json({ error: 'Project not found or already deleted' }, 404);
  }

  return c.json({ success: true });
});

// GET /projects/:id/deployments - Get project deployments
projectRoutes.get('/:id/deployments', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('id');

  const project = await db.getProjectById(projectId);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const limit = parseInt(c.req.query('limit') || '20');
  const deployments = await db.getDeploymentsByProjectId(projectId, limit);

  return c.json({ deployments });
});

// POST /projects/:id/redeploy - Trigger a redeployment
projectRoutes.post('/:id/redeploy', async (c) => {
  const user = requireAuth(c);
  const db = new DatabaseService(c.env.DB);
  const projectId = c.req.param('id');

  const project = await db.getProjectById(projectId);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Create a new deployment
  const deployment = await db.createDeployment({
    projectId,
    userId: user.id
  });

  // Update project status
  await db.updateProject(projectId, { status: 'processing' });

  return c.json({
    message: 'Redeployment initiated',
    deployment
  }, 202);
});

export { projectRoutes };
