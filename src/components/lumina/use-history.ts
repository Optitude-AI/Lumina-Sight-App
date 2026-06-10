"use client";

import { useRef, useCallback, useState } from "react";
import type { AnalysisMode } from "./image-analyzer";
import type { GuideConfig } from "./guide-renderer";
import type { ToneCurveConfig } from "./tone-editor";

export interface HistorySnapshot {
  toneConfig: ToneCurveConfig;
  guideConfig: GuideConfig;
  analysisMode: AnalysisMode;
  opacity: number;
  sensitivity: number;
  compareMode: "original" | "analysis";
  analysisActive: boolean;
  guidesActive: boolean;
}

const MAX_HISTORY = 50;

export function useHistory() {
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const lastPushedRef = useRef<string>("");

  const snapshotToKey = (s: HistorySnapshot): string => {
    return JSON.stringify(s);
  };

  const push = useCallback(
    (state: HistorySnapshot) => {
      const key = snapshotToKey(state);
      // Only push if state actually changed
      if (key === lastPushedRef.current) return;
      lastPushedRef.current = key;

      setPast((prev) => {
        const newPast = [...prev, state];
        if (newPast.length > MAX_HISTORY) {
          newPast.shift();
        }
        return newPast;
      });
      // Clear future on new push
      setFuture([]);
    },
    []
  );

  const undo = useCallback(
    (currentState: HistorySnapshot): HistorySnapshot | null => {
      if (past.length === 0) return null;
      const newPast = [...past];
      const previous = newPast.pop()!;
      setPast(newPast);
      setFuture((prev) => [...prev, currentState]);
      lastPushedRef.current = snapshotToKey(previous);
      return previous;
    },
    [past]
  );

  const redo = useCallback(
    (currentState: HistorySnapshot): HistorySnapshot | null => {
      if (future.length === 0) return null;
      const newFuture = [...future];
      const next = newFuture.pop()!;
      setFuture(newFuture);
      setPast((prev) => [...prev, currentState]);
      lastPushedRef.current = snapshotToKey(next);
      return next;
    },
    [future]
  );

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
    lastPushedRef.current = "";
  }, []);

  return { push, undo, redo, canUndo, canRedo, reset };
}
