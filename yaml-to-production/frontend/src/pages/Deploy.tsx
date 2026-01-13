import { useDeployStore } from '@/stores/deploy';
import YamlUpload from '@/components/deploy/YamlUpload';
import MCPServerSelect from '@/components/deploy/MCPServerSelect';
import MCPServerConfig from '@/components/deploy/MCPServerConfig';
import SecurityReview from '@/components/deploy/SecurityReview';
import DeploymentReview from '@/components/deploy/DeploymentReview';
import DeploymentProgress from '@/components/deploy/DeploymentProgress';
import DeploymentPreview from '@/components/deploy/DeploymentPreview';
import DeploymentComplete from '@/components/deploy/DeploymentComplete';
import { CheckCircle, Circle } from 'lucide-react';

const steps = [
  { id: 'upload', label: 'Upload YAML' },
  { id: 'mcp-select', label: 'Select Integrations' },
  { id: 'mcp-config', label: 'Configure' },
  { id: 'security', label: 'Security' },
  { id: 'review', label: 'Review' },
  { id: 'deploying', label: 'Deploy' },
  { id: 'preview', label: 'Preview' },
  { id: 'complete', label: 'Complete' },
];

export default function DeployPage() {
  const currentStep = useDeployStore((state) => state.currentStep);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.slice(0, 6).map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStepIndex
                      ? 'bg-primary-600 text-white'
                      : index === currentStepIndex
                      ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < 5 && (
                <div
                  className={`w-full h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  style={{ minWidth: '40px' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {currentStep === 'upload' && <YamlUpload />}
        {currentStep === 'mcp-select' && <MCPServerSelect />}
        {currentStep === 'mcp-config' && <MCPServerConfig />}
        {currentStep === 'security' && <SecurityReview />}
        {currentStep === 'review' && <DeploymentReview />}
        {currentStep === 'deploying' && <DeploymentProgress />}
        {currentStep === 'preview' && <DeploymentPreview />}
        {currentStep === 'complete' && <DeploymentComplete />}
      </div>
    </div>
  );
}
