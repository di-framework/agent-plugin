import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergedCodexConfig, type ServerCommand } from '../install';
import type { AgentAdapter, InstallAsset, InstallContext } from '../manifest';

export class CodexAdapter implements AgentAdapter {
  readonly name = 'codex';
  detected(base: string, global: boolean): boolean {
    return [join(base, '.codex'), this.configPath(base, global)].some((path) => existsSync(path));
  }
  configPath(base: string, _global: boolean): string {
    return join(base, '.codex/config.toml');
  }
  mergeConfig(filePath: string, server: ServerCommand): string {
    return mergedCodexConfig(filePath, server);
  }
  assets(context: InstallContext): InstallAsset[] {
    return [{ kind: 'skills', destination: join(context.base, '.agents/skills') }];
  }
}
