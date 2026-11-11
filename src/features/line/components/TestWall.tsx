import { testState, type Cursor, type TestState } from "../logic";
import { TEST_KINDS } from "../stations";
import type { Ticket } from "../types";
import { Panel, SectionLabel } from "./ui";

const STYLE: Record<TestState, { box: string; label: string; mark: string }> = {
  na: { box: "border-edge/60 bg-transparent opacity-40", label: "not needed", mark: "–" },
  none: { box: "border-dashed border-edge-2 bg-transparent", label: "not written", mark: "○" },
  red: { box: "border-fail/60 bg-fail/10 shadow-[inset_0_0_20px_rgb(248_113_113/0.12)]", label: "failing", mark: "✗" },
  green: { box: "border-pass/60 bg-pass/10 shadow-[inset_0_0_20px_rgb(52_211_153/0.12)]", label: "passing", mark: "✓" },
};

const MARK_COLOR: Record<TestState, string> = {
  na: "text-faint",
  none: "text-faint",
  red: "text-fail",
  green: "text-pass",
};

/** Every kind of test, and whether it exists, fails or passes at this point on the line. */
export function TestWall({ ticket, cursor }: { ticket: Ticket; cursor: Cursor }) {
  const rows = TEST_KINDS.map((kind) => ({ kind, state: testState(ticket, kind.id, cursor), tests: ticket.tests[kind.id] }));
  const written = rows.filter((r) => r.state === "red" || r.state === "green");
  const total = written.reduce((sum, r) => sum + (r.tests?.count ?? 0), 0);
  const passing = rows.filter((r) => r.state === "green").reduce((sum, r) => sum + (r.tests?.count ?? 0), 0);

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionLabel>The test wall</SectionLabel>
          <h3 className="mt-1 text-lg font-semibold">Written before the code, red until it works</h3>
        </div>
        <div className="font-mono text-sm tabular-nums">
          <span className="text-pass">{passing}</span>
          <span className="text-faint"> / {total} passing</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map(({ kind, state, tests }) => {
          const s = STYLE[state];
          return (
            <div
              key={kind.id}
              title={kind.proves}
              className={`flex min-w-0 flex-col gap-1 rounded-lg border p-2.5 transition-all duration-500 ${s.box}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[13px] font-semibold">{kind.name}</span>
                <span className={`font-mono text-sm ${MARK_COLOR[state]}`} aria-hidden>
                  {s.mark}
                </span>
              </div>
              <span className="font-mono text-[11px] text-dim">
                {tests && state !== "na" ? `${tests.count} ${tests.unit}` : "—"}
              </span>
              <span className={`text-[11px] ${MARK_COLOR[state]}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-faint">
        Hover a tile for what it proves. Kinds a ticket does not need are skipped on purpose: a payments fix gets no
        evals, a speed fix gets no accessibility pass.
      </p>
    </Panel>
  );
}
