import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useDeployStore } from '@/stores/deploy';
import { useAuthToken } from '@/hooks/useAuth';
import { yamlApi } from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Upload, FileText, AlertCircle, ChevronRight } from 'lucide-react';

export default function YamlUpload() {
  const { getToken } = useAuthToken();
  const [isValidating, setIsValidating] = useState(false);
  const {
    yamlContent,
    setYamlContent,
    setYamlSpec,
    setValidationErrors,
    setWarnings,
    setAnalysis,
    setMCPServers,
    setStep,
    validationErrors,
    warnings,
  } = useDeployStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const text = await file.text();
      setYamlContent(text);
      await validateYaml(text);
    },
    [setYamlContent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-yaml': ['.yaml', '.yml'],
      'text/yaml': ['.yaml', '.yml'],
    },
    maxFiles: 1,
  });

  const validateYaml = async (content: string) => {
    setIsValidating(true);
    setValidationErrors([]);
    setWarnings([]);

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in to continue');
        return;
      }

      // Analyze YAML
      const result = await yamlApi.analyze(token, content);

      if (result.spec) {
        setYamlSpec(result.spec);
        setWarnings(result.warnings || []);
        setAnalysis({
          detectedTechStack: result.analysis.detectedTechStack,
          suggestedFramework: result.analysis.suggestedFramework,
          environmentVariables: result.analysis.environmentVariables,
          complexity: result.analysis.estimatedComplexity,
        });
        setMCPServers(
          result.analysis.mcpServers.required,
          result.analysis.mcpServers.recommended
        );
        toast.success('YAML validated successfully');
      }
    } catch (error) {
      if (error instanceof Error) {
        setValidationErrors([{ path: '', message: error.message }]);
        toast.error(error.message);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (!yamlContent) {
      toast.error('Please upload or paste a YAML specification');
      return;
    }
    setStep('mcp-select');
  };

  const loadSample = async (type: 'web-app' | 'api' | 'static' | 'fullstack') => {
    try {
      const sample = await yamlApi.getSample(type);
      setYamlContent(sample);
      await validateYaml(sample);
    } catch {
      toast.error('Failed to load sample');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Your YAML Specification
        </h2>
        <p className="text-gray-600">
          Define your application structure, features, and integrations in YAML format.
        </p>
      </div>

      {/* Sample Templates */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500">Try a sample:</span>
        {[
          { type: 'web-app' as const, label: 'Web App' },
          { type: 'api' as const, label: 'API' },
          { type: 'fullstack' as const, label: 'Full Stack' },
          { type: 'static' as const, label: 'Static Site' },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => loadSample(type)}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone cursor-pointer ${
          isDragActive ? 'active border-primary-500 bg-primary-50' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <Upload
            className={`w-10 h-10 mb-3 ${
              isDragActive ? 'text-primary-500' : 'text-gray-400'
            }`}
          />
          <p className="text-gray-600 mb-1">
            {isDragActive
              ? 'Drop your YAML file here'
              : 'Drag & drop your YAML file, or click to select'}
          </p>
          <p className="text-sm text-gray-400">.yaml or .yml files</p>
        </div>
      </div>

      {/* Or paste */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-sm text-gray-500">
            or paste your YAML
          </span>
        </div>
      </div>

      {/* Text area */}
      <div className="relative">
        <textarea
          value={yamlContent}
          onChange={(e) => {
            setYamlContent(e.target.value);
          }}
          onBlur={() => yamlContent && validateYaml(yamlContent)}
          placeholder={`name: my-app
type: web-app
framework: react-vite

features:
  - name: Landing Page
    type: page
    description: Hero with call-to-action

integrations:
  - type: auth
    provider: privy`}
          className="yaml-editor w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        {yamlContent && (
          <div className="absolute top-2 right-2">
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Validation Status */}
      {isValidating && (
        <div className="flex items-center gap-2 text-gray-600">
          <LoadingSpinner size="sm" />
          <span>Validating YAML...</span>
        </div>
      )}

      {/* Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Validation Errors</h4>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>
                    {error.path && <code className="font-mono">{error.path}:</code>}{' '}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Warnings</h4>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={handleContinue}
          disabled={!yamlContent || validationErrors.length > 0 || isValidating}
          className="btn-primary"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
