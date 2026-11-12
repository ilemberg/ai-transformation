import { IssueTypeIcon, type LozengeTone } from "@/features/line/components/jira";
import { TICKETS } from "@/features/line/tickets";
import { AMENDMENT, MEDIUM_USD_PER_M, RUN, RUN_STEPS, stepCost, type RunStep, type StepStatus } from "../data";
import { formatTokens, formatUsd } from "../logic";
import { ActorAvatar, ActorChip, Tone, actorName } from "./ui";

const STATUS: Record<StepStatus, { tone: LozengeTone; label: string }> = {
  ok: { tone: "success", label: "Done" },
  warn: { tone: "warning", label: "Failing" },
  proposed: { tone: "neutral", label: "Proposed" },
  rejected: { tone: "danger", label: "Rejected" },
  waiting: { tone: "purple", label: "Waiting" },
  approved: { tone: "success", label: "Approved" },
};

const MARK_ROW: Record<NonNullable<RunStep["mark"]>, string> = {
  locked: "border-l-fail",
  amend: "border-l-purple",
};

const ticket = TICKETS.find((t) => t.key === RUN.ticket)!;
const totalTokens = RUN_STEPS.reduce((s, x) => s + x.tokens, 0);
const totalCost = RUN_STEPS.reduce((s, x) => s + stepCost(x), 0);
const loops = new Set(RUN_STEPS.map((s) => /^Loop (\d)/.exec(s.step)?.[1]).filter(Boolean)).size;
const refusals = RUN_STEPS.filter((s) => s.status === "rejected").length;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="truncate font-medium">{children}</dd>
    </div>
  );
}

export function RunRecord() {
  return (
    <div>
      <div className="rounded-md border border-edge bg-panel-2 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-semibold">{RUN.id}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
            <IssueTypeIcon kind={ticket.kind} />
            <span className="whitespace-nowrap font-medium text-brand">{ticket.key}</span>
            <span className="truncate text-dim">{ticket.title}</span>
          </span>
          <span className="ml-auto">
            <Tone tone="success">Done</Tone>
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-8">
          <Fact label="Step">{RUN.station}</Fact>
          <Fact label="Worker · workspace">
            <span className="font-mono text-xs">
              {RUN.worker} · {RUN.workspace}
            </span>
          </Fact>
          <Fact label="Idempotency key">
            <span className="font-mono text-xs">{RUN.idempotencyKey}</span>
          </Fact>
          <Fact label="Wall time">
            {RUN.started}–{RUN.finished}
          </Fact>
          <Fact label="Loops">{loops}</Fact>
          <Fact label="Tokens">{formatTokens(totalTokens)}</Fact>
          <Fact label="Cost · budget">
            {formatUsd(totalCost)} of {formatUsd(RUN.budgetUsd)}
          </Fact>
          <Fact label="Refused · amended">
            {refusals} · 1
          </Fact>
        </dl>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-1 rounded-sm bg-fail" /> Locked-test refusal and the fix that followed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-1 rounded-sm bg-purple" /> Amendment, approved by a person
        </span>
      </div>

      <StepCards />

      <div className="mt-2 hidden overflow-x-auto rounded-md border border-edge sm:block" tabIndex={0} role="region" aria-label={`Audit log for ${RUN.id}, scrolls sideways`}>
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Every step of {RUN.id}, in order, with actor, inputs, outputs, tokens, cost, artifacts and status.
          </caption>
          <thead className="bg-panel-2 text-xs font-semibold text-dim">
            <tr>
              <th scope="col" className="px-3 py-2">Time</th>
              <th scope="col" className="px-3 py-2">Step</th>
              <th scope="col" className="px-3 py-2">Actor</th>
              <th scope="col" className="px-3 py-2">In → out</th>
              <th scope="col" className="px-3 py-2 text-right">Tokens</th>
              <th scope="col" className="px-3 py-2 text-right">Cost</th>
              <th scope="col" className="px-3 py-2">Artifacts</th>
              <th scope="col" className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {RUN_STEPS.map((s, i) => (
              <tr
                key={i}
                className={`border-l-[3px] border-t border-t-edge align-top hover:bg-hover ${s.mark ? MARK_ROW[s.mark] : "border-l-transparent"} ${s.status === "rejected" ? "bg-fail-bg/40" : ""}`}
              >
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-faint">{s.at}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{s.step}</td>
                <td className="px-3 py-2">
                  <ActorChip id={s.actor} />
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs text-faint">{s.input}</div>
                  <div className="mt-0.5">{s.output}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{s.tokens ? formatTokens(s.tokens) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{s.tokens ? formatUsd(stepCost(s)) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {s.artifacts.map((a) => (
                      <code key={a} className="rounded-[3px] bg-neutral-bg px-1 text-xs">
                        {a}
                      </code>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Tone tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Tone>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-edge-2 bg-panel-2 font-semibold">
            <tr>
              <td className="px-3 py-2" colSpan={4}>
                Total, {RUN_STEPS.length} steps
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatTokens(totalTokens)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatUsd(totalCost)}</td>
              <td className="px-3 py-2 font-normal text-dim" colSpan={2}>
                Medium model at {formatUsd(MEDIUM_USD_PER_M)} per million tokens
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <TwoPaths />
    </div>
  );
}

/** Phone only: the audit log as one compact card per step. */
function StepCards() {
  return (
    <div className="mt-2 sm:hidden">
      <ol className="space-y-2" aria-label={`Audit log for ${RUN.id}`}>
        {RUN_STEPS.map((s, i) => (
          <li
            key={i}
            className={`min-w-0 rounded-md border border-edge border-l-[3px] p-2.5 text-sm ${s.mark ? MARK_ROW[s.mark] : ""} ${s.status === "rejected" ? "bg-fail-bg/40" : "bg-card"}`}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 pt-0.5 font-mono text-xs text-faint">{s.at}</span>
              <span className="min-w-0 flex-1 font-medium">{s.step}</span>
              <span className="shrink-0">
                <Tone tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Tone>
              </span>
            </div>
            <div className="mt-1.5">
              <ActorChip id={s.actor} />
            </div>
            <p className="mt-1.5 line-clamp-3 break-words text-xs">
              <span className="font-mono text-faint">{s.input}</span> <span aria-hidden className="text-faint">→</span> <span>{s.output}</span>
            </p>
            {(s.tokens > 0 || s.artifacts.length > 0) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                {s.tokens > 0 && (
                  <span className="mr-1 tabular-nums text-dim">
                    {formatTokens(s.tokens)} tokens · {formatUsd(stepCost(s))}
                  </span>
                )}
                {s.artifacts.map((a) => (
                  <code key={a} className="max-w-full break-all rounded-[3px] bg-neutral-bg px-1">
                    {a}
                  </code>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 rounded-md border border-edge-2 bg-panel-2 p-2.5 text-sm">
        <span className="font-semibold">
          Total, {RUN_STEPS.length} steps: {formatTokens(totalTokens)} tokens · {formatUsd(totalCost)}
        </span>
        <span className="mt-0.5 block text-xs text-dim">Medium model at {formatUsd(MEDIUM_USD_PER_M)} per million tokens</span>
      </p>
    </div>
  );
}

/** The refused edit beside the allowed amendment: same kind of change, different route. */
function TwoPaths() {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div className="rounded-md border border-edge border-l-[3px] border-l-fail bg-card p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Tone tone="danger">Refused</Tone>
          <h3 className="font-semibold">An agent editing a locked test</h3>
        </div>
        <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-faint">File</dt>
          <dd className="min-w-0 break-words font-mono text-xs">tests/rebooking/rounding.test.ts</dd>
          <dt className="text-faint">Proposed by</dt>
          <dd className="flex items-center gap-1.5">
            <ActorAvatar id="builder" size={18} /> {actorName("builder")}
          </dd>
          <dt className="text-faint">Rule</dt>
          <dd>
            <code className="rounded-[3px] bg-neutral-bg px-1 text-xs">locked-tests</code>, checked by the orchestrator before any write
          </dd>
          <dt className="text-faint">Recorded reason</dt>
          <dd>File is in the locked test manifest, hash {AMENDMENT.hashBefore}</dd>
          <dt className="text-faint">Then</dt>
          <dd>The agent got the refusal as a tool error, changed the implementation, and the test passed on the next loop.</dd>
        </dl>
      </div>

      <div className="rounded-md border border-edge border-l-[3px] border-l-purple bg-card p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Tone tone="success">Approved</Tone>
          <h3 className="font-semibold">{AMENDMENT.id}: a test that was wrong</h3>
        </div>
        <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-faint">File · test</dt>
          <dd className="min-w-0 break-words">
            <span className="font-mono text-xs">{AMENDMENT.file}</span> › {AMENDMENT.test}
          </dd>
          <dt className="text-faint">Claim</dt>
          <dd>{AMENDMENT.claim}</dd>
          <dt className="text-faint">Change</dt>
          <dd className="min-w-0 break-words font-mono text-xs">{AMENDMENT.change}</dd>
          <dt className="text-faint">Requested by</dt>
          <dd className="flex items-center gap-1.5">
            <ActorAvatar id={AMENDMENT.requestedBy} size={18} /> {actorName(AMENDMENT.requestedBy)}
          </dd>
          <dt className="text-faint">Approved by</dt>
          <dd className="flex items-center gap-1.5">
            <ActorAvatar id={AMENDMENT.approvedBy} size={18} /> {actorName(AMENDMENT.approvedBy)}, separately, after {AMENDMENT.waitedMinutes} min
          </dd>
          <dt className="text-faint">Reason</dt>
          <dd>“{AMENDMENT.reason}”</dd>
          <dt className="text-faint">Manifest</dt>
          <dd className="font-mono text-xs">
            {AMENDMENT.hashBefore} → {AMENDMENT.hashAfter}
          </dd>
        </dl>
      </div>
    </div>
  );
}
