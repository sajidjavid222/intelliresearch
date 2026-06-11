"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { usePaperDrawer } from "@/components/PaperDrawer";
import { Icon } from "@/components/ui";

interface Coll {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
}
interface Item {
  id: string;
  item_type: string;
  title: string;
  collection_id?: string | null;
  notes?: string;
  payload?: any;
}

const COLORS: Record<string, string> = {
  brand: "from-brand-400 to-brand-600",
  violet: "from-violet-400 to-violet-600",
  amber: "from-amber-400 to-amber-600",
  rose: "from-rose-400 to-rose-600",
  sky: "from-sky-400 to-sky-600",
  emerald: "from-emerald-400 to-emerald-600",
};
const COLOR_KEYS = Object.keys(COLORS);

function ItemRow({
  item,
  colls,
  onMove,
  onRemove,
  onSaved,
}: {
  item: Item;
  colls: Coll[];
  onMove: (id: string, collId: string | null) => void;
  onRemove: (id: string) => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const openDrawer = usePaperDrawer();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(item.notes || "");
  const [saving, setSaving] = useState(false);
  const hasNote = (item.notes || "").trim().length > 0;

  // Papers open the in-app detail drawer; everything else opens its link.
  const url: string | undefined = item.payload?.url;
  const clickable = (item.item_type === "paper" && item.payload) || !!url;
  function openItem() {
    if (item.item_type === "paper" && item.payload) openDrawer(item.payload);
    else if (url) window.open(url, "_blank", "noopener");
  }

  async function saveNote() {
    setSaving(true);
    try {
      await api.updateNote(item.id, note);
      toast("Note saved.", "success");
      setOpen(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 transition hover:border-brand-200 dark:border-ink-800">
      <div className="flex items-center justify-between gap-3 p-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="chip-muted shrink-0 text-[11px] capitalize">{item.item_type}</span>
          {clickable ? (
            <button
              onClick={openItem}
              title={item.item_type === "paper" ? "Open details" : "Open link"}
              className="truncate text-left font-medium text-ink-700 transition hover:text-brand-600 hover:underline dark:text-ink-200"
            >
              {item.title}
            </button>
          ) : (
            <span className="truncate">{item.title}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className={`text-xs font-medium transition ${
              hasNote ? "text-brand-600" : "text-ink-400 hover:text-brand-600"
            }`}
            title={hasNote ? "Edit note" : "Add note"}
          >
            {hasNote ? "📝 Note" : "＋ Note"}
          </button>
          <select
            value={item.collection_id || ""}
            onChange={(e) => onMove(item.id, e.target.value || null)}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900/40"
            title="Move to collection"
          >
            <option value="">Unfiled</option>
            {colls.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            className="text-xs font-medium text-rose-500 hover:text-rose-600"
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Inline note preview (collapsed) */}
      {hasNote && !open && (
        <p className="border-t border-ink-100 px-3 py-2 text-xs italic text-ink-500 dark:border-ink-800">
          “{item.notes}”
        </p>
      )}

      {/* Note editor (expanded) */}
      {open && (
        <div className="space-y-2 border-t border-ink-100 p-3 dark:border-ink-800">
          <textarea
            autoFocus
            className="input h-24 resize-none text-sm"
            placeholder="Your notes on this item — why it matters, key takeaways…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost !py-1.5 text-xs" onClick={() => { setNote(item.notes || ""); setOpen(false); }}>
              Cancel
            </button>
            <button className="btn-primary !py-1.5 text-xs" onClick={saveNote} disabled={saving}>
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Collections() {
  const toast = useToast();
  const [colls, setColls] = useState<Coll[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null); // null = All
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("brand");

  async function refresh() {
    const [c, it] = await Promise.all([api.listCollections(), api.listItems()]);
    setColls(c);
    setItems(it);
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    if (!name.trim()) return;
    await api.createCollection(name, "", color);
    toast(`Collection “${name}” created.`, "success");
    setName(""); setCreating(false); setColor("brand");
    refresh();
  }

  async function removeColl(id: string, n: string) {
    await api.deleteCollection(id);
    toast(`Deleted “${n}” (items kept).`, "info");
    if (active === id) setActive(null);
    refresh();
  }

  async function moveTo(itemId: string, collId: string | null) {
    await api.moveItem(itemId, collId);
    refresh();
  }

  async function removeItem(id: string) {
    await api.deleteItem(id);
    toast("Removed.", "info");
    refresh();
  }

  const shown = active ? items.filter((i) => i.collection_id === active) : items;
  const unfiled = items.filter((i) => !i.collection_id).length;

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon.star className="h-5 w-5 text-amber-400" /> Library & collections
        </h2>
        <button className="btn-soft" onClick={() => setCreating((v) => !v)}>
          ＋ New collection
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3 dark:border-ink-800 dark:bg-ink-900/40">
          <input
            autoFocus
            className="input flex-1"
            placeholder="Collection name (e.g. Thesis — Chapter 2)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <div className="flex gap-1.5">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-7 w-7 rounded-full bg-gradient-to-br ${COLORS[c]} ${
                  color === c ? "ring-2 ring-ink-400 ring-offset-2 dark:ring-offset-ink-900" : ""
                }`}
              />
            ))}
          </div>
          <button className="btn-primary" onClick={create}>Create</button>
        </div>
      )}

      {/* Collection chips (filter) */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`chip border transition ${
            active === null
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
              : "border-ink-200 bg-white text-ink-600 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400"
          }`}
        >
          All <span className="text-ink-400">{items.length}</span>
        </button>
        {colls.map((c) => (
          <span key={c.id} className="group relative">
            <button
              onClick={() => setActive(c.id)}
              className={`chip border transition ${
                active === c.id
                  ? "border-ink-400 dark:border-ink-500"
                  : "border-ink-200 dark:border-ink-800"
              } bg-white text-ink-700 dark:bg-ink-900/40 dark:text-ink-200`}
            >
              <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${COLORS[c.color] || COLORS.brand}`} />
              {c.name} <span className="text-ink-400">{c.count}</span>
              <span
                onClick={(e) => { e.stopPropagation(); removeColl(c.id, c.name); }}
                className="ml-0.5 text-ink-300 hover:text-rose-500"
                title="Delete collection"
              >
                ×
              </span>
            </button>
          </span>
        ))}
        {unfiled > 0 && (
          <button
            onClick={() => setActive(null)}
            className="chip border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"
            title="Items not in any collection"
          >
            {unfiled} unfiled
          </button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {shown.length === 0 && (
          <p className="rounded-lg bg-ink-50 px-3 py-6 text-center text-sm text-ink-400 dark:bg-ink-900/40">
            {active ? "No items in this collection yet." : "Save items from search to build your library."}
          </p>
        )}
        {shown.map((it) => (
          <ItemRow
            key={it.id}
            item={it}
            colls={colls}
            onMove={moveTo}
            onRemove={removeItem}
            onSaved={refresh}
          />
        ))}
      </div>
    </section>
  );
}
