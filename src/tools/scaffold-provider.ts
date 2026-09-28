/** Generate code verified against the published @di-framework/core release. */
export function scaffoldProvider(serviceName: string, lifecycle = 'Singleton', frameworkVersion = '6.0.1'): string {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(serviceName) || serviceName === 'Container') {
    throw new Error('serviceName must be a PascalCase identifier other than Container');
  }
  if (frameworkVersion.replace(/^v/, '') !== '6.0.1') {
    throw new Error(`Unsupported framework version: ${frameworkVersion}. Scaffold supports 6.0.1; inspect the target project resolved version first.`);
  }
  if (lifecycle !== 'Singleton' && lifecycle !== 'Transient') {
    throw new Error('Supported lifecycles: Singleton and Transient. Use an explicitly configured fork for isolated containers.');
  }
  return `// Verified with @di-framework/core 6.0.1.
import { Container } from '@di-framework/core';

export class ${serviceName} {
  // Add domain methods and inject dependencies with @Component or an explicit factory.
}

export function register${serviceName}(container: Container): Container {
  return container.register(${serviceName}, { singleton: ${lifecycle === 'Singleton'} });
}
`;
}
