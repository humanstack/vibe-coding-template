import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthToken } from '@/hooks/useAuth';
import { projectsApi, deploymentsApi } from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Plus,
  Rocket,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import type { Project, Deployment } from '@/types';

export default function DashboardPage() {
  const { getToken } = useAuthToken();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return projectsApi.list(token);
    },
  });

  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deploymentsApi.list(token, 10);
    },
  });

  const projects = projectsData?.projects || [];
  const deployments = deploymentsData?.deployments || [];
  const isLoading = projectsLoading || deploymentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your projects and deployments
          </p>
        </div>
        <Link to="/deploy" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Deployment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Projects"
          value={projects.length}
          icon={FolderOpen}
        />
        <StatCard
          label="Deployed"
          value={projects.filter((p) => p.status === 'deployed').length}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Recent Deployments"
          value={deployments.length}
          icon={Rocket}
          color="purple"
        />
      </div>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          {projects.length > 0 && (
            <Link
              to="/deploy"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Deploy your first YAML specification to get started"
            action={
              <Link to="/deploy" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Deployments */}
      {deployments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Deployments
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {deployments.slice(0, 5).map((deployment) => (
                <DeploymentRow key={deployment.id} deployment={deployment} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'primary' | 'green' | 'purple';
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusConfig = {
    draft: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
    processing: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    deployed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  };

  const { icon: StatusIcon, color, bg } = statusConfig[project.status];

  return (
    <Link
      to={`/project/${project.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
          <StatusIcon className="w-3 h-3" />
          {project.status}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{project.tech_stack || 'React'}</span>
        {project.production_url && (
          <ExternalLink className="w-3 h-3" />
        )}
      </div>

      {project.security_score !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Security Score</span>
            <span
              className={`text-xs font-medium ${
                (project.security_score ?? 0) >= 85
                  ? 'text-green-600'
                  : (project.security_score ?? 0) >= 70
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {project.security_score ?? 0}/100
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

function DeploymentRow({ deployment }: { deployment: Deployment }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-500' },
    validating: { icon: Clock, color: 'text-blue-500' },
    generating: { icon: Clock, color: 'text-blue-500' },
    auditing: { icon: AlertTriangle, color: 'text-yellow-500' },
    packaging: { icon: Clock, color: 'text-blue-500' },
    uploading: { icon: Clock, color: 'text-blue-500' },
    building: { icon: Clock, color: 'text-blue-500' },
    deploying: { icon: Rocket, color: 'text-purple-500' },
    success: { icon: CheckCircle, color: 'text-green-500' },
    failed: { icon: XCircle, color: 'text-red-500' },
  };

  const { icon: StatusIcon, color } = statusConfig[deployment.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(deployment.started_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {deployment.vercel_deployment_url && (
        <a
          href={deployment.vercel_deployment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
}
