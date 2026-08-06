// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.after(300)#timer.completed": {
      type: "xstate.after(300)#timer.completed";
    };
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {};
  missingImplementations: {
    actions: "startTimer" | "stopTimer";
    delays: never;
    guards: never;
    services: never;
  };
  eventsCausingActions: {
    clearResetting: "xstate.after(300)#timer.completed";
    decrementTime: "TICK";
    resetTimer: "COMPLETE" | "RESET";
    setResetting: "COMPLETE" | "RESET";
    startTimer: "TOGGLE";
    stopTimer: "COMPLETE" | "RESET" | "TOGGLE" | "xstate.stop";
  };
  eventsCausingDelays: {};
  eventsCausingGuards: {
    hasTimeLeft: "TICK";
  };
  eventsCausingServices: {};
  matchesStates: "completed" | "idle" | "running";
  tags: never;
}
