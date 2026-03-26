"use client";

import { useEffect, useState } from "react";
import "./prompt-diary.css";
import type { QuickDial } from "./quickDialTypes";
import { QuickDialCard } from "./QuickDialCard";

function isValidHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function QuickDial({ embedded = false }: { embedded?: boolean }) {
  const [entries, setEntries] = useState<QuickDial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [abbr, setAbbr] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/quick-dials", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Failed to load quick dials.");
        }

        const data = (await res.json()) as QuickDial[];
        setEntries(data);
      } catch {
        setError("Could not load quick dials from the database.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const add = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    if (!isValidHttpUrl(trimmedUrl)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/quick-dials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          abbreviation: abbr.trim(),
          description: desc.trim(),
          url: trimmedUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create quick dial entry.");
      }

      const created = (await res.json()) as QuickDial;
      setEntries((prev) => [created, ...prev]);
      setAbbr("");
      setDesc("");
      setUrl("");
      setOpen(false);
    } catch {
      setError("Could not save quick dial to the database.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const password = window.prompt("Enter admin password to delete this quick dial:");
    if (password === null) return;
    if (!password.trim()) {
      setError("Delete cancelled: admin password is required.");
      return;
    }

    try {
      setError(null);

      const res = await fetch(`/api/quick-dials/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-delete-password": password,
        },
      });

      if (res.status === 401) {
        setError("Incorrect admin password. Quick dial was not deleted.");
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
        throw new Error("Failed to delete quick dial entry.");
      }

      setEntries((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError("Could not delete quick dial from the database.");
    }
  };

  return (
    <div className={`pd-root${embedded ? " pd-root--embedded" : ""}`}>
      <div className="pd-inner">
        <p className="pd-eyebrow">Personal collection</p>
        <h1 className="pd-title">
          Quick <strong>Dial</strong>
        </h1>
        <div className="pd-rule" />
        <p className="pd-subtitle">
          Click any entry to open · Hover to preview · {entries.length} website
          {entries.length !== 1 ? "s" : ""} indexed
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
            <label className="pd-form-label">Abbreviation (optional)</label>
            <input
              type="text"
              placeholder="e.g. GH"
              value={abbr}
              onChange={(e) => setAbbr(e.target.value)}
            />

            <label className="pd-form-label">Description (optional)</label>
            <input
              type="text"
              placeholder="Short website description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />

            <label className="pd-form-label">URL — opens in a new tab</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <div className="pd-form-actions">
              <button
                type="button"
                className="pd-form-submit"
                onClick={() => void add()}
                disabled={!url.trim() || saving}
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
          <p className="pd-empty">Loading quick dials...</p>
        ) : entries.length === 0 ? (
          <p className="pd-empty">No quick dials yet — add your first entry.</p>
        ) : (
          <div className="pd-grid">
            {entries.map((entry, i) => (
              <QuickDialCard
                key={entry.id}
                entry={entry}
                index={i}
                onRemove={() => void remove(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
