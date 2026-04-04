"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Prompt } from "./promptDiaryTypes";

export function PromptDiaryCard({
  prompt,
  index,
  onRemove,
  onView,
}: {
  prompt: Prompt;
  index: number;
  onRemove: () => void;
  onView: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltipShift, setTooltipShift] = useState(0);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hover || copied) {
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
  }, [hover, copied, prompt.description]);

  const copy = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest(".pd-card-action")) return;
    navigator.clipboard.writeText(prompt.fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className="pd-card"
      onClick={copy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setTooltipShift(0);
      }}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter") copy(e);
      }}
    >
      <span className="pd-card-index">{String(index + 1).padStart(2, "0")}</span>

      <button
        type="button"
        className="pd-card-action pd-card-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${prompt.abbreviation}`}
      >
        ×
      </button>

      <button
        type="button"
        className="pd-card-action pd-card-eye"
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        aria-label={`View and edit ${prompt.abbreviation}`}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2 12c2.1-3.3 5.5-5 10-5s7.9 1.7 10 5c-2.1 3.3-5.5 5-10 5S4.1 15.3 2 12Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
      </button>

      <span className="pd-card-abbr">{prompt.abbreviation}</span>
      <div className="pd-card-line" />

      {copied && <span className="pd-card-copied">copied</span>}

      {hover && !copied && (
        <div
          ref={tooltipRef}
          className="pd-tooltip"
          style={
            {
              "--pd-tooltip-shift": `${tooltipShift}px`,
            } as CSSProperties
          }
        >
          <div className="pd-tooltip-title">
            {prompt.description || prompt.abbreviation}
          </div>
        </div>
      )}
    </div>
  );
}
