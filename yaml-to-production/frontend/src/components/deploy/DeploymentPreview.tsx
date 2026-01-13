import { useState } from 'react';
import { useDeployStore } from '@/stores/deploy';
import {
  ExternalLink,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ChevronRight,
} from 'lucide-react';

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, { width: number; height: number; label: string; icon: React.ElementType }> = {
  mobile: { width: 375, height: 667, label: 'Mobile', icon: Smartphone },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  desktop: { width: 1280, height: 800, label: 'Desktop', icon: Monitor },
};

export default function DeploymentPreview() {
  const { previewUrl, productionUrl, projectName, setStep } = useDeployStore();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleFinalize = () => {
    setStep('complete');
  };

  const device = deviceSizes[deviceSize];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Preview Your App
        </h2>
        <p className="text-gray-600">
          Review your deployed application before finalizing.
        </p>
      </div>

      {/* URL Bar */}
      <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-3">
        <div className="flex-1 bg-white rounded px-3 py-2 text-sm text-gray-600 font-mono truncate">
          {previewUrl || productionUrl || 'https://your-app.vercel.app'}
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
        <a
          href={previewUrl || productionUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-200 rounded transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </a>
      </div>

      {/* Device Selector */}
      <div className="flex items-center justify-center gap-2">
        {(Object.entries(deviceSizes) as [DeviceSize, typeof device][]).map(
          ([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => setDeviceSize(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                deviceSize === key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          )
        )}
      </div>

      {/* Preview Frame */}
      <div className="flex justify-center">
        <div
          className="bg-gray-900 rounded-xl p-2 transition-all duration-300 shadow-xl"
          style={{
            width: deviceSize === 'desktop' ? '100%' : device.width + 16,
            maxWidth: '100%',
          }}
        >
          {/* Browser Chrome */}
          <div className="bg-gray-800 rounded-t-lg px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-400 font-mono">
                {projectName || 'Preview'}
              </span>
            </div>
          </div>

          {/* Iframe */}
          <div
            className="bg-white overflow-hidden rounded-b-lg"
            style={{
              height: deviceSize === 'desktop' ? 500 : device.height * 0.6,
            }}
          >
            {previewUrl || productionUrl ? (
              <iframe
                key={iframeKey}
                src={previewUrl || productionUrl || undefined}
                className="w-full h-full border-0"
                title="App Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Loading preview...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          Preview URL:{' '}
          <a
            href={previewUrl || productionUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            {previewUrl || productionUrl || 'Loading...'}
          </a>
        </div>
        <button onClick={handleFinalize} className="btn-primary btn-lg">
          Finalize Deployment
          <ChevronRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}
