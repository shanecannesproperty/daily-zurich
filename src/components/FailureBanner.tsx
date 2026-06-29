import { useState } from "react";
import { clearFailure, useFailure } from "@/lib/failure-store";

export function FailureBanner() {
  const failure = useFailure();
  const [retrying, setRetrying] = useState(false);
  if (!failure) return null;

  return (
    <div
      role="alert"
      className="border-b-2 border-[var(--ink-red)] bg-[var(--surface)] text-[var(--ink)]"
    >
      <div className="container-news py-2 flex flex-wrap items-start justify-between gap-3 text-sm">
        <div className="min-w-0 flex-1">
          <span className="kicker mr-2" style={{ color: "var(--ink-red)" }}>
            Something broke
          </span>
          <span className="font-serif">{failure.message}</span>
          <div className="mt-0.5 text-xs opacity-75">
            <span className="meta uppercase tracking-widest mr-1">where</span>
            <code className="font-mono">{failure.context}</code>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {failure.retry ? (
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                if (!failure.retry) return;
                setRetrying(true);
                try {
                  await failure.retry();
                  clearFailure();
                } finally {
                  setRetrying(false);
                }
              }}
              className="btn-primary text-xs px-3 py-1"
            >
              {retrying ? "Retrying" : "Retry"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearFailure}
            className="text-xs underline underline-offset-2"
            aria-label="Dismiss error banner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
