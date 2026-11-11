"use client";

import { LAST_MONTH } from "@/features/metrics/data";
import type { GadgetInfo } from "../gadgets";
import type { Width } from "../layout";
import { GadgetMenu } from "./GadgetMenu";

type Props = {
  info: GadgetInfo;
  width: Width;
  index: number;
  count: number;
  editing: boolean;
  dragging: boolean;
  onMove: (step: -1 | 1) => void;
  onToggleWidth: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  children: React.ReactNode;
};

const iconButton =
  "grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-dim hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-brand";

export function GadgetFrame(props: Props) {
  const { info, width, index, count, editing, dragging, children } = props;
  const first = index === 0;
  const last = index === count - 1;
  const widthLabel = width === 1 ? "Make wide (2 columns)" : "Make narrow (1 column)";

  return (
    <section
      aria-labelledby={`gadget-${info.id}-title`}
      draggable={editing}
      onDragStart={editing ? props.onDragStart : undefined}
      onDragEnd={editing ? props.onDragEnd : undefined}
      onDragOver={editing ? props.onDragOver : undefined}
      data-gadget={info.id}
      className={`flex min-w-0 flex-col rounded-[3px] border bg-panel shadow-card motion-safe:transition-opacity ${
        width === 2 ? "md:col-span-2" : ""
      } ${editing ? "border-edge-2" : "border-edge"} ${dragging ? "opacity-40" : ""}`}
    >
      <header className="flex h-10 items-center gap-1 border-b border-edge pl-2 pr-1.5">
        {editing && (
          <span
            aria-hidden
            title="Drag to move"
            className="grid h-7 w-5 shrink-0 cursor-grab grid-cols-2 place-content-center gap-[3px] text-faint active:cursor-grabbing"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
            ))}
          </span>
        )}
        <h2 id={`gadget-${info.id}-title`} className={`min-w-0 flex-1 truncate text-sm font-semibold ${editing ? "" : "pl-2"}`}>
          {info.title}
        </h2>
        {editing && (
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              id={`move-prev-${info.id}`}
              className={iconButton}
              aria-label={`Move ${info.title} left or up`}
              title="Move left / up"
              disabled={first}
              onClick={() => props.onMove(-1)}
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              id={`move-next-${info.id}`}
              className={iconButton}
              aria-label={`Move ${info.title} right or down`}
              title="Move right / down"
              disabled={last}
              onClick={() => props.onMove(1)}
            >
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              id={`width-${info.id}`}
              className={`${iconButton} hidden md:grid`}
              aria-label={`${widthLabel}: ${info.title}`}
              title={widthLabel}
              onClick={props.onToggleWidth}
            >
              <span aria-hidden className="font-mono text-xs font-bold">
                {width === 1 ? "1↔2" : "2↔1"}
              </span>
            </button>
            <button
              type="button"
              className={`${iconButton} hover:text-fail-text`}
              aria-label={`Remove ${info.title}`}
              title="Remove"
              onClick={props.onRemove}
            >
              <span aria-hidden className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>
        )}
        <GadgetMenu
          title={info.title}
          items={[
            { label: "Move up", onSelect: () => props.onMove(-1), disabled: first },
            { label: "Move down", onSelect: () => props.onMove(1), disabled: last },
            { label: width === 1 ? "Change width: 2 columns" : "Change width: 1 column", onSelect: props.onToggleWidth },
            { label: "Remove", onSelect: props.onRemove, danger: true },
          ]}
        />
      </header>
      <div className="min-w-0 flex-1 p-4">{children}</div>
      <footer className="flex items-center gap-1.5 border-t border-edge px-4 py-2 text-[11px] text-faint">
        <span className="shrink-0 rounded-[3px] bg-warn-bg px-1 font-bold uppercase leading-4 text-warn">Sample</span>
        <span className="min-w-0 truncate" title={info.footnote}>
          Month {LAST_MONTH}
          {info.footnote ? ` · ${info.footnote}` : " · trend over the year"}
        </span>
      </footer>
    </section>
  );
}
