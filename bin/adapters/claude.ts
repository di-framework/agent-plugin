import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergedMcpConfig, type ServerCommand } from '../install';
import type { AgentAdapter, InstallAsset, InstallContext } from '../manifest';

export class ClaudeAdapter implements AgentAdapter {
  readonly name = 'claude';
  readonly label = 'claude (Claude Code)';
  detected(base: string, global: boolean): boolean {
    return [join(base, '.claude'), this.configPath(base, global)].some((path) => existsSync(path));
  }
  configPath(base: string, global: boolean): string {
    return join(base, global ? '.claude.json' : '.mcp.json');
  }
  mergeConfig(filePath: string, server: ServerCommand): string {
    return mergedMcpConfig(filePath, server);
  }
  assets(context: InstallContext): InstallAsset[] {
    return [{ kind: 'skills', destination: join(context.base, '.claude/skills') }];
  }
}
