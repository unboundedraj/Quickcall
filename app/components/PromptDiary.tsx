"use client";

import { useState, useEffect, useMemo } from "react";
import "./prompt-diary.css";
import type { Prompt, Category } from "./promptDiaryTypes";
import { PromptDiaryCard } from "./PromptDiaryCard";
import { PromptCategorySection } from "./PromptCategorySection";

export type { Prompt } from "./promptDiaryTypes";

export default function PromptDiary({ embedded = false }: { embedded?: boolean }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New prompt form
  const [open, setOpen] = useState(false);
  const [abbr, setAbbr] = useState("");
  const [desc, setDesc] = useState("");
  const [full, setFull] = useState("");

  // New category form
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Prompt viewer/editor
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [activePromptText, setActivePromptText] = useState("");
  const [updatingPrompt, setUpdatingPrompt] = useState(false);
  const [activePromptError, setActivePromptError] = useState<string | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [promptsRes, catsRes] = await Promise.all([
          fetch("/api/prompts", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        if (!promptsRes.ok || !catsRes.ok) throw new Error("Failed to load data.");

        const [promptsData, catsData] = await Promise.all([
          promptsRes.json() as Promise<Prompt[]>,
          catsRes.json() as Promise<Category[]>,
        ]);

        setPrompts(promptsData);
        setCategories(catsData);
      } catch {
        setError("Could not load data from the database.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const uncategorizedPrompts = useMemo(
    () => prompts.filter((p) => p.categoryIds.length === 0),
    [prompts]
  );

  const promptsInCategory = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    sortedCategories.forEach((c) => {
      map.set(c.id, prompts.filter((p) => p.categoryIds.includes(c.id)));
    });
    return map;
  }, [prompts, sortedCategories]);

  // Global index for card numbering
  const globalIndex = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    uncategorizedPrompts.forEach((p) => map.set(p.id, i++));
    sortedCategories.forEach((c) => {
      (promptsInCategory.get(c.id) || []).forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, i++);
      });
    });
    return map;
  }, [uncategorizedPrompts, sortedCategories, promptsInCategory]);

  // ── Prompt CRUD ──────────────────────────────────────────────────────────
  const add = async () => {
    if (!abbr.trim() || !full.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abbreviation: abbr.trim(),
          description: desc.trim(),
          fullPrompt: full.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as Prompt;
      setPrompts((prev) => [...prev, created]);
      setAbbr(""); setDesc(""); setFull(""); setOpen(false);
    } catch {
      setError("Could not save prompt.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const password = window.prompt("Enter admin password to delete this prompt:");
    if (password === null) return;
    if (!password.trim()) { setError("Delete cancelled: admin password is required."); return; }

    try {
      setError(null);
      const res = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
        headers: { "x-admin-delete-password": password },
      });
      if (res.status === 401) { setError("Incorrect admin password."); return; }
      if (!res.ok) throw new Error();
      setPrompts((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError("Could not delete prompt.");
    }
  };

  const openPrompt = (prompt: Prompt) => {
    setActivePrompt(prompt);
    setActivePromptText(prompt.fullPrompt);
    setActivePromptError(null);
  };

  const closePrompt = () => {
    if (updatingPrompt) return;
    setActivePrompt(null);
    setActivePromptText("");
    setActivePromptError(null);
  };

  const savePrompt = async () => {
    if (!activePrompt) return;
    const nextFull = activePromptText.trim();
    if (!nextFull) { setActivePromptError("Prompt text cannot be empty."); return; }

    try {
      setUpdatingPrompt(true);
      setActivePromptError(null);
      const res = await fetch(`/api/prompts/${activePrompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPrompt: nextFull }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as Prompt;
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setActivePrompt(null); setActivePromptText(""); setActivePromptError(null);
    } catch {
      setActivePromptError("Could not update prompt.");
    } finally {
      setUpdatingPrompt(false);
    }
  };

  // ── Category membership ──────────────────────────────────────────────────
  // Called when user clicks Apply in the picker for a given category.
  // selectedIds = the full desired member list after the picker.
  const saveCategoryMembers = async (categoryId: string, selectedIds: string[]) => {
    const selectedSet = new Set(selectedIds);

    // Which prompts changed?
    const changed = prompts.filter((p) => {
      const wasIn = p.categoryIds.includes(categoryId);
      const willBeIn = selectedSet.has(p.id);
      return wasIn !== willBeIn;
    });

    if (changed.length === 0) return;

    // Optimistic update
    const next = prompts.map((p) => {
      if (!selectedSet.has(p.id) && !p.categoryIds.includes(categoryId)) return p;
      if (selectedSet.has(p.id) && p.categoryIds.includes(categoryId)) return p;

      const newCategoryIds = selectedSet.has(p.id)
        ? [...p.categoryIds, categoryId]
        : p.categoryIds.filter((cid) => cid !== categoryId);

      return { ...p, categoryIds: newCategoryIds };
    });
    setPrompts(next);

    // Persist
    await Promise.all(
      changed.map((p) => {
        const newCategoryIds = selectedSet.has(p.id)
          ? [...p.categoryIds, categoryId]
          : p.categoryIds.filter((cid) => cid !== categoryId);

        return fetch(`/api/prompts/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryIds: newCategoryIds }),
        });
      })
    );
  };

  const removeFromCategory = async (promptId: string, categoryId: string) => {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    const newCategoryIds = prompt.categoryIds.filter((cid) => cid !== categoryId);

    setPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, categoryIds: newCategoryIds } : p))
    );

    await fetch(`/api/prompts/${promptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: newCategoryIds }),
    });
  };

  // ── Category CRUD ────────────────────────────────────────────────────────
  const addCategory = async () => {
    if (!catName.trim()) return;
    try {
      setSavingCat(true);
      setError(null);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim() }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as Category;
      setCategories((prev) => [...prev, created]);
      setCatName(""); setCatOpen(false);
    } catch {
      setError("Could not save category.");
    } finally {
      setSavingCat(false);
    }
  };

  const renameCategory = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as Category;
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setError("Could not rename category.");
    }
  };

  const deleteCategory = async (id: string) => {
    const password = window.prompt("Enter admin password to delete this category:");
    if (password === null) return;
    if (!password.trim()) { setError("Delete cancelled: admin password is required."); return; }

    try {
      setError(null);
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { "x-admin-delete-password": password },
      });
      if (res.status === 401) { setError("Incorrect admin password."); return; }
      if (!res.ok) throw new Error();

      setCategories((prev) => prev.filter((c) => c.id !== id));
      // Remove this category from all prompts locally
      setPrompts((prev) =>
        prev.map((p) => ({
          ...p,
          categoryIds: p.categoryIds.filter((cid) => cid !== id),
        }))
      );
    } catch {
      setError("Could not delete category.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`pd-root${embedded ? " pd-root--embedded" : ""}`}>
      <div className="pd-inner">
        <p className="pd-eyebrow">Personal collection</p>
        <h1 className="pd-title">
          Prompt <strong>Diary</strong>
        </h1>
        <div className="pd-rule" />
        <p className="pd-subtitle">
          Click any entry to copy · Hover to preview ·{" "}
          {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} indexed
        </p>

        {error && <p className="pd-error">{error}</p>}

        {/* Action row */}
        <div className={`pd-action-row${open || catOpen ? " pd-action-row--compact" : ""}`}>
          <button
            type="button"
            className="pd-add-btn"
            onClick={() => { setOpen((o) => !o); setCatOpen(false); }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>{open ? "Dismiss" : "New entry"}</span>
          </button>

          <button
            type="button"
            className="pd-add-btn pd-add-btn--secondary"
            onClick={() => { setCatOpen((o) => !o); setOpen(false); }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 3h8M1 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>{catOpen ? "Dismiss" : "New category"}</span>
          </button>
        </div>

        {/* New prompt form */}
        {open && (
          <div className="pd-form">
            <label className="pd-form-label">Abbreviation</label>
            <input type="text" placeholder="e.g. TL;DR" value={abbr} onChange={(e) => setAbbr(e.target.value)} />

            <label className="pd-form-label">Description (optional)</label>
            <input type="text" placeholder="Short description of intent" value={desc} onChange={(e) => setDesc(e.target.value)} />

            <label className="pd-form-label">Full prompt — this is what gets copied</label>
            <textarea placeholder="Write the full prompt text here…" value={full} onChange={(e) => setFull(e.target.value)} rows={3} />

            <div className="pd-form-actions">
              <button type="button" className="pd-form-submit" onClick={() => void add()} disabled={!abbr.trim() || !full.trim() || saving}>
                {saving ? "Saving..." : "Add entry"}
              </button>
              <button type="button" className="pd-form-cancel" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* New category form */}
        {catOpen && (
          <div className="pd-form">
            <label className="pd-form-label">Category name</label>
            <input
              type="text"
              placeholder="e.g. Coding, Writing, Research…"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addCategory(); }}
              autoFocus
            />
            <div className="pd-form-actions">
              <button type="button" className="pd-form-submit" onClick={() => void addCategory()} disabled={!catName.trim() || savingCat}>
                {savingCat ? "Saving..." : "Add category"}
              </button>
              <button type="button" className="pd-form-cancel" onClick={() => setCatOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <p className="pd-empty">Loading prompts...</p>
        ) : (
          <>
            {/* Uncategorized — hide when empty and categories exist */}
            {(uncategorizedPrompts.length > 0 || sortedCategories.length === 0) && (
              <PromptCategorySection
                category={null}
                prompts={uncategorizedPrompts}
                allPrompts={prompts}
                globalIndex={globalIndex}
                onRemove={(id) => void remove(id)}
                onView={openPrompt}
                onRemoveFromCategory={() => {}}
                onSaveMembers={() => {}}
              />
            )}

            {/* Named categories */}
            {sortedCategories.map((cat) => (
              <PromptCategorySection
                key={cat.id}
                category={cat}
                prompts={promptsInCategory.get(cat.id) || []}
                allPrompts={prompts}
                globalIndex={globalIndex}
                onRemove={(id) => void remove(id)}
                onView={openPrompt}
                onRemoveFromCategory={(promptId) => void removeFromCategory(promptId, cat.id)}
                onSaveMembers={(selectedIds) => void saveCategoryMembers(cat.id, selectedIds)}
                onRename={(id, name) => void renameCategory(id, name)}
                onDelete={(id) => void deleteCategory(id)}
              />
            ))}
          </>
        )}

        {/* Prompt viewer/editor modal */}
        {activePrompt && (
          <div
            className="pd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-modal-title"
            onClick={closePrompt}
          >
            <div className="pd-modal-panel" onClick={(e) => e.stopPropagation()}>
              <p className="pd-modal-eyebrow">Prompt Viewer</p>
              <h2 className="pd-modal-title" id="pd-modal-title">{activePrompt.abbreviation}</h2>
              <p className="pd-modal-description">
                {activePrompt.description || activePrompt.abbreviation}
              </p>

              <label className="pd-form-label" htmlFor="pd-modal-full-prompt">Full prompt</label>
              <textarea
                id="pd-modal-full-prompt"
                value={activePromptText}
                onChange={(e) => setActivePromptText(e.target.value)}
                rows={10}
                className="pd-modal-textarea"
              />

              {activePromptError && <p className="pd-modal-error">{activePromptError}</p>}

              <div className="pd-modal-actions">
                <button type="button" className="pd-form-submit" onClick={() => void savePrompt()} disabled={updatingPrompt}>
                  {updatingPrompt ? "Saving..." : "Save"}
                </button>
                <button type="button" className="pd-form-cancel" onClick={closePrompt} disabled={updatingPrompt}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
