import { assign, createMachine } from 'xstate';

interface TimerContext {
  duration: number;
  timeLeft: number;
  isResetting: boolean;
}

type TimerEvent =
  | { type: 'TOGGLE' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'COMPLETE' };

export const createTimerMachine = (initialDuration: number) =>
  createMachine(
    {
      context: {
        duration: initialDuration,
        timeLeft: initialDuration,
        isResetting: false,
      },
      id: 'timer',
      initial: 'idle',
      types: {
        context: {} as TimerContext,
        events: {} as TimerEvent,
      },
      states: {
        idle: {
          on: {
            TOGGLE: 'running',
            RESET: {
              actions: ['resetTimer', 'setResetting'],
            },
          },
        },
        running: {
          on: {
            TOGGLE: 'idle',
            RESET: {
              target: 'idle',
              actions: ['resetTimer', 'setResetting'],
            },
            TICK: {
              actions: 'decrementTime',
              guard: 'hasTimeLeft',
            },
            COMPLETE: {
              target: 'completed',
              actions: ['setResetting'],
            },
          },
        },
        completed: {
          after: {
            300: {
              target: 'idle',
              actions: 'clearResetting',
            },
          },
        },
      },
    },
    {
      actions: {
        decrementTime: assign({
          timeLeft: ({ context }) => context.timeLeft - 1,
        }),
        resetTimer: assign({
          timeLeft: ({ context }) => context.duration,
          isResetting: () => false,
        }),
        setResetting: assign({
          isResetting: () => true,
        }),
        clearResetting: assign({
          isResetting: () => false,
        }),
      },
      guards: {
        hasTimeLeft: ({ context }) => context.timeLeft > 1,
      },
    }
  );
