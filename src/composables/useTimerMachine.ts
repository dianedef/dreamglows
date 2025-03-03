import { useInterpret, useSelector } from '@xstate/vue';
import { createTimerMachine } from '../machines/timerMachine';
import { computed, onUnmounted } from 'vue';
import type { TimerMachineContext, TimerMachineEvents } from '../machines/timerMachine.typegen';

interface TimerProps {
  duration: number;
  onComplete?: () => boolean;
}

export function useTimerMachine(props: TimerProps) {
  const timerMachine = createTimerMachine(props.duration);
  const timerService = useInterpret(timerMachine, {
    actions: {
      startTimer: (context: TimerMachineContext) => {
        const interval = setInterval(() => {
          if (context.timeLeft <= 1) {
            timerService.send({ type: 'COMPLETE' });
            const shouldReset = props.onComplete?.() ?? false;
            if (shouldReset) {
              timerService.send({ type: 'TOGGLE' });
            }
          } else {
            timerService.send({ type: 'TICK' });
          }
        }, 1000);

        // Store interval ID in the service's meta
        timerService.meta = { interval };
      },
      stopTimer: () => {
        if (timerService.meta?.interval) {
          clearInterval(timerService.meta.interval);
        }
      },
    },
  });

  // Selectors
  const timeLeft = useSelector(timerService, (state) => state.context.timeLeft);
  const isRunning = useSelector(timerService, (state) => state.matches('running'));
  const isResetting = useSelector(timerService, (state) => state.context.isResetting);

  // Actions
  const toggleTimer = () => timerService.send({ type: 'TOGGLE' });
  const reset = () => timerService.send({ type: 'RESET' });

  // Computed
  const timerClasses = computed(() => ({
    'text-3xl font-mono w-full text-center sm:w-24 transition-all duration-300': true,
    'scale-110 text-primary': isResetting.value,
  }));

  // Cleanup
  onUnmounted(() => {
    if (timerService.meta?.interval) {
      clearInterval(timerService.meta.interval);
    }
  });

  return {
    timeLeft,
    isRunning,
    isResetting,
    timerClasses,
    toggleTimer,
    reset,
  };
} 