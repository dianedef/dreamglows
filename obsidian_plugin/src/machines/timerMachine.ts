import { createMachine, assign } from 'xstate';

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdKiANmAMQAqA8gOKUAyAogNoAMAuoqAA4D2sqaXAO3YgAHogCsADgBsOACzSmARgDsAZnEAmdWrniANCACeiSUvlNdS7dMUqpAXweG0mXPiLEASnQDKdUmY2JBBuXn4hELEEFSVxHA1NTTVNAE45SyUswxMEJWk1BKUze0k1JiZpJSZNJxcMbBwsAFcBAVQBKDIqWkZWYTC+VEFhaM1pTRwmWIqVVLLxaxzETWUcVMWVJjM1aVT7JTU6kFdGlraOrp9-QP6QwYjRlYmpmen5jSXjFa0puUk0pJJCpgeoQcdTrhzu1OmQAJIAYQA0kEBjwhiMooglHIEpIKrYVHoNspVMsEBt1tMtppJKliuJ6bVnCcGlDWjCugjyABZAAK9FIfWCnHRjyxCHGk2m1XeCy+uTU6Smams4iVOkU0ghbJwAGMuOgOERkJBiCJYMgAIamnBWgBmpqwAApykwAJTESH6w3GsCmiCo+5i4aRUDRcQKHAqFTjVKpPaaPR7ckZVIqtXiSwA8ra44CLgQODCSFo8Khp4IAC0akKVXjtc0kaYcnmknJVfi8e7yWk6gU4zz9TceEIYDLGLDokQsfT9Lp6Sq4kjMfJaXMtIyQJxdKJth1I+hlwn4vDiDkKnJGjnyVVtKYi1rGwPjQNRpNkBPFYlcji8jURIggmVQTOqqblNGfYtikcgaFUsFOE4QA */
    tsTypes: {} as import('./timerMachine.typegen').Typegen0,
    schema: {
      context: {} as {
        duration: number;
        timeLeft: number;
        isResetting: boolean;
      },
      events: {} as
        | { type: 'TOGGLE' }
        | { type: 'RESET' }
        | { type: 'TICK' }
        | { type: 'COMPLETE' },
    },
    id: 'timer',
    initial: 'idle',
    context: {
      duration: 0,
      timeLeft: 0,
      isResetting: false,
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
        entry: 'startTimer',
        exit: 'stopTimer',
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
            actions: ['resetTimer', 'setResetting'],
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
        timeLeft: (context) => context.timeLeft - 1,
      }),
      resetTimer: assign({
        timeLeft: (context) => context.duration,
      }),
      setResetting: assign({
        isResetting: () => true,
      }),
      clearResetting: assign({
        isResetting: () => false,
      }),
    },
    guards: {
      hasTimeLeft: (context) => context.timeLeft > 1,
    },
  },
);

export const createTimerMachine = (initialDuration: number) => {
  return timerMachine.withContext({
    duration: initialDuration,
    timeLeft: initialDuration,
    isResetting: false,
  });
}; 