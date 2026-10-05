import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergedMcpConfig, type ServerCommand } from '../install';
import type { AgentAdapter, InstallAsset, InstallContext } from '../manifest';

export class CursorAdapter implements AgentAdapter {
  readonly name = 'cursor';
  detected(base: string, _global: boolean): boolean {
    return [join(base, '.cursor'), join(base, '.cursorrules')].some((path) => existsSync(path));
  }
  configPath(base: string, _global: boolean): string {
    return join(base, '.cursor/mcp.json');
  }
  mergeConfig(filePath: string, server: ServerCommand): string {
    return mergedMcpConfig(filePath, server);
  }
  assets(context: InstallContext): InstallAsset[] {
    const skills: InstallAsset = { kind: 'skills', destination: join(context.base, '.cursor/skills') };
    if (context.global) return [skills];
    return [skills, {
      kind: 'rule',
      destination: join(context.base, '.cursor/rules'),
      filename: 'di-framework.mdc',
      render: (source) => `---\ndescription: di-framework workflow\nglobs: *\nalwaysApply: true\n---\n\n${source}`,
    }];
  }
}
