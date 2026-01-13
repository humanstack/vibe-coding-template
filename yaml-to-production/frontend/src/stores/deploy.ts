import { create } from 'zustand';
import type { YamlSpec, MCPServer, Project, Deployment, DeploymentProgress } from '@/types';

export type DeployStep =
  | 'upload'
  | 'mcp-select'
  | 'mcp-config'
  | 'security'
  | 'review'
  | 'deploying'
  | 'preview'
  | 'complete';

interface DeployState {
  // Current step
  currentStep: DeployStep;

  // YAML content and parsed spec
  yamlContent: string;
  yamlSpec: YamlSpec | null;
  validationErrors: Array<{ path: string; message: string }>;
  warnings: string[];

  // Analysis results
  detectedTechStack: string;
  suggestedFramework: string;
  environmentVariables: string[];
  complexity: 'simple' | 'moderate' | 'complex';

  // MCP servers
  requiredMCPServers: MCPServer[];
  optionalMCPServers: MCPServer[];
  selectedMCPServers: string[];
  mcpConfigs: Record<string, Record<string, string>>;

  // Environment variables
  envVarValues: Record<string, string>;

  // Project configuration
  projectName: string;
  projectDescription: string;
  environment: 'development' | 'staging' | 'production';
  region: string;

  // Deployment
  project: Project | null;
  deployment: Deployment | null;
  deploymentProgress: DeploymentProgress | null;
  deploymentLogs: Array<{ timestamp: string; level: string; message: string }>;

  // Security
  securityScore: number | null;
  securityIssues: Array<{ severity: string; description: string; recommendation: string }>;

  // Result
  productionUrl: string | null;
  previewUrl: string | null;

  // Actions
  setStep: (step: DeployStep) => void;
  setYamlContent: (content: string) => void;
  setYamlSpec: (spec: YamlSpec | null) => void;
  setValidationErrors: (errors: Array<{ path: string; message: string }>) => void;
  setWarnings: (warnings: string[]) => void;
  setAnalysis: (analysis: {
    detectedTechStack: string;
    suggestedFramework: string;
    environmentVariables: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  }) => void;
  setMCPServers: (required: MCPServer[], optional: MCPServer[]) => void;
  toggleMCPServer: (serverId: string) => void;
  setMCPConfig: (serverId: string, config: Record<string, string>) => void;
  setEnvVarValue: (key: string, value: string) => void;
  setProjectConfig: (config: {
    name?: string;
    description?: string;
    environment?: 'development' | 'staging' | 'production';
    region?: string;
  }) => void;
  setProject: (project: Project | null) => void;
  setDeployment: (deployment: Deployment | null) => void;
  setDeploymentProgress: (progress: DeploymentProgress | null) => void;
  addDeploymentLog: (log: { timestamp: string; level: string; message: string }) => void;
  setSecurityResults: (score: number, issues: Array<{ severity: string; description: string; recommendation: string }>) => void;
  setUrls: (production: string | null, preview: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'upload' as DeployStep,
  yamlContent: '',
  yamlSpec: null,
  validationErrors: [],
  warnings: [],
  detectedTechStack: '',
  suggestedFramework: '',
  environmentVariables: [],
  complexity: 'simple' as const,
  requiredMCPServers: [],
  optionalMCPServers: [],
  selectedMCPServers: [],
  mcpConfigs: {},
  envVarValues: {},
  projectName: '',
  projectDescription: '',
  environment: 'development' as const,
  region: 'iad1',
  project: null,
  deployment: null,
  deploymentProgress: null,
  deploymentLogs: [],
  securityScore: null,
  securityIssues: [],
  productionUrl: null,
  previewUrl: null,
};

export const useDeployStore = create<DeployState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setYamlContent: (content) => set({ yamlContent: content }),

  setYamlSpec: (spec) =>
    set({
      yamlSpec: spec,
      projectName: spec?.name || '',
      projectDescription: spec?.description || '',
    }),

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  setWarnings: (warnings) => set({ warnings }),

  setAnalysis: (analysis) => set(analysis),

  setMCPServers: (required, optional) =>
    set({
      requiredMCPServers: required,
      optionalMCPServers: optional,
      selectedMCPServers: required.map((s) => s.id),
    }),

  toggleMCPServer: (serverId) =>
    set((state) => {
      const isRequired = state.requiredMCPServers.some((s) => s.id === serverId);
      if (isRequired) return state; // Can't deselect required servers

      const isSelected = state.selectedMCPServers.includes(serverId);
      return {
        selectedMCPServers: isSelected
          ? state.selectedMCPServers.filter((id) => id !== serverId)
          : [...state.selectedMCPServers, serverId],
      };
    }),

  setMCPConfig: (serverId, config) =>
    set((state) => ({
      mcpConfigs: { ...state.mcpConfigs, [serverId]: config },
    })),

  setEnvVarValue: (key, value) =>
    set((state) => ({
      envVarValues: { ...state.envVarValues, [key]: value },
    })),

  setProjectConfig: (config) =>
    set((state) => ({
      projectName: config.name ?? state.projectName,
      projectDescription: config.description ?? state.projectDescription,
      environment: config.environment ?? state.environment,
      region: config.region ?? state.region,
    })),

  setProject: (project) => set({ project }),

  setDeployment: (deployment) => set({ deployment }),

  setDeploymentProgress: (progress) => set({ deploymentProgress: progress }),

  addDeploymentLog: (log) =>
    set((state) => ({
      deploymentLogs: [...state.deploymentLogs, log],
    })),

  setSecurityResults: (score, issues) =>
    set({
      securityScore: score,
      securityIssues: issues,
    }),

  setUrls: (production, preview) =>
    set({
      productionUrl: production,
      previewUrl: preview,
    }),

  reset: () => set(initialState),
}));
