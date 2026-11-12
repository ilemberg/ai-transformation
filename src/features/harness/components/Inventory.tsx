"use client";

import { useState } from "react";
import { Avatar, Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { ACTORS } from "@/features/line/stations";
import { ITEMS, KINDS, KIND_LABEL, type HarnessItem, type HarnessKind } from "../data";
import { countByKind, filterItems, formatDate, latest, sortHistory } from "../logic";
import { Result, Scroller, TD, TH, THEAD, TicketLink } from "./ui";

const KIND_TONE: Record<HarnessKind, LozengeTone> = {
  instructions: "neutral",
  prompt: "purple",
  skill: "purple",
  tool: "neutral",
  policy: "info",
  eval: "info",
  guardrail: "info",
};

function KindLozenge({ kind }: { kind: HarnessKind }) {
  return <Lozenge tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Lozenge>;
}

function Name({ item }: { item: HarnessItem }) {
  return (
    <>
      <span className="font-mono text-[0.929rem]">{item.name}</span>
      {item.note && <span className="ml-1.5 text-xs text-faint">{item.note}</span>}
    </>
  );
}

function History({ item }: { item: HarnessItem }) {
  return (
    <ol className="space-y-3">
      {sortHistory(item.history).map((c) => (
        <li key={c.version} className="flex gap-2.5 text-sm">
          <Avatar id={c.author} size={22} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-xs font-semibold">{c.version}</span>
              <span className="text-xs text-dim tabular-nums">{formatDate(c.date)}</span>
              {c.ticket && <TicketLink ticket={c.ticket} />}
            </div>
            <p className="mt-0.5">{c.reason}</p>
            <p className="text-xs text-faint">
              {ACTORS[c.author].name}, {c.team}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Panel({ item }: { item: HarnessItem }) {
  return (
    <aside aria-label={`Change history: ${item.name}`} className="rounded-md border border-edge bg-card p-3 shadow-card lg:sticky lg:top-20">
      <div className="flex flex-wrap items-center gap-2">
        <Name item={item} />
        <KindLozenge kind={item.kind} />
        <Result pass={item.test === "pass"} />
      </div>
      <p className="mt-1 text-xs text-dim">
        {item.owner} · {latest(item).version}
      </p>
      <div className="mt-3 border-t border-edge pt-3">
        <History item={item} />
      </div>
    </aside>
  );
}

export function Inventory() {
  const [kind, setKind] = useState<HarnessKind | "all">("all");
  const [failingOnly, setFailingOnly] = useState(false);
  const [selectedId, setSelectedId] = useState("policy-approvals");
  const rows = filterItems(ITEMS, { kind, failingOnly });
  const counts = countByKind(ITEMS);
  const selected = ITEMS.find((i) => i.id === selectedId) ?? ITEMS[0]!;

  const chip = (active: boolean) =>
    `rounded-[3px] border px-2 py-1 text-xs font-medium ${active ? "border-brand bg-selected text-brand" : "border-edge bg-card text-dim hover:text-ink"}`;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
        <button type="button" aria-pressed={kind === "all"} className={chip(kind === "all")} onClick={() => setKind("all")}>
          All <span className="tabular-nums">{ITEMS.length}</span>
        </button>
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} className={chip(kind === k)} onClick={() => setKind(k)}>
            {KIND_LABEL[k]} <span className="tabular-nums">{counts[k]}</span>
          </button>
        ))}
        <button type="button" aria-pressed={failingOnly} className={chip(failingOnly)} onClick={() => setFailingOnly((v) => !v)}>
          Failing only
        </button>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {rows.length === 0 && <p className="text-sm text-dim">No items match.</p>}

          {/* Phones: cards; the selected one opens its history in place. */}
          <ul className="space-y-2 sm:hidden" aria-label="Harness items">
            {rows.map((i) => {
              const open = i.id === selectedId;
              const now = latest(i);
              return (
                <li key={i.id} className={`min-w-0 rounded-md border bg-card text-sm ${open ? "border-brand" : "border-edge"}`}>
                  <button type="button" aria-expanded={open} className="block w-full p-2.5 text-left" onClick={() => setSelectedId(i.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words">
                        <Name item={i} />
                      </span>
                      <Result pass={i.test === "pass"} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim">
                      <KindLozenge kind={i.kind} />
                      <span>{i.owner}</span>
                      <span className="tabular-nums">
                        {now.version} · {formatDate(now.date)}
                      </span>
                    </div>
                  </button>
                  {i.because && !open && (
                    <p className="-mt-1 px-2.5 pb-2.5 text-xs text-dim">
                      Changed because <TicketLink ticket={i.because} />
                    </p>
                  )}
                  {open && (
                    <div className="border-t border-edge p-2.5">
                      <History item={i} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Scroller label="Harness items" className="hidden bg-card sm:block">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Kind</th>
                  <th className={TH}>Owner</th>
                  <th className={TH}>Version</th>
                  <th className={TH}>Last changed</th>
                  <th className={TH}>Harness test</th>
                  <th className={TH}>Changed because</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const on = i.id === selectedId;
                  const now = latest(i);
                  return (
                    <tr
                      key={i.id}
                      onClick={() => setSelectedId(i.id)}
                      className={`cursor-pointer border-b border-edge last:border-0 ${on ? "bg-selected" : "hover:bg-hover"}`}
                    >
                      <td className={TD}>
                        <button type="button" aria-pressed={on} className="whitespace-nowrap text-left hover:underline" onClick={() => setSelectedId(i.id)}>
                          <Name item={i} />
                        </button>
                      </td>
                      <td className={TD}>
                        <KindLozenge kind={i.kind} />
                      </td>
                      <td className={`${TD} whitespace-nowrap text-dim`}>{i.owner}</td>
                      <td className={`${TD} font-mono text-xs`}>{now.version}</td>
                      <td className={`${TD} whitespace-nowrap tabular-nums text-dim`}>{formatDate(now.date)}</td>
                      <td className={TD}>
                        <Result pass={i.test === "pass"} />
                      </td>
                      <td className={TD}>
                        <TicketLink ticket={i.because} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Scroller>
        </div>

        <div className="hidden sm:block">
          <Panel item={selected} />
        </div>
      </div>
    </div>
  );
}
