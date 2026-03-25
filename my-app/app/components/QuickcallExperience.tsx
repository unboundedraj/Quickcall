"use client";

import { useEffect, useState } from "react";
import PromptDiary from "./PromptDiary";
import QuickDial from "./QuickDial";
import "./quickcall-experience.css";

export default function QuickcallExperience() {
  const [isCoverLeaving, setIsCoverLeaving] = useState(false);
  const [isCoverHidden, setIsCoverHidden] = useState(false);

  useEffect(() => {
    if (!isCoverHidden) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.overflow = "";
    return undefined;
  }, [isCoverHidden]);

  const handleStart = () => {
    if (isCoverLeaving || isCoverHidden) return;
    setIsCoverLeaving(true);
    window.setTimeout(() => {
      setIsCoverHidden(true);
    }, 900);
  };

  return (
    <div className="qc-page">
      {!isCoverHidden && (
        <section
          className={`qc-cover${isCoverLeaving ? " qc-cover--exit" : ""}`}
          aria-label="Welcome screen"
        >
          <div className="qc-cover-grain" />
          <div className="qc-cover-content">
            <p className="qc-cover-eyebrow">One page workspace</p>
            <h1 className="qc-cover-title">
              Welcome to <strong>Quickcall</strong>
            </h1>
            <p className="qc-cover-description">
              Capture your best prompts, organize your workflow, and access every
              productivity tool from one carefully designed space.
            </p>

            <div className="qc-cover-points" aria-hidden="true">
              <span>Prompt library</span>
              <span>Quick Dial websites</span>
              <span>Fast copy actions</span>
              <span>More sections coming soon</span>
            </div>

            <button type="button" className="qc-start-btn" onClick={handleStart}>
              Get started
            </button>
          </div>
        </section>
      )}

      <main className={`qc-main${isCoverHidden ? " qc-main--ready" : ""}`}>
        <section className="qc-hero" aria-label="Quickcall heading">
          <p className="qc-hero-eyebrow">Quickcall</p>
          <h1 className="qc-hero-title">Quickcall</h1>
          <p className="qc-hero-description">
            A single page command center for prompts and future workflow sections.
          </p>
        </section>

        <section className="qc-section" aria-label="Prompt Diary section">
          <PromptDiary embedded />
        </section>

        <section className="qc-section" aria-label="Quick Dial section">
          <QuickDial embedded />
        </section>

        <footer className="qc-footer-note">Made with love by unboundedraj.</footer>
      </main>
    </div>
  );
}
