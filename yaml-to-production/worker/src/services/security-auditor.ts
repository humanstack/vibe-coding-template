import { GeneratedFile, SecurityAuditResult, SecurityIssue } from '../types/env';

export class SecurityAuditorService {
  private static readonly SECRET_PATTERNS = [
    { pattern: /sk_live_[a-zA-Z0-9]+/gi, name: 'Stripe Live Secret Key' },
    { pattern: /sk_test_[a-zA-Z0-9]+/gi, name: 'Stripe Test Secret Key' },
    { pattern: /sk-[a-zA-Z0-9]{32,}/gi, name: 'OpenAI API Key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/gi, name: 'GitHub Personal Access Token' },
    { pattern: /gho_[a-zA-Z0-9]{36}/gi, name: 'GitHub OAuth Token' },
    { pattern: /github_pat_[a-zA-Z0-9_]{22,}/gi, name: 'GitHub Fine-grained Token' },
    { pattern: /xox[baprs]-[a-zA-Z0-9-]+/gi, name: 'Slack Token' },
    { pattern: /AKIA[0-9A-Z]{16}/gi, name: 'AWS Access Key ID' },
    { pattern: /AIza[0-9A-Za-z_-]{35}/gi, name: 'Google API Key' },
    { pattern: /ya29\.[0-9A-Za-z_-]+/gi, name: 'Google OAuth Token' },
    { pattern: /[a-f0-9]{32}/gi, name: 'Potential API Key (32 char hex)' },
    { pattern: /-----BEGIN (RSA |OPENSSH |DSA |EC )?PRIVATE KEY-----/gi, name: 'Private Key' },
    { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi, name: 'JWT Token' },
  ];

  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /eval\s*\(/gi, description: 'Use of eval() - can lead to code injection', severity: 'critical' as const },
    { pattern: /innerHTML\s*=/gi, description: 'Direct innerHTML assignment - potential XSS vulnerability', severity: 'high' as const },
    { pattern: /document\.write\s*\(/gi, description: 'Use of document.write() - potential XSS vulnerability', severity: 'high' as const },
    { pattern: /dangerouslySetInnerHTML/gi, description: 'Use of dangerouslySetInnerHTML - ensure content is sanitized', severity: 'medium' as const },
    { pattern: /new Function\s*\(/gi, description: 'Dynamic function creation - can lead to code injection', severity: 'critical' as const },
    { pattern: /exec\s*\(/gi, description: 'Use of exec() - potential command injection', severity: 'critical' as const },
    { pattern: /execSync\s*\(/gi, description: 'Use of execSync() - potential command injection', severity: 'critical' as const },
    { pattern: /child_process/gi, description: 'Use of child_process - review for command injection', severity: 'high' as const },
    { pattern: /require\s*\(\s*[^'"]/gi, description: 'Dynamic require() - can lead to path traversal', severity: 'high' as const },
    { pattern: /\.env/gi, description: 'Reference to .env file - ensure not committed', severity: 'low' as const },
    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, description: 'Hardcoded password detected', severity: 'critical' as const },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, description: 'Hardcoded secret detected', severity: 'critical' as const },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, description: 'Hardcoded API key detected', severity: 'critical' as const },
  ];

  private static readonly CORS_PATTERNS = [
    { pattern: /Access-Control-Allow-Origin['":\s]*\*/gi, description: 'Wildcard CORS origin - consider restricting', severity: 'medium' as const },
    { pattern: /cors\s*\(\s*\)/gi, description: 'CORS enabled without configuration - review settings', severity: 'low' as const },
  ];

  private static readonly INPUT_VALIDATION_PATTERNS = [
    { pattern: /req\.body\./gi, description: 'Direct use of request body - ensure validation', severity: 'low' as const },
    { pattern: /req\.params\./gi, description: 'Direct use of URL params - ensure validation', severity: 'low' as const },
    { pattern: /req\.query\./gi, description: 'Direct use of query params - ensure validation', severity: 'low' as const },
    { pattern: /\$\{.*\}/gi, description: 'Template literal - ensure proper escaping for SQL/HTML', severity: 'low' as const },
  ];

  /**
   * Perform a comprehensive security audit on generated files
   */
  audit(files: GeneratedFile[]): SecurityAuditResult {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let totalScore = 100;

    // Audit each file
    for (const file of files) {
      if (file.type === 'config' && file.path.includes('.gitignore')) {
        continue; // Skip gitignore
      }

      const fileIssues = this.auditFile(file);
      issues.push(...fileIssues);
    }

    // Calculate score based on issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          totalScore -= 25;
          break;
        case 'high':
          totalScore -= 15;
          break;
        case 'medium':
          totalScore -= 5;
          break;
        case 'low':
          totalScore -= 2;
          break;
      }
    }

    // Ensure score doesn't go below 0
    totalScore = Math.max(0, totalScore);

    // Add general recommendations
    recommendations.push(...this.generateRecommendations(files, issues));

    // Check for security best practices
    const bestPracticesIssues = this.checkBestPractices(files);
    if (bestPracticesIssues.length > 0) {
      recommendations.push(...bestPracticesIssues);
    }

    return {
      score: totalScore,
      passed: totalScore >= 70 && !issues.some(i => i.severity === 'critical'),
      issues,
      recommendations
    };
  }

  /**
   * Audit a single file for security issues
   */
  private auditFile(file: GeneratedFile): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = file.content.split('\n');

    // Check for exposed secrets
    for (const { pattern, name } of SecurityAuditorService.SECRET_PATTERNS) {
      const matches = file.content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.findLineNumber(file.content, match.index || 0);
        issues.push({
          severity: 'critical',
          type: 'exposed_secret',
          description: `Potential ${name} exposed in code`,
          file: file.path,
          line: lineNumber,
          recommendation: 'Move secret to environment variables and use secret management'
        });
      }
    }

    // Check for dangerous patterns
    for (const { pattern, description, severity } of SecurityAuditorService.DANGEROUS_PATTERNS) {
      const matches = file.content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.findLineNumber(file.content, match.index || 0);
        issues.push({
          severity,
          type: 'dangerous_pattern',
          description,
          file: file.path,
          line: lineNumber,
          recommendation: this.getRecommendationForPattern(pattern.source)
        });
      }
    }

    // Check for CORS issues
    for (const { pattern, description, severity } of SecurityAuditorService.CORS_PATTERNS) {
      const matches = file.content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.findLineNumber(file.content, match.index || 0);
        issues.push({
          severity,
          type: 'cors_config',
          description,
          file: file.path,
          line: lineNumber,
          recommendation: 'Configure CORS to allow only trusted origins'
        });
      }
    }

    // Check for input validation (info only)
    if (file.type === 'source' && (file.path.includes('/api/') || file.path.includes('/routes/'))) {
      for (const { pattern, description, severity } of SecurityAuditorService.INPUT_VALIDATION_PATTERNS) {
        const matches = file.content.matchAll(pattern);
        for (const match of matches) {
          const lineNumber = this.findLineNumber(file.content, match.index || 0);
          issues.push({
            severity,
            type: 'input_validation',
            description,
            file: file.path,
            line: lineNumber,
            recommendation: 'Use a validation library like Zod or Joi to validate input'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find line number for a character index
   */
  private findLineNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  /**
   * Get recommendation for a specific pattern
   */
  private getRecommendationForPattern(pattern: string): string {
    const recommendations: Record<string, string> = {
      'eval': 'Avoid eval() - use JSON.parse() for JSON data or safer alternatives',
      'innerHTML': 'Use textContent or sanitize HTML with DOMPurify before using innerHTML',
      'document.write': 'Use DOM manipulation methods instead of document.write()',
      'dangerouslySetInnerHTML': 'Sanitize content with DOMPurify before using dangerouslySetInnerHTML',
      'new Function': 'Avoid dynamic function creation - use static functions instead',
      'exec': 'Validate and sanitize all inputs before using exec/execSync',
      'child_process': 'Validate and sanitize all inputs, use parameterized commands',
      'require': 'Use static imports or validate paths before dynamic require',
      'password': 'Use environment variables for secrets, never hardcode credentials',
      'secret': 'Use environment variables or secret management services',
      'api': 'Store API keys in environment variables, not in code'
    };

    for (const [key, recommendation] of Object.entries(recommendations)) {
      if (pattern.toLowerCase().includes(key)) {
        return recommendation;
      }
    }

    return 'Review this code pattern for security implications';
  }

  /**
   * Generate general recommendations based on audit findings
   */
  private generateRecommendations(files: GeneratedFile[], issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];

    // Check for .env.example
    if (!files.some(f => f.path.includes('.env.example'))) {
      recommendations.push('Add a .env.example file to document required environment variables');
    }

    // Check for .gitignore
    const gitignore = files.find(f => f.path === '.gitignore');
    if (!gitignore) {
      recommendations.push('Add a .gitignore file to prevent committing sensitive files');
    } else if (!gitignore.content.includes('.env')) {
      recommendations.push('Ensure .env files are included in .gitignore');
    }

    // Check for TypeScript strict mode
    const tsconfig = files.find(f => f.path === 'tsconfig.json');
    if (tsconfig && !tsconfig.content.includes('"strict": true')) {
      recommendations.push('Enable TypeScript strict mode for better type safety');
    }

    // Add recommendations based on issue types
    const issueTypes = new Set(issues.map(i => i.type));

    if (issueTypes.has('input_validation')) {
      recommendations.push('Implement comprehensive input validation using Zod or similar library');
    }

    if (issueTypes.has('cors_config')) {
      recommendations.push('Configure CORS with specific allowed origins for production');
    }

    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('URGENT: Address all critical security issues before deployment');
    }

    // General security recommendations
    recommendations.push('Consider implementing Content Security Policy (CSP) headers');
    recommendations.push('Use HTTPS in production for all API communications');
    recommendations.push('Implement rate limiting for API endpoints');

    return recommendations;
  }

  /**
   * Check for security best practices
   */
  private checkBestPractices(files: GeneratedFile[]): string[] {
    const recommendations: string[] = [];

    // Check for authentication in API routes
    const apiFiles = files.filter(f => f.path.includes('/api/') || f.path.includes('/routes/'));
    for (const file of apiFiles) {
      if (!file.content.includes('auth') && !file.content.includes('token') && !file.content.includes('session')) {
        recommendations.push(`Review ${file.path} - consider adding authentication middleware`);
      }
    }

    // Check for error handling
    const sourceFiles = files.filter(f => f.type === 'source');
    for (const file of sourceFiles) {
      if (file.content.includes('fetch(') && !file.content.includes('catch')) {
        recommendations.push(`Add error handling for fetch calls in ${file.path}`);
      }
    }

    return recommendations;
  }

  /**
   * Quick validation check for YAML content (pre-generation)
   */
  validateYamlSecurity(yamlContent: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for exposed secrets in YAML
    for (const { pattern, name } of SecurityAuditorService.SECRET_PATTERNS) {
      if (pattern.test(yamlContent)) {
        issues.push({
          severity: 'critical',
          type: 'exposed_secret',
          description: `Potential ${name} detected in YAML specification`,
          recommendation: 'Remove secrets from YAML - configure them during deployment instead'
        });
      }
    }

    return issues;
  }
}
