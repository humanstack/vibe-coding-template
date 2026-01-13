import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken, useAuth } from '@/hooks/useAuth';
import { mcpApi } from '@/services/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  Mail,
  Wallet,
} from 'lucide-react';
import type { ApiKey } from '@/types';

export default function SettingsPage() {
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();

  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<ApiKey['keyType']>('vercel');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKeyValue, setShowKeyValue] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return mcpApi.getKeys(token);
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return mcpApi.storeKey(token, newKeyName, newKeyType, newKeyValue);
    },
    onSuccess: () => {
      toast.success('API key added successfully');
      setShowAddKey(false);
      setNewKeyName('');
      setNewKeyValue('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add key');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyName: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return mcpApi.deleteKey(token, keyName);
    },
    onSuccess: () => {
      toast.success('API key deleted');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete key');
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: async (keyName: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      setTestingKey(keyName);
      return mcpApi.testKey(token, keyName);
    },
    onSuccess: (result) => {
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setTestingKey(null);
    },
    onError: () => {
      toast.error('Failed to test key');
      setTestingKey(null);
    },
  });

  const keys = keysData?.keys || [];

  const keyTypeLabels: Record<string, string> = {
    vercel: 'Vercel',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    stripe: 'Stripe',
    database: 'Database',
    custom: 'Custom',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and API keys</p>
      </div>

      {/* Profile Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">
                {user?.email?.[0]?.toUpperCase() || user?.wallet?.[2]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user?.email || `${user?.wallet?.slice(0, 6)}...${user?.wallet?.slice(-4)}`}
              </p>
              <p className="text-sm text-gray-500">User ID: {user?.id?.slice(0, 12)}...</p>
            </div>
          </div>

          {user?.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
          )}

          {user?.wallet && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Wallet className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Wallet</p>
                <p className="font-medium text-gray-900 font-mono">{user.wallet}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* API Keys Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </h2>
          {!showAddKey && (
            <button onClick={() => setShowAddKey(true)} className="btn-sm btn-primary">
              <Plus className="w-4 h-4 mr-1" />
              Add Key
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Store your API keys securely. They will be encrypted and used during deployments.
        </p>

        {/* Add Key Form */}
        {showAddKey && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="label">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., vercel-production"
                className="input"
              />
            </div>

            <div>
              <label className="label">Key Type</label>
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value as ApiKey['keyType'])}
                className="input"
              >
                <option value="vercel">Vercel</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="stripe">Stripe</option>
                <option value="database">Database</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="label">API Key Value</label>
              <div className="relative">
                <input
                  type={showKeyValue ? 'text' : 'password'}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="Enter your API key"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyValue(!showKeyValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addKeyMutation.mutate()}
                disabled={!newKeyName || !newKeyValue || addKeyMutation.isPending}
                className="btn-primary"
              >
                {addKeyMutation.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save Key
              </button>
              <button
                onClick={() => {
                  setShowAddKey(false);
                  setNewKeyName('');
                  setNewKeyValue('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Keys List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No API keys stored yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <Key className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.keyName}</p>
                    <p className="text-xs text-gray-500">
                      {keyTypeLabels[key.keyType]} • Added{' '}
                      {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testKeyMutation.mutate(key.keyName)}
                    disabled={testingKey === key.keyName}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Test key"
                  >
                    {testingKey === key.keyName ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteKeyMutation.mutate(key.keyName)}
                    disabled={deleteKeyMutation.isPending}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Help Section */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-sm text-blue-700 mb-4">
          Learn how to get API keys for different services:
        </p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Vercel:{' '}
            <a
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              vercel.com/account/tokens
            </a>
          </li>
          <li>
            • Anthropic:{' '}
            <a
              href="https://console.anthropic.com/account/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              console.anthropic.com/account/keys
            </a>
          </li>
          <li>
            • OpenAI:{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            • Stripe:{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              dashboard.stripe.com/apikeys
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
