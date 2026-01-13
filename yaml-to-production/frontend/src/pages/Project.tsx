import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/useAuth';
import { projectsApi, domainsApi } from '@/services/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  ExternalLink,
  Rocket,
  Trash2,
  Globe,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type { Deployment, CustomDomain } from '@/types';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token || !id) throw new Error('Not authenticated');
      return projectsApi.get(token, id);
    },
    enabled: !!id,
  });

  const { data: domainsData } = useQuery({
    queryKey: ['domains', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token || !id) throw new Error('Not authenticated');
      return domainsApi.list(token, id);
    },
    enabled: !!id,
  });

  const redeployMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token || !id) throw new Error('Not authenticated');
      return projectsApi.redeploy(token, id);
    },
    onSuccess: () => {
      toast.success('Redeployment started!');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Redeployment failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token || !id) throw new Error('Not authenticated');
      return projectsApi.delete(token, id);
    },
    onSuccess: () => {
      toast.success('Project deleted');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const token = await getToken();
      if (!token || !id) throw new Error('Not authenticated');
      return domainsApi.add(token, id, domain);
    },
    onSuccess: () => {
      toast.success('Domain added! Configure your DNS records.');
      setNewDomain('');
      setIsAddingDomain(false);
      queryClient.invalidateQueries({ queryKey: ['domains', id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add domain');
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return domainsApi.verify(token, domainId);
    },
    onSuccess: (result) => {
      if (result.verified) {
        toast.success('Domain verified!');
      } else {
        toast.error('DNS not configured correctly. Please check your DNS records.');
      }
      queryClient.invalidateQueries({ queryKey: ['domains', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { project, deployments } = data;
  const domains = domainsData?.domains || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.production_url && (
            <a
              href={project.production_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Site
            </a>
          )}
          <button
            onClick={() => redeployMutation.mutate()}
            disabled={redeployMutation.isPending}
            className="btn-primary"
          >
            {redeployMutation.isPending ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Rocket className="w-4 h-4 mr-2" />
            )}
            Redeploy
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          label="Status"
          value={project.status}
          status={project.status === 'deployed' ? 'success' : project.status === 'failed' ? 'error' : 'pending'}
        />
        <StatusCard
          label="Security Score"
          value={project.security_score ? `${project.security_score}/100` : 'N/A'}
          status={
            project.security_score && project.security_score >= 85
              ? 'success'
              : project.security_score && project.security_score >= 70
              ? 'warning'
              : 'error'
          }
        />
        <StatusCard label="Tech Stack" value={project.tech_stack || 'React'} />
        <StatusCard label="Region" value={project.region} />
      </div>

      {/* Production URL */}
      {project.production_url && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Production URL</p>
                <a
                  href={project.production_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:underline font-mono text-sm"
                >
                  {project.production_url}
                </a>
              </div>
            </div>
            <a
              href={project.production_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sm btn-primary"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Custom Domains */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Custom Domains</h2>
          </div>
          {!isAddingDomain && (
            <button onClick={() => setIsAddingDomain(true)} className="btn-sm btn-secondary">
              <Plus className="w-4 h-4 mr-1" />
              Add Domain
            </button>
          )}
        </div>

        {isAddingDomain && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="input flex-1"
              />
              <button
                onClick={() => addDomainMutation.mutate(newDomain)}
                disabled={!newDomain || addDomainMutation.isPending}
                className="btn-primary"
              >
                {addDomainMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Add'
                )}
              </button>
              <button onClick={() => setIsAddingDomain(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {domains.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No custom domains configured. Add one to use your own domain.
          </p>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                onVerify={() => verifyDomainMutation.mutate(domain.id)}
                isVerifying={verifyDomainMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deployment History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment History</h2>
        {deployments.length === 0 ? (
          <p className="text-gray-500 text-sm">No deployments yet.</p>
        ) : (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <DeploymentRow key={deployment.id} deployment={deployment} />
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">
          Deleting this project will remove all deployments and configurations. This action cannot
          be undone.
        </p>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-700">Are you sure?</span>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="btn-danger btn-sm"
            >
              {deleteMutation.isPending ? <LoadingSpinner size="sm" /> : 'Yes, Delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger btn-sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </button>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'error' | 'pending';
}) {
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    pending: 'text-gray-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-lg font-semibold capitalize ${status ? statusColors[status] : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function DomainRow({
  domain,
  onVerify,
  isVerifying,
}: {
  domain: CustomDomain;
  onVerify: () => void;
  isVerifying: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {domain.verified ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">{domain.domain}</p>
          <p className="text-xs text-gray-500">
            {domain.verified ? 'Verified' : 'Pending DNS verification'}
          </p>
        </div>
      </div>
      {!domain.verified && (
        <button onClick={onVerify} disabled={isVerifying} className="btn-sm btn-secondary">
          {isVerifying ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
          Verify
        </button>
      )}
    </div>
  );
}

function DeploymentRow({ deployment }: { deployment: Deployment }) {
  const statusIcons = {
    pending: Clock,
    validating: Clock,
    generating: Clock,
    auditing: Shield,
    packaging: Clock,
    uploading: Clock,
    building: Clock,
    deploying: Rocket,
    success: CheckCircle,
    failed: XCircle,
  };

  const statusColors = {
    pending: 'text-gray-500',
    validating: 'text-blue-500',
    generating: 'text-blue-500',
    auditing: 'text-yellow-500',
    packaging: 'text-blue-500',
    uploading: 'text-blue-500',
    building: 'text-blue-500',
    deploying: 'text-purple-500',
    success: 'text-green-500',
    failed: 'text-red-500',
  };

  const Icon = statusIcons[deployment.status] || Clock;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${statusColors[deployment.status]}`} />
        <div>
          <p className="font-medium text-gray-900 capitalize">{deployment.status}</p>
          <p className="text-xs text-gray-500">
            {new Date(deployment.started_at).toLocaleString()}
          </p>
        </div>
      </div>
      {deployment.vercel_deployment_url && (
        <a
          href={deployment.vercel_deployment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:underline flex items-center gap-1"
        >
          View <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
