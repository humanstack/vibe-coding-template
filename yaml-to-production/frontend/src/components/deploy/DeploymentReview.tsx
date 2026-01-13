import { useState } from 'react';
import { useDeployStore } from '@/stores/deploy';
import { useAuthToken } from '@/hooks/useAuth';
import { projectsApi, deploymentsApi } from '@/services/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ChevronLeft,
  Rocket,
  FileCode,
  Shield,
  Settings,
  Cloud,
  CheckCircle,
} from 'lucide-react';

export default function DeploymentReview() {
  const { getToken } = useAuthToken();
  const {
    yamlSpec,
    yamlContent,
    projectName,
    projectDescription,
    environment,
    region,
    detectedTechStack,
    suggestedFramework,
    complexity,
    selectedMCPServers,
    requiredMCPServers,
    optionalMCPServers,
    securityScore,
    envVarValues,
    setProject,
    setDeployment,
    setStep,
  } = useDeployStore();

  const [isDeploying, setIsDeploying] = useState(false);

  const allServers = [...requiredMCPServers, ...optionalMCPServers].filter(
    (server) => selectedMCPServers.includes(server.id)
  );

  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in to continue');
        return;
      }

      // Create project
      const projectResult = await projectsApi.create(token, {
        name: projectName,
        description: projectDescription,
        yamlContent,
        environment,
        region,
      });

      setProject(projectResult.project);

      // Create deployment
      const deployResult = await deploymentsApi.create(
        token,
        projectResult.project.id,
        envVarValues
      );

      setDeployment(deployResult.deployment);
      setStep('deploying');
      toast.success('Deployment started!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleBack = () => {
    setStep('security');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review & Deploy
        </h2>
        <p className="text-gray-600">
          Review your configuration before deploying to production.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Info */}
        <SummaryCard
          icon={FileCode}
          title="Project"
          items={[
            { label: 'Name', value: projectName },
            { label: 'Type', value: yamlSpec?.type || 'web-app' },
            { label: 'Framework', value: suggestedFramework },
            { label: 'Complexity', value: complexity },
          ]}
        />

        {/* Environment */}
        <SummaryCard
          icon={Settings}
          title="Environment"
          items={[
            { label: 'Environment', value: environment },
            { label: 'Region', value: region },
            { label: 'Tech Stack', value: detectedTechStack },
          ]}
        />

        {/* Integrations */}
        <SummaryCard
          icon={Cloud}
          title="Integrations"
          items={allServers.map((server) => ({
            label: server.displayName,
            value: selectedMCPServers.includes(server.id) ? 'Configured' : 'Not configured',
            status: selectedMCPServers.includes(server.id) ? 'success' : 'pending',
          }))}
        />

        {/* Security */}
        <SummaryCard
          icon={Shield}
          title="Security"
          items={[
            {
              label: 'Security Score',
              value: `${securityScore}/100`,
              status: securityScore && securityScore >= 85 ? 'success' : securityScore && securityScore >= 70 ? 'warning' : 'error',
            },
            { label: 'Environment Variables', value: `${Object.keys(envVarValues).length} configured` },
          ]}
        />
      </div>

      {/* Features */}
      {yamlSpec?.features && yamlSpec.features.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Features to Generate</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {yamlSpec.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">{feature.name}</span>
                <span className="text-gray-400">({feature.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Target */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 76 65" fill="none">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-900">Deploying to Vercel</p>
            <p className="text-sm text-blue-700">
              Your app will be deployed to Vercel with automatic SSL, global CDN, and instant rollbacks.
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> By clicking "Deploy", you authorize Prototype Cafe to:
        </p>
        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
          <li>• Create a new project on your connected Vercel account</li>
          <li>• Deploy generated code to Vercel</li>
          <li>• Configure environment variables</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button onClick={handleBack} className="btn-secondary" disabled={isDeploying}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button onClick={handleDeploy} className="btn-primary btn-lg" disabled={isDeploying}>
          {isDeploying ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Starting Deployment...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              Deploy to Production
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: Array<{ label: string; value: string; status?: 'success' | 'warning' | 'error' | 'pending' }>;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{item.label}</span>
            <span
              className={`font-medium ${
                item.status === 'success'
                  ? 'text-green-600'
                  : item.status === 'warning'
                  ? 'text-yellow-600'
                  : item.status === 'error'
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
