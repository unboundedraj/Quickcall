"use client";

import { useState } from "react";
import type { Category, Prompt } from "./promptDiaryTypes";
import { PromptDiaryCard } from "./PromptDiaryCard";

interface Props {
  category: Category | null; // null = uncategorized
  prompts: Prompt[];         // prompts that belong to this section
  allPrompts: Prompt[];      // every prompt (for picker)
  globalIndex: Map<string, number>;
  onRemove: (id: string) => void;
  onView: (prompt: Prompt) => void;
  onRemoveFromCategory: (promptId: string) => void;
  onSaveMembers: (selectedIds: string[]) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export function PromptCategorySection({
  category,
  prompts,
  allPrompts,
  globalIndex,
  onRemove,
  onView,
  onRemoveFromCategory,
  onSaveMembers,
  onRename,
  onDelete,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // IDs selected inside the picker (initialised when picker opens)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const openPicker = () => {
    setSelected(new Set(prompts.map((p) => p.id)));
    setPickerOpen(true);
  };

  const closePicker = () => {
    if (saving) return;
    setPickerOpen(false);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.resolve(onSaveMembers([...selected]));
    setSaving(false);
    setPickerOpen(false);
  };

  return (
    <div className="pd-category-section">
      {/* Section header */}
      <div className="pd-category-header">
        <span className="pd-category-name">
          {category?.name ?? "Uncategorized"}
        </span>

        <div className="pd-category-header-actions">
          {category && (
            <>
              <button
                type="button"
                className="pd-category-btn pd-category-btn--add"
                onClick={openPicker}
                aria-label="Add prompts to category"
              >
                + add prompts
              </button>
              <button
                type="button"
                className="pd-category-btn"
                onClick={() => {
                  const next = window.prompt("Rename category:", category.name);
                  if (next?.trim()) onRename?.(category.id, next.trim());
                }}
              >
                rename
              </button>
              <button
                type="button"
                className="pd-category-btn pd-category-btn--danger"
                onClick={() => onDelete?.(category.id)}
              >
                delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prompt grid */}
      <div className="pd-grid pd-category-grid">
        {prompts.map((p) => (
          <PromptDiaryCard
            key={p.id}
            prompt={p}
            index={globalIndex.get(p.id) ?? 0}
            onRemove={() => onRemove(p.id)}
            onView={() => onView(p)}
            onRemoveFromCategory={
              category ? () => onRemoveFromCategory(p.id) : undefined
            }
          />
        ))}
        {prompts.length === 0 && (
          <p className="pd-category-empty-hint">
            {category ? 'Click "+ add prompts" to assign prompts here.' : "No prompts yet."}
          </p>
        )}
      </div>

      {/* Prompt picker modal */}
      {pickerOpen && (
        <div
          className="pd-picker-backdrop"
          onClick={closePicker}
          role="dialog"
          aria-modal="true"
          aria-label={`Add prompts to ${category?.name ?? ""}`}
        >
          <div
            className="pd-picker-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="pd-modal-eyebrow">Add prompts to</p>
            <h2 className="pd-picker-title">{category?.name}</h2>

            <p className="pd-picker-hint">
              {selected.size} prompt{selected.size !== 1 ? "s" : ""} selected
            </p>

            <div className="pd-picker-list">
              {allPrompts.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <label key={p.id} className={`pd-picker-item${checked ? " pd-picker-item--checked" : ""}`}>
                    <input
                      type="checkbox"
                      className="pd-picker-checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                    />
                    <div className="pd-picker-item-text">
                      <span className="pd-picker-abbr">{p.abbreviation}</span>
                      {p.description && (
                        <span className="pd-picker-desc">{p.description}</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pd-modal-actions">
              <button
                type="button"
                className="pd-form-submit"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Apply"}
              </button>
              <button
                type="button"
                className="pd-form-cancel"
                onClick={closePicker}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
