import { useDeployStore } from '@/stores/deploy';
import { Check, Lock, ChevronLeft, ChevronRight, Database, Wallet, Mail, BarChart, Github, Cloud } from 'lucide-react';
import type { MCPServer } from '@/types';

const categoryIcons: Record<string, React.ElementType> = {
  ai: Cloud,
  database: Database,
  storage: Github,
  auth: Wallet,
  payment: Wallet,
  email: Mail,
  analytics: BarChart,
  other: Cloud,
};

export default function MCPServerSelect() {
  const {
    requiredMCPServers,
    optionalMCPServers,
    selectedMCPServers,
    toggleMCPServer,
    setStep,
  } = useDeployStore();

  const handleContinue = () => {
    setStep('mcp-config');
  };

  const handleBack = () => {
    setStep('upload');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select Integrations
        </h2>
        <p className="text-gray-600">
          Choose the MCP servers and integrations for your project.
        </p>
      </div>

      {/* Required Servers */}
      {requiredMCPServers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Required Integrations
          </h3>
          <div className="grid gap-3">
            {requiredMCPServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                selected={true}
                required={true}
                onToggle={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional Servers */}
      {optionalMCPServers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recommended Integrations
          </h3>
          <div className="grid gap-3">
            {optionalMCPServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                selected={selectedMCPServers.includes(server.id)}
                required={false}
                onToggle={() => toggleMCPServer(server.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No optional servers message */}
      {optionalMCPServers.length === 0 && requiredMCPServers.length > 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No additional integrations needed based on your YAML specification.
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button onClick={handleBack} className="btn-secondary">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

function ServerCard({
  server,
  selected,
  required,
  onToggle,
}: {
  server: MCPServer;
  selected: boolean;
  required: boolean;
  onToggle: () => void;
}) {
  const Icon = categoryIcons[server.category] || Cloud;

  return (
    <button
      onClick={onToggle}
      disabled={required}
      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      } ${required ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          selected ? 'bg-primary-100' : 'bg-gray-100'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            selected ? 'text-primary-600' : 'text-gray-500'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{server.displayName}</span>
          {required && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{server.description}</p>
      </div>

      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected
            ? 'border-primary-600 bg-primary-600'
            : 'border-gray-300 bg-white'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
}
