import { inject, type InjectionKey } from 'vue';
import type { PathCommandPort } from '@/domain/path/command-port';

export const PATH_COMMAND_PORT_KEY: InjectionKey<PathCommandPort> = Symbol('dreamglows-path-command-port');

export function usePathCommandPort(): PathCommandPort {
  const port = inject(PATH_COMMAND_PORT_KEY);
  if (!port) throw new Error('Chemin command port is unavailable');
  return port;
}
