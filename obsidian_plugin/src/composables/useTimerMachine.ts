import { computed, onUnmounted, watch } from 'vue';
import { useMachine, useSelector } from '@xstate/vue';
import { createTimerMachine } from '../machines/timerMachine';

interface TimerProps {
  duration: number;
  onComplete?: () => boolean;
}

export function useTimerMachine(props: TimerProps) {
  const timerMachine = createTimerMachine(props.duration);
  const { send, actorRef, snapshot } = useMachine(timerMachine);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const timeLeft = useSelector(actorRef, (state) => state.context.timeLeft);
  const isRunning = useSelector(actorRef, (state) => state.matches('running'));
  const isResetting = useSelector(actorRef, (state) => state.context.isResetting);

  const clearIntervalIfNeeded = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const startInterval = () => {
    clearIntervalIfNeeded();
    intervalId = setInterval(() => {
      send({ type: 'TICK' });
      if (snapshot.value.context.timeLeft <= 1) {
        send({ type: 'COMPLETE' });
        const shouldReset = props.onComplete?.() ?? false;
        if (shouldReset) {
          send({ type: 'TOGGLE' });
        }
      }
    }, 1000);
  };

  watch(
    isRunning,
    (running) => {
      if (running) {
        startInterval();
      } else {
        clearIntervalIfNeeded();
      }
    },
    { immediate: true }
  );

  const toggleTimer = () => send({ type: 'TOGGLE' });
  const reset = () => send({ type: 'RESET' });

  const timerClasses = computed(() => ({
    'text-3xl font-mono w-full text-center sm:w-24 transition-all duration-300': true,
    'scale-110 text-primary': isResetting.value,
  }));

  onUnmounted(() => {
    clearIntervalIfNeeded();
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
