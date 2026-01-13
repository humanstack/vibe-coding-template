import { GeneratedCode, GeneratedFile } from '../types/env';

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  link?: {
    type: string;
    repo: string;
  };
}

export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  creator: {
    uid: string;
    username: string;
  };
  inspectorUrl?: string;
  meta?: Record<string, string>;
}

export interface DeploymentOptions {
  projectName: string;
  files: GeneratedFile[];
  envVars?: Record<string, string>;
  framework?: 'vite' | 'nextjs' | 'static';
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
}

export interface DeploymentResult {
  success: boolean;
  projectId?: string;
  deploymentId?: string;
  url?: string;
  previewUrl?: string;
  error?: string;
}

export type DeploymentProgressCallback = (stage: string, message: string, progress: number) => void;

export class VercelDeployerService {
  private readonly baseUrl = 'https://api.vercel.com';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Deploy generated code to Vercel
   */
  async deploy(
    options: DeploymentOptions,
    onProgress?: DeploymentProgressCallback
  ): Promise<DeploymentResult> {
    try {
      // Step 1: Create or get project
      onProgress?.('creating_project', 'Creating Vercel project...', 10);
      const project = await this.createOrGetProject(options.projectName);

      // Step 2: Prepare files for upload
      onProgress?.('preparing_files', 'Preparing files for upload...', 20);
      const preparedFiles = await this.prepareFiles(options.files);

      // Step 3: Create deployment
      onProgress?.('creating_deployment', 'Creating deployment...', 30);
      const deployment = await this.createDeployment(project.id, {
        files: preparedFiles,
        projectSettings: {
          framework: options.framework || 'vite',
          buildCommand: options.buildCommand,
          outputDirectory: options.outputDirectory || 'dist',
          installCommand: options.installCommand || 'npm install'
        }
      });

      // Step 4: Set environment variables if provided
      if (options.envVars && Object.keys(options.envVars).length > 0) {
        onProgress?.('setting_env', 'Configuring environment variables...', 40);
        await this.setEnvironmentVariables(project.id, options.envVars);
      }

      // Step 5: Wait for deployment to complete
      onProgress?.('building', 'Building application...', 50);
      const finalDeployment = await this.waitForDeployment(deployment.id, (state, progress) => {
        onProgress?.('building', `Build status: ${state}`, 50 + progress * 0.4);
      });

      if (finalDeployment.state === 'ERROR') {
        return {
          success: false,
          projectId: project.id,
          deploymentId: deployment.id,
          error: 'Deployment failed during build'
        };
      }

      onProgress?.('complete', 'Deployment complete!', 100);

      return {
        success: true,
        projectId: project.id,
        deploymentId: finalDeployment.id,
        url: `https://${finalDeployment.url}`,
        previewUrl: `https://${deployment.url}`
      };
    } catch (error) {
      console.error('Vercel deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  /**
   * Create a new project or get existing one
   */
  async createOrGetProject(name: string): Promise<VercelProject> {
    // Try to get existing project
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      const existingResponse = await this.fetch(`/v9/projects/${slug}`);
      if (existingResponse.ok) {
        return existingResponse.json();
      }
    } catch {
      // Project doesn't exist, create it
    }

    // Create new project
    const response = await this.fetch('/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: slug,
        framework: 'vite'
      })
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(`Failed to create project: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Prepare files for Vercel deployment format
   */
  private async prepareFiles(files: GeneratedFile[]): Promise<Array<{ file: string; data: string; encoding: string }>> {
    return files.map(file => ({
      file: file.path,
      data: btoa(file.content), // Base64 encode
      encoding: 'base64'
    }));
  }

  /**
   * Create a deployment
   */
  async createDeployment(projectId: string, options: {
    files: Array<{ file: string; data: string; encoding: string }>;
    projectSettings: {
      framework?: string;
      buildCommand?: string;
      outputDirectory?: string;
      installCommand?: string;
    };
  }): Promise<VercelDeployment> {
    const response = await this.fetch('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectId,
        files: options.files,
        projectSettings: options.projectSettings,
        target: 'preview'
      })
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(`Failed to create deployment: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(
    deploymentId: string,
    onProgress?: (state: string, progress: number) => void,
    maxWaitTime = 300000 // 5 minutes
  ): Promise<VercelDeployment> {
    const startTime = Date.now();
    let lastState = '';

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.fetch(`/v13/deployments/${deploymentId}`);

      if (!response.ok) {
        throw new Error('Failed to get deployment status');
      }

      const deployment: VercelDeployment = await response.json();

      if (deployment.state !== lastState) {
        lastState = deployment.state;
        const progress = this.getProgressForState(deployment.state);
        onProgress?.(deployment.state, progress);
      }

      if (deployment.state === 'READY' || deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
        return deployment;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Deployment timed out');
  }

  /**
   * Get progress percentage for deployment state
   */
  private getProgressForState(state: string): number {
    const stateProgress: Record<string, number> = {
      'QUEUED': 0,
      'INITIALIZING': 0.1,
      'BUILDING': 0.5,
      'READY': 1,
      'ERROR': 1,
      'CANCELED': 1
    };
    return stateProgress[state] || 0;
  }

  /**
   * Set environment variables for a project
   */
  async setEnvironmentVariables(projectId: string, envVars: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(envVars)) {
      const response = await this.fetch(`/v10/projects/${projectId}/env`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          target: ['production', 'preview', 'development'],
          type: 'encrypted'
        })
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        // Ignore if env var already exists
        if (!error.error?.message?.includes('already exists')) {
          console.warn(`Failed to set env var ${key}:`, error.error?.message);
        }
      }
    }
  }

  /**
   * Add a custom domain to a project
   */
  async addDomain(projectId: string, domain: string): Promise<{
    name: string;
    verified: boolean;
    verification?: Array<{ type: string; domain: string; value: string }>;
  }> {
    const response = await this.fetch(`/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain })
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(`Failed to add domain: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Verify a domain
   */
  async verifyDomain(projectId: string, domain: string): Promise<boolean> {
    const response = await this.fetch(`/v10/projects/${projectId}/domains/${domain}/verify`, {
      method: 'POST'
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json() as { verified?: boolean };
    return result.verified === true;
  }

  /**
   * Remove a domain from a project
   */
  async removeDomain(projectId: string, domain: string): Promise<boolean> {
    const response = await this.fetch(`/v10/projects/${projectId}/domains/${domain}`, {
      method: 'DELETE'
    });

    return response.ok;
  }

  /**
   * Get domain configuration
   */
  async getDomainConfig(domain: string): Promise<{
    configuredBy: string | null;
    nameservers: string[];
    serviceType: string;
    cnames: string[];
    aValues: string[];
    conflicts: Array<{ name: string; type: string; value: string }>;
    acceptedChallenges: string[];
    misconfigured: boolean;
  }> {
    const response = await this.fetch(`/v6/domains/${domain}/config`);

    if (!response.ok) {
      throw new Error('Failed to get domain config');
    }

    return response.json();
  }

  /**
   * Get project deployments
   */
  async getDeployments(projectId: string, limit = 10): Promise<VercelDeployment[]> {
    const response = await this.fetch(`/v6/deployments?projectId=${projectId}&limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to get deployments');
    }

    const result = await response.json() as { deployments: VercelDeployment[] };
    return result.deployments;
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(deploymentId: string): Promise<boolean> {
    const response = await this.fetch(`/v13/deployments/${deploymentId}`, {
      method: 'DELETE'
    });

    return response.ok;
  }

  /**
   * Promote a deployment to production
   */
  async promoteToProduction(deploymentId: string, projectId: string): Promise<boolean> {
    const response = await this.fetch(`/v10/projects/${projectId}/promote/${deploymentId}`, {
      method: 'POST'
    });

    return response.ok;
  }

  /**
   * Helper method for fetch with authentication
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
}
