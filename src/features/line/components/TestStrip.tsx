import { testState, type Cursor } from "../logic";
import { TEST_KINDS } from "../stations";
import type { Ticket } from "../types";
import { StatusIcon } from "./icons";

/** Every kind of test the ticket needs: not written yet, failing, or passing. */
export function TestStrip({ ticket, cursor }: { ticket: Ticket; cursor: Cursor }) {
  const kinds = TEST_KINDS.map((k) => ({ k, state: testState(ticket, k.id, cursor), tests: ticket.tests[k.id] })).filter(
    (r) => r.state !== "na",
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-dim">Tests</span>
      {kinds.map(({ k, state, tests }) => (
        <span
          key={k.id}
          title={`${k.name}: ${k.proves}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            state === "green"
              ? "border-pass/40 text-ink"
              : state === "red"
                ? "border-fail/40 text-ink"
                : "border-dashed border-edge text-faint"
          }`}
        >
          <StatusIcon
            status={state === "green" ? "success" : state === "red" ? "failure" : "queued"}
            className="h-3 w-3"
          />
          {k.name}
          <span className="font-mono text-faint">{tests?.count}</span>
        </span>
      ))}
    </div>
  );
}
