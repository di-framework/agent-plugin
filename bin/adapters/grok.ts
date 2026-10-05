import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergedGrokConfig, type ServerCommand } from '../install';
import type { AgentAdapter, InstallAsset, InstallContext } from '../manifest';

export class GrokAdapter implements AgentAdapter {
  readonly name = 'grok';
  detected(base: string, global: boolean): boolean {
    return [join(base, '.grok'), this.configPath(base, global)].some((path) => existsSync(path));
  }
  configPath(base: string, _global: boolean): string {
    return join(base, '.grok/config.toml');
  }
  mergeConfig(filePath: string, server: ServerCommand): string {
    return mergedGrokConfig(filePath, server);
  }
  assets(context: InstallContext): InstallAsset[] {
    return [
      { kind: 'skills', destination: join(context.base, '.grok/skills') },
      { kind: 'rule', destination: join(context.base, '.grok/rules'), filename: 'di-framework.md', render: (source) => source },
    ];
  }
}
