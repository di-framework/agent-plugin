/** Published @di-framework/core releases the generated code is compiled and tested against. */
export const SCAFFOLD_VERSIONS = ['6.0.3', '6.0.1'] as const;

/** Generate code verified against the published @di-framework/core release. */
export function scaffoldProvider(serviceName: string, lifecycle = 'Singleton', frameworkVersion: string = SCAFFOLD_VERSIONS[0]): string {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(serviceName) || serviceName === 'Container') {
    throw new Error('serviceName must be a PascalCase identifier other than Container');
  }
  const version = frameworkVersion.replace(/^v/, '');
  if (!(SCAFFOLD_VERSIONS as readonly string[]).includes(version)) {
    throw new Error(`Unsupported framework version: ${frameworkVersion}. Scaffold supports ${SCAFFOLD_VERSIONS.join(', ')}; inspect the target project resolved version first.`);
  }
  if (lifecycle !== 'Singleton' && lifecycle !== 'Transient') {
    throw new Error('Supported lifecycles: Singleton and Transient. Use an explicitly configured fork for isolated containers.');
  }
  const options = lifecycle === 'Transient' ? '{ singleton: false }' : '';
  return `// Verified with @di-framework/core ${version}. Requires "experimentalDecorators": true.
import { Container } from '@di-framework/core/decorators';

/**
 * ${serviceName}: one responsibility. Declare required collaborators as constructor parameters:
 *   constructor(@Component(UserRepository) private readonly users: UserRepository) {}
 * The container creates and wires it; resolve it only at an entry point.
 */
@Container(${options})
export class ${serviceName} {}
`;
}
