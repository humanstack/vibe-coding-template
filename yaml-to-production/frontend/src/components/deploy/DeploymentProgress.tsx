import { useDeployStore } from '@/stores/deploy';
import { useDeploymentWebSocket } from '@/hooks/useDeployment';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  CheckCircle,
  Circle,
  AlertCircle,
  FileCode,
  Shield,
  Package,
  Upload,
  Hammer,
  Rocket,
  XCircle,
} from 'lucide-react';

const stages = [
  { id: 'validating', label: 'Validating YAML', icon: FileCode },
  { id: 'generating', label: 'Generating Code', icon: FileCode },
  { id: 'auditing', label: 'Security Audit', icon: Shield },
  { id: 'packaging', label: 'Packaging', icon: Package },
  { id: 'uploading', label: 'Uploading', icon: Upload },
  { id: 'building', label: 'Building', icon: Hammer },
  { id: 'deploying', label: 'Deploying', icon: Rocket },
];

export default function DeploymentProgress() {
  const { deployment, deploymentProgress, deploymentLogs } = useDeployStore();

  // Connect to WebSocket for real-time updates
  useDeploymentWebSocket(deployment?.id || null);

  const currentStage = deploymentProgress?.stage || deployment?.status || 'pending';
  const progress = deploymentProgress?.progress || deployment?.progress || 0;
  const message = deploymentProgress?.message || 'Starting deployment...';

  const currentStageIndex = stages.findIndex((s) => s.id === currentStage);
  const isFailed = currentStage === 'failed';
  const isComplete = currentStage === 'complete';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
          {isFailed ? (
            <XCircle className="w-8 h-8 text-red-600" />
          ) : isComplete ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <Rocket className="w-8 h-8 text-primary-600 animate-pulse" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {isFailed ? 'Deployment Failed' : isComplete ? 'Deployment Complete!' : 'Deploying Your App'}
        </h2>
        <p className="text-gray-600">{message}</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-primary-500 to-primary-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500">{progress}% complete</p>

      {/* Stage List */}
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentStage;
          const isCompleted = currentStageIndex > index || isComplete;
          const isError = isFailed && isActive;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 border border-primary-200'
                  : isCompleted
                  ? 'bg-green-50'
                  : 'bg-gray-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isError
                    ? 'bg-red-100'
                    : isCompleted
                    ? 'bg-green-100'
                    : isActive
                    ? 'bg-primary-100'
                    : 'bg-gray-200'
                }`}
              >
                {isError ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : isActive ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    isError
                      ? 'text-red-700'
                      : isCompleted
                      ? 'text-green-700'
                      : isActive
                      ? 'text-primary-700'
                      : 'text-gray-500'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
              <Icon
                className={`w-4 h-4 ${
                  isError
                    ? 'text-red-400'
                    : isCompleted
                    ? 'text-green-400'
                    : isActive
                    ? 'text-primary-400'
                    : 'text-gray-300'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Live Logs */}
      {deploymentLogs.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">
            Deployment Logs
          </h4>
          <div className="space-y-1 font-mono text-xs">
            {deploymentLogs.slice(-20).map((log, index) => (
              <div
                key={index}
                className={`${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Deployment Failed</h4>
              <p className="text-sm text-red-700 mt-1">{message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
