import { useState } from 'react';
import { useDeployStore } from '@/stores/deploy';
import { useAuthToken } from '@/hooks/useAuth';
import { mcpApi } from '@/services/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ChevronLeft, ChevronRight, Key, ExternalLink, Eye, EyeOff } from 'lucide-react';

export default function MCPServerConfig() {
  const { getToken } = useAuthToken();
  const {
    requiredMCPServers,
    optionalMCPServers,
    selectedMCPServers,
    mcpConfigs,
    setMCPConfig,
    environmentVariables,
    envVarValues,
    setEnvVarValue,
    projectName,
    projectDescription,
    environment,
    region,
    setProjectConfig,
    setStep,
  } = useDeployStore();

  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const allServers = [...requiredMCPServers, ...optionalMCPServers].filter(
    (server) => selectedMCPServers.includes(server.id)
  );

  const handleConfigChange = (serverId: string, key: string, value: string) => {
    const existing = mcpConfigs[serverId] || {};
    setMCPConfig(serverId, { ...existing, [key]: value });
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async () => {
    // Validate required fields for each server
    for (const server of allServers) {
      const schema = server.configSchema as {
        properties: Record<string, unknown>;
        required?: string[];
      };
      const config = mcpConfigs[server.id] || {};

      for (const field of schema.required || []) {
        if (!config[field]) {
          toast.error(`Please configure ${field} for ${server.displayName}`);
          return;
        }
      }
    }

    // Validate project name
    if (!projectName) {
      toast.error('Please enter a project name');
      return;
    }

    setIsSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in to continue');
        return;
      }

      // Store API keys securely
      for (const server of allServers) {
        const config = mcpConfigs[server.id];
        if (config) {
          for (const [key, value] of Object.entries(config)) {
            if (value && (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'))) {
              await mcpApi.storeKey(token, `${server.name}-${key}`, server.category, value);
            }
          }
        }
      }

      setStep('security');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setStep('mcp-select');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Configure Your Project
        </h2>
        <p className="text-gray-600">
          Enter your API keys and configure project settings.
        </p>
      </div>

      {/* Project Settings */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Project Settings</h3>

        <div>
          <label className="label">Project Name *</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectConfig({ name: e.target.value })}
            placeholder="my-awesome-app"
            className="input"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <input
            type="text"
            value={projectDescription}
            onChange={(e) => setProjectConfig({ description: e.target.value })}
            placeholder="A brief description of your project"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Environment</label>
            <select
              value={environment}
              onChange={(e) =>
                setProjectConfig({
                  environment: e.target.value as 'development' | 'staging' | 'production',
                })
              }
              className="input"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="label">Region</label>
            <select
              value={region}
              onChange={(e) => setProjectConfig({ region: e.target.value })}
              className="input"
            >
              <option value="iad1">Washington, D.C. (iad1)</option>
              <option value="sfo1">San Francisco (sfo1)</option>
              <option value="cdg1">Paris (cdg1)</option>
              <option value="hnd1">Tokyo (hnd1)</option>
              <option value="sin1">Singapore (sin1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MCP Server Configurations */}
      {allServers.map((server) => {
        const schema = server.configSchema as {
          properties: Record<string, { type: string; description: string }>;
          required?: string[];
        };
        const config = mcpConfigs[server.id] || {};

        return (
          <div key={server.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">{server.displayName}</h3>
              </div>
              {server.documentationUrl && (
                <a
                  href={server.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {Object.entries(schema.properties).map(([key, fieldSchema]) => {
              const isRequired = schema.required?.includes(key);
              const isSecret =
                key.toLowerCase().includes('key') ||
                key.toLowerCase().includes('token') ||
                key.toLowerCase().includes('secret');
              const showSecret = showSecrets[`${server.id}-${key}`];

              return (
                <div key={key}>
                  <label className="label">
                    {key} {isRequired && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={isSecret && !showSecret ? 'password' : 'text'}
                      value={config[key] || ''}
                      onChange={(e) =>
                        handleConfigChange(server.id, key, e.target.value)
                      }
                      placeholder={fieldSchema.description}
                      className="input pr-10"
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(`${server.id}-${key}`)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecret ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {fieldSchema.description}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Environment Variables */}
      {environmentVariables.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Environment Variables</h3>
          <p className="text-sm text-gray-500">
            These variables will be configured on Vercel during deployment.
          </p>

          {environmentVariables.map((varName) => (
            <div key={varName}>
              <label className="label">{varName}</label>
              <input
                type={
                  varName.toLowerCase().includes('key') ||
                  varName.toLowerCase().includes('secret')
                    ? 'password'
                    : 'text'
                }
                value={envVarValues[varName] || ''}
                onChange={(e) => setEnvVarValue(varName, e.target.value)}
                placeholder={`Enter ${varName}`}
                className="input"
              />
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button onClick={handleBack} className="btn-secondary" disabled={isSaving}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary" disabled={isSaving}>
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
