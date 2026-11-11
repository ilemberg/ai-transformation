export type JobStatus = "success" | "running" | "queued" | "failure";

/** Small round status marks in the style of a CI run: done, running, waiting, failed. */
export function StatusIcon({ status, className = "h-4 w-4" }: { status: JobStatus; className?: string }) {
  if (status === "success") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} shrink-0`} aria-label="Done" role="img">
        <circle cx="8" cy="8" r="8" className="fill-pass" />
        <path d="M4.5 8.2 7 10.6l4.6-5" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "failure") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} shrink-0`} aria-label="Failed" role="img">
        <circle cx="8" cy="8" r="8" className="fill-fail" />
        <path d="m5.3 5.3 5.4 5.4m0-5.4-5.4 5.4" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "running") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} shrink-0`} aria-label="In progress" role="img">
        <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="2" className="stroke-running/30" />
        <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" strokeWidth="2" strokeLinecap="round" className="spin stroke-running" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0`} aria-label="Waiting" role="img">
      <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="1.5" className="stroke-edge-2" />
    </svg>
  );
}

/** A tone mark for one log line. */
export function LineIcon({ tone }: { tone?: "pass" | "fail" | "warn" | "info" }) {
  if (tone === "pass") return <StatusIcon status="success" className="h-3.5 w-3.5" />;
  if (tone === "fail") return <StatusIcon status="failure" className="h-3.5 w-3.5" />;
  if (tone === "warn") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-label="Attention" role="img">
        <path d="M8 1.2 15.2 14H.8Z" className="fill-warn" />
        <path d="M8 6v3.6M8 11.6v.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="2.5" className="fill-edge-2" />
    </svg>
  );
}
