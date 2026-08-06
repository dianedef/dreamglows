import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

interface TimerProps {
  duration: number
  onComplete?: () => boolean // Return true to auto-reset
}

export function useTimer(props: TimerProps) {
  const timeLeft = ref(props.duration)
  const isRunning = ref(false)
  const isResetting = ref(false)
  let interval: NodeJS.Timeout

  const startTimer = () => {
    if (timeLeft.value > 0) {
      interval = setInterval(() => {
        if (timeLeft.value <= 1) {
          isRunning.value = false
          const shouldReset = props.onComplete?.() ?? false
          if (shouldReset) {
            isRunning.value = true
          }
          isResetting.value = true
          setTimeout(() => isResetting.value = false, 300)
          timeLeft.value = props.duration
        } else {
          timeLeft.value--
        }
      }, 1000)
    }
  }

  const stopTimer = () => {
    clearInterval(interval)
  }

  const reset = () => {
    timeLeft.value = props.duration
    isRunning.value = false
    isResetting.value = true
    setTimeout(() => isResetting.value = false, 300)
  }

  const toggleTimer = () => {
    isRunning.value = !isRunning.value
  }

  watch(isRunning, (newValue) => {
    if (newValue) {
      startTimer()
    } else {
      stopTimer() 
    }
  })

  onUnmounted(() => {
    stopTimer()
  })

  const timerClasses = computed(() => {
    return {
      'text-3xl font-mono w-full text-center sm:w-24 transition-all duration-300': true,
      'scale-110 text-primary': isResetting.value
    }
  })

  return {
    timeLeft,
    isRunning,
    isResetting,
    timerClasses,
    toggleTimer,
    reset
  }
}

// Template usage example:
/*
<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div :class="timerClasses">
      {{ timeLeft }}s
    </div>
    <div class="flex gap-2 justify-center">
      <button
        class="h-12 px-4 flex items-center gap-2 transition-transform active:scale-95"
        @click="toggleTimer"
      >
        <template v-if="isRunning">
          <PauseIcon class="h-5 w-5" />
          <span>Pause</span>
        </template>
        <template v-else>
          <PlayIcon class="h-5 w-5" />
          <span>Start</span>
        </template>
      </button>
      <button
        class="h-12 px-4 flex items-center gap-2 transition-transform active:scale-95"
        @click="reset"
      >
        <RotateCcwIcon class="h-5 w-5" />
        <span>Reset</span>
      </button>
    </div>
  </div>
</template>
*/