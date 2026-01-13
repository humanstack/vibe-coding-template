import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Rocket,
  Shield,
  Zap,
  Code,
  ArrowRight,
  CheckCircle,
  Github,
  Twitter,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-semibold text-gray-900">Prototype Cafe</span>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              ) : (
                <button onClick={login} className="btn-primary">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            YAML to Production in Minutes
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your Ideas into
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
              Production Apps
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Define your application in YAML, let AI generate the code, and deploy
            to production instantly. No complex setup, no technical barriers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/deploy" className="btn-primary btn-lg">
                <Rocket className="w-5 h-5 mr-2" />
                Start Deploying
              </Link>
            ) : (
              <button onClick={login} className="btn-primary btn-lg">
                <Rocket className="w-5 h-5 mr-2" />
                Start for Free
              </button>
            )}
            <a
              href="#features"
              className="btn-outline btn-lg"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Ship Fast
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From YAML specification to live production app in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Code}
              title="YAML-Driven Development"
              description="Define your app structure, features, and integrations in simple YAML. No coding required to get started."
            />
            <FeatureCard
              icon={Zap}
              title="AI-Powered Generation"
              description="Claude AI analyzes your spec and generates production-ready code with best practices built-in."
            />
            <FeatureCard
              icon={Shield}
              title="Security by Default"
              description="Automated security audits ensure your code is safe. Get a security score before every deployment."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number={1}
              title="Upload YAML"
              description="Drop your YAML specification or use our templates"
            />
            <StepCard
              number={2}
              title="Configure"
              description="Select integrations and enter your API keys"
            />
            <StepCard
              number={3}
              title="Review & Deploy"
              description="Check the generated code and deploy to Vercel"
            />
            <StepCard
              number={4}
              title="Go Live"
              description="Your app is live with a production URL"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Built for Speed and Security
              </h2>
              <ul className="space-y-4">
                {[
                  'Deploy in under 5 minutes',
                  'Automated security scanning',
                  'Production-ready code generation',
                  'Custom domain support',
                  'Environment management',
                  'One-click redeployments',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <pre className="text-gray-300 overflow-x-auto">
{`name: my-saas-app
type: fullstack
framework: react-vite

features:
  - name: Landing Page
    type: page
    description: Hero with CTA

  - name: Dashboard
    type: page
    description: User analytics

integrations:
  - type: auth
    provider: privy
  - type: database
    provider: supabase`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Ship Your Idea?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Join developers who are shipping faster with YAML-to-Production
          </p>
          {isAuthenticated ? (
            <Link to="/deploy" className="btn-primary btn-lg">
              <Rocket className="w-5 h-5 mr-2" />
              Deploy Now
            </Link>
          ) : (
            <button onClick={login} className="btn-primary btn-lg">
              <Rocket className="w-5 h-5 mr-2" />
              Get Started Free
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-accent-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-sm text-gray-600">
                © 2024 Prototype Cafe. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-gray-600">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-gray-50 rounded-xl">
      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
