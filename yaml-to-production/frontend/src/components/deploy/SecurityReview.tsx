import { useState, useEffect } from 'react';
import { useDeployStore } from '@/stores/deploy';
import { useAuthToken } from '@/hooks/useAuth';
import { yamlApi } from '@/services/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

export default function SecurityReview() {
  const { getToken } = useAuthToken();
  const {
    yamlContent,
    setSecurityResults,
    securityScore,
    securityIssues,
    setStep,
  } = useDeployStore();

  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    runSecurityScan();
  }, []);

  const runSecurityScan = async () => {
    setIsScanning(true);

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in to continue');
        return;
      }

      // Validate YAML for security issues
      const result = await yamlApi.validate(token, yamlContent);

      if (result.securityIssues && result.securityIssues.length > 0) {
        // Calculate score based on issues
        let score = 100;
        for (const issue of result.securityIssues) {
          switch (issue.severity) {
            case 'critical':
              score -= 25;
              break;
            case 'high':
              score -= 15;
              break;
            case 'medium':
              score -= 5;
              break;
            case 'low':
              score -= 2;
              break;
          }
        }
        score = Math.max(0, score);
        setSecurityResults(score, result.securityIssues);
      } else {
        // Pre-deployment scan passed
        setSecurityResults(95, []);
      }
    } catch (error) {
      toast.error('Security scan failed');
      setSecurityResults(0, [{ severity: 'high', description: 'Security scan failed', recommendation: 'Please try again' }]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleContinue = () => {
    if (securityScore !== null && securityScore < 70) {
      toast.error('Please resolve critical security issues before continuing');
      return;
    }
    setStep('review');
  };

  const handleBack = () => {
    setStep('mcp-config');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'from-green-500 to-green-600';
    if (score >= 70) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const severityConfig = {
    critical: { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    high: { icon: AlertTriangle, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    medium: { icon: AlertTriangle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    low: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Security Review
        </h2>
        <p className="text-gray-600">
          Automated security scan of your YAML specification and configuration.
        </p>
      </div>

      {isScanning ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
            <Shield className="w-8 h-8 text-primary-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Running Security Scan
          </h3>
          <p className="text-gray-500 mb-4">
            Checking for vulnerabilities and security issues...
          </p>
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <>
          {/* Security Score */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-4">
              {securityScore !== null && securityScore >= 70 ? (
                <CheckCircle className={`w-10 h-10 ${getScoreColor(securityScore)}`} />
              ) : (
                <XCircle className={`w-10 h-10 ${getScoreColor(securityScore || 0)}`} />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Security Score
            </h3>
            <div className={`text-4xl font-bold ${getScoreColor(securityScore || 0)}`}>
              {securityScore}/100
            </div>
            <div className="w-full max-w-xs mx-auto mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreBg(securityScore || 0)} transition-all duration-500`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {securityScore !== null && securityScore >= 85
                ? 'Your configuration passes security checks!'
                : securityScore !== null && securityScore >= 70
                ? 'Your configuration has some warnings but can be deployed.'
                : 'Please address critical security issues before deployment.'}
            </p>
          </div>

          {/* Security Issues */}
          {securityIssues.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Security Issues</h3>
              {securityIssues.map((issue, index) => {
                const config = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.low;
                const Icon = config.icon;

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium uppercase ${config.text}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className={`font-medium ${config.text}`}>
                          {issue.description}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Issues */}
          {securityIssues.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">
                    No security issues detected
                  </p>
                  <p className="text-sm text-green-600">
                    Your YAML specification and configuration passed all security checks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• All secrets are stored securely and encrypted</li>
              <li>• API keys will be set as environment variables on Vercel</li>
              <li>• Generated code will undergo additional security auditing during deployment</li>
            </ul>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button onClick={handleBack} className="btn-secondary" disabled={isScanning}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          onClick={handleContinue}
          className="btn-primary"
          disabled={isScanning || (securityScore !== null && securityScore < 70)}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
