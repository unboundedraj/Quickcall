"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { QuickDial } from "./quickDialTypes";

function getDisplayLabel(entry: QuickDial) {
  return entry.abbreviation || entry.description || entry.url;
}

export function QuickDialCard({
  entry,
  index,
  onRemove,
}: {
  entry: QuickDial;
  index: number;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [opened, setOpened] = useState(false);
  const [tooltipShift, setTooltipShift] = useState(0);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hover || opened) {
      return;
    }

    const adjustTooltip = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      setTooltipShift(0);

      window.requestAnimationFrame(() => {
        const rect = tooltip.getBoundingClientRect();
        const viewportPadding = 8;
        const maxRight = window.innerWidth - viewportPadding;
        let shift = 0;

        if (rect.left < viewportPadding) {
          shift = viewportPadding - rect.left;
        } else if (rect.right > maxRight) {
          shift = maxRight - rect.right;
        }

        setTooltipShift(shift);
      });
    };

    adjustTooltip();
    window.addEventListener("resize", adjustTooltip);
    return () => {
      window.removeEventListener("resize", adjustTooltip);
    };
  }, [hover, opened, entry.description]);

  const open = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest(".pd-card-remove")) return;
    window.open(entry.url, "_blank", "noopener,noreferrer");
    setOpened(true);
    setTimeout(() => setOpened(false), 1400);
  };

  const label = getDisplayLabel(entry);

  return (
    <div
      className="pd-card"
      onClick={open}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setTooltipShift(0);
      }}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter") open(e);
      }}
    >
      <span className="pd-card-index">{String(index + 1).padStart(2, "0")}</span>

      <button
        type="button"
        className="pd-card-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}`}
      >
        ×
      </button>

      <span className="pd-card-abbr">{label}</span>
      <div className="pd-card-line" />

      {opened && <span className="pd-card-copied">opened</span>}

      {hover && !opened && (
        <div
          ref={tooltipRef}
          className="pd-tooltip"
          style={
            {
              "--pd-tooltip-shift": `${tooltipShift}px`,
            } as CSSProperties
          }
        >
          <div className="pd-tooltip-title">{entry.description || label}</div>
        </div>
      )}
    </div>
  );
}
