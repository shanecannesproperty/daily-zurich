// Tiny pub/sub for app-wide failures surfaced via FailureBanner.
import { useEffect, useState } from "react";

export type Failure = {
  message: string;
  context: string;
  retry?: () => void | Promise<void>;
  at: number;
};

let current: Failure | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function setFailure(input: {
  message: string;
  context: string;
  retry?: () => void | Promise<void>;
}) {
  current = { ...input, at: Date.now() };
  if (typeof console !== "undefined") {
    console.error(`[failure] ${input.context}: ${input.message}`);
  }
  emit();
}

export function clearFailure() {
  current = null;
  emit();
}

export function getFailure() {
  return current;
}

export function useFailure(): Failure | null {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}
