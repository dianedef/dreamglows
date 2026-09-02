import { inject, type InjectionKey } from 'vue';
import type { Pinia } from 'pinia';
import type { PathCommandPort } from '@/domain/path/command-port';

export interface DreamGlowsUiContext { pinia: Pinia; pathCommands: PathCommandPort }
export const DREAMGLOWS_UI_CONTEXT_KEY: InjectionKey<DreamGlowsUiContext> = Symbol('dreamglows-ui-context');
export function useDreamGlowsUiContext(): DreamGlowsUiContext { const context=inject(DREAMGLOWS_UI_CONTEXT_KEY); if(!context) throw new Error('DreamGlows UI context is unavailable'); return context; }
