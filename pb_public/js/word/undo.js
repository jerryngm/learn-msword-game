// Undo/redo history of document snapshots. Snapshots are immutable, so entries share structure.

export const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;

/**
 * Entries are {doc, sel, label}. `record` stores the state *before* a change. Consecutive changes
 * with the same `group` key (typing) inside a short window collapse into one undo step, like Word.
 */
export function createHistory(limit = HISTORY_LIMIT, entries = {}) {
  let undoStack = [...(entries.undo ?? [])];
  let redoStack = [...(entries.redo ?? [])];
  let lastGroup = null;
  let lastAt = 0;

  return {
    /** Independent history for a demonstration; immutable document snapshots can be shared. */
    fork() {
      return createHistory(limit, { undo: undoStack, redo: redoStack });
    },
    record(before, label, group = null) {
      const now = Date.now();
      const merge = group && group === lastGroup && now - lastAt < COALESCE_MS && undoStack.length > 0;
      lastGroup = group;
      lastAt = now;
      redoStack = [];
      if (merge) return;
      undoStack.push({ ...before, label });
      if (undoStack.length > limit) undoStack.shift();
    },
    /** Step back. `current` is pushed on the redo stack. Returns the entry to restore, or null. */
    undo(current) {
      const entry = undoStack.pop();
      if (!entry) return null;
      redoStack.push({ ...current, label: entry.label });
      lastGroup = null;
      return entry;
    },
    redo(current) {
      const entry = redoStack.pop();
      if (!entry) return null;
      undoStack.push({ ...current, label: entry.label });
      lastGroup = null;
      return entry;
    },
    /** Break typing coalescing (after a selection move, a command, etc.). */
    seal() {
      lastGroup = null;
    },
    clear() {
      undoStack = [];
      redoStack = [];
      lastGroup = null;
    },
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    /** Labels of the undo steps, newest first (for the Undo dropdown). */
    undoLabels() {
      return undoStack.map((e) => e.label).reverse();
    },
    get size() {
      return undoStack.length;
    },
  };
}
