import { Link } from 'react-router-dom';
import { useDeployStore } from '@/stores/deploy';
import {
  CheckCircle,
  ExternalLink,
  Globe,
  BarChart,
  Settings,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function DeploymentComplete() {
  const { productionUrl, previewUrl, projectName, project, securityScore, reset } =
    useDeployStore();

  useEffect(() => {
    // Celebrate!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const handleNewDeployment = () => {
    reset();
  };

  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Deployment Complete! 🎉
        </h2>
        <p className="text-gray-600">
          Your application <strong>{projectName}</strong> is now live.
        </p>
      </div>

      {/* URLs */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-4 text-left">
        {productionUrl && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Production URL
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm">
                {productionUrl}
              </div>
              <button
                onClick={() => copyUrl(productionUrl)}
                className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
              <a
                href={productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {previewUrl && previewUrl !== productionUrl && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Preview URL
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-500">
                {previewUrl}
              </div>
              <button
                onClick={() => copyUrl(previewUrl)}
                className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {securityScore || 95}
          </div>
          <div className="text-sm text-gray-500">Security Score</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">~2min</div>
          <div className="text-sm text-gray-500">Build Time</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">Live</div>
          <div className="text-sm text-gray-500">Status</div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
        <h3 className="font-semibold text-blue-900 mb-4">Next Steps</h3>
        <div className="space-y-3">
          <NextStepItem
            icon={Globe}
            title="Configure Custom Domain"
            description="Add your own domain for a professional touch"
            href={project ? `/project/${project.id}` : '/dashboard'}
          />
          <NextStepItem
            icon={BarChart}
            title="Monitor Performance"
            description="Track visitors and performance metrics"
            href="https://vercel.com/dashboard"
            external
          />
          <NextStepItem
            icon={Settings}
            title="Update Environment Variables"
            description="Manage your API keys and secrets"
            href={project ? `/project/${project.id}` : '/dashboard'}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to={project ? `/project/${project.id}` : '/dashboard'}
          className="btn-primary btn-lg"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
        <button onClick={handleNewDeployment} className="btn-secondary btn-lg">
          Deploy Another App
        </button>
      </div>
    </div>
  );
}

function NextStepItem({
  icon: Icon,
  title,
  description,
  href,
  external,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-100/50 transition-colors cursor-pointer">
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-blue-900">{title}</p>
        <p className="text-sm text-blue-700">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-blue-400 mt-2" />
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={href}>{content}</Link>;
}
