"use client";

import { useEffect, useReducer } from "react";
import { REPLAY_START, replayReducer, type ReplayAction, type ReplayState } from "../logic";

/** A replay of `total` events that advances every `intervalMs` while playing. */
export function useReplay(total: number, intervalMs = 1100, initial: ReplayState = REPLAY_START) {
  const [state, dispatch] = useReducer((s: ReplayState, a: ReplayAction) => replayReducer(s, a, total), initial);

  useEffect(() => {
    if (!state.playing) return;
    const t = setInterval(() => dispatch("tick"), intervalMs);
    return () => clearInterval(t);
  }, [state.playing, intervalMs]);

  return {
    shown: state.shown,
    playing: state.playing,
    atEnd: state.shown >= total,
    atStart: state.shown === 0,
    toggle: () => dispatch(state.playing ? "pause" : "play"),
    step: () => dispatch("step"),
    reset: () => dispatch("reset"),
  };
}
