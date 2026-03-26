"use client";

import { useState, useEffect } from "react";
import "./prompt-diary.css";
import type { Prompt } from "./promptDiaryTypes";
import { PromptDiaryCard } from "./PromptDiaryCard";

export type { Prompt } from "./promptDiaryTypes";

export default function PromptDiary({ embedded = false }: { embedded?: boolean }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [abbr, setAbbr] = useState("");
  const [desc, setDesc] = useState("");
  const [full, setFull] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/prompts", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Failed to load prompts.");
        }

        const data = (await res.json()) as Prompt[];
        setPrompts(data);
      } catch {
        setError("Could not load prompts from the database.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const add = async () => {
    if (!abbr.trim() || !full.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          abbreviation: abbr.trim(),
          description: desc.trim(),
          fullPrompt: full.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create prompt.");
      }

      const created = (await res.json()) as Prompt;
      setPrompts((prev) => [...prev, created]);
      setAbbr("");
      setDesc("");
      setFull("");
      setOpen(false);
    } catch {
      setError("Could not save prompt to the database.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const password = window.prompt("Enter admin password to delete this prompt:");
    if (password === null) return;
    if (!password.trim()) {
      setError("Delete cancelled: admin password is required.");
      return;
    }

    try {
      setError(null);

      const res = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-delete-password": password,
        },
      });

      if (res.status === 401) {
        setError("Incorrect admin password. Prompt was not deleted.");
        return;
      }

      if (res.status === 500) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (body?.error) {
          setError(body.error);
          return;
        }
      }

      if (!res.ok) {
        throw new Error("Failed to delete prompt.");
      }

      setPrompts((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError("Could not delete prompt from the database.");
    }
  };

  return (
    <div className={`pd-root${embedded ? " pd-root--embedded" : ""}`}>
      <div className="pd-inner">
        <p className="pd-eyebrow">Personal collection</p>
        <h1 className="pd-title">
          Prompt <strong>Diary</strong>
        </h1>
        <div className="pd-rule" />
        <p className="pd-subtitle">
          Click any entry to copy · Hover to preview · {prompts.length} prompt
          {prompts.length !== 1 ? "s" : ""} indexed
        </p>

        {error && <p className="pd-empty">{error}</p>}

        <div
          className={`pd-action-row${open ? " pd-action-row--compact" : ""}`}
        >
          <button
            type="button"
            className="pd-add-btn"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 1v8M1 5h8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span>{open ? "Dismiss" : "New entry"}</span>
          </button>
        </div>

        {open && (
          <div className="pd-form">
            <label className="pd-form-label">Abbreviation</label>
            <input
              type="text"
              placeholder="e.g. TL;DR"
              value={abbr}
              onChange={(e) => setAbbr(e.target.value)}
            />

            <label className="pd-form-label">Description (optional)</label>
            <input
              type="text"
              placeholder="Short description of intent"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />

            <label className="pd-form-label">
              Full prompt — this is what gets copied
            </label>
            <textarea
              placeholder="Write the full prompt text here…"
              value={full}
              onChange={(e) => setFull(e.target.value)}
              rows={3}
            />

            <div className="pd-form-actions">
              <button
                type="button"
                className="pd-form-submit"
                onClick={() => void add()}
                disabled={!abbr.trim() || !full.trim() || saving}
              >
                {saving ? "Saving..." : "Add entry"}
              </button>
              <button
                type="button"
                className="pd-form-cancel"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="pd-empty">Loading prompts...</p>
        ) : prompts.length === 0 ? (
          <p className="pd-empty">No prompts yet — add your first entry.</p>
        ) : (
          <div className="pd-grid">
            {prompts.map((p, i) => (
              <PromptDiaryCard
                key={p.id}
                prompt={p}
                index={i}
                onRemove={() => void remove(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
