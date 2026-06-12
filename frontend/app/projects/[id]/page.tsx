"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ProjectDetail, ProjectItem, ProjectTask, SavedItemRow } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";
import { COLOR_KEYS, dueBadge, projectColor } from "@/lib/projectTheme";

/* --------------------------- item helpers --------------------------- */
const TYPE_ICON: Record<string, (p: { className?: string }) => JSX.Element> = {
  paper: Icon.paper,
  dataset: Icon.dataset,
  grant: Icon.grant,
  conference: Icon.conf,
  repo: Icon.code,
  patent: Icon.patent,
  collaborator: Icon.people,
};

function itemUrl(payload: any): string | undefined {
  return (
    payload?.url || payload?.pdf_url || payload?.download_url || payload?.html_url || undefined
  );
}

function TypeBadge({ type }: { type: string }) {
  const I = TYPE_ICON[type] || Icon.fileText;
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
      <I className="h-4 w-4" />
    </span>
  );
}

/* ------------------------------ tasks ------------------------------- */
function TaskRow({
  t,
  onToggle,
  onDelete,
}: {
  t: ProjectTask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const badge = dueBadge(t.due_date);
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <button
        onClick={onToggle}
        aria-label={t.done ? "Mark incomplete" : "Mark complete"}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
          t.done
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-ink-300 text-transparent hover:border-brand-400 dark:border-ink-600"
        }`}
      >
        <Icon.check className="h-3 w-3" />
      </button>
      <span
        className={`flex-1 text-sm ${
          t.done ? "text-ink-400 line-through" : "text-ink-800 dark:text-ink-100"
        }`}
      >
        {t.title}
      </span>
      {badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      )}
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="shrink-0 rounded p-1 text-ink-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
      >
        <Icon.close className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TasksPanel({
  project,
  onChange,
}: {
  project: ProjectDetail;
  onChange: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  async function add() {
    if (!title.trim()) return;
    try {
      await api.addTask(project.id, title.trim(), due || null);
      setTitle("");
      setDue("");
      onChange();
    } catch {
      toast("Could not add task.", "error");
    }
  }
  async function toggle(t: ProjectTask) {
    await api.updateTask(t.id, { done: !t.done });
    onChange();
  }
  async function del(t: ProjectTask) {
    await api.deleteTask(t.id);
    onChange();
  }

  const open = project.tasks.filter((t) => !t.done).length;

  return (
    <section className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon.check className="h-5 w-5 text-brand-500" /> Tasks
        </h2>
        {project.tasks.length > 0 && (
          <span className="text-xs text-ink-400">
            {open} open · {project.tasks.length} total
          </span>
        )}
      </div>

      <div className="divide-y divide-ink-100 dark:divide-ink-800">
        {project.tasks.map((t) => (
          <TaskRow key={t.id} t={t} onToggle={() => toggle(t)} onDelete={() => del(t)} />
        ))}
      </div>
      {project.tasks.length === 0 && (
        <p className="py-2 text-sm text-ink-400">No tasks yet — add one below.</p>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3 dark:border-ink-800 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          type="date"
          className="input sm:w-40"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          title="Due date (optional)"
        />
        <button className="btn-primary shrink-0" onClick={add} disabled={!title.trim()}>
          Add
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ notes ------------------------------- */
function NotesPanel({ project }: { project: ProjectDetail }) {
  const toast = useToast();
  const [notes, setNotes] = useState(project.notes || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateProject(project.id, { notes });
      setDirty(false);
      toast("Notes saved.", "success");
    } catch {
      toast("Could not save notes.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon.fileText className="h-5 w-5 text-brand-500" /> Notes
        </h2>
        {dirty && (
          <button className="btn-primary !py-1 !text-xs" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <textarea
        className="input min-h-[160px] resize-y leading-relaxed"
        placeholder="Ideas, findings, methodology notes, meeting minutes…"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        onBlur={() => dirty && save()}
      />
    </section>
  );
}

/* --------------------------- library picker ------------------------- */
function LibraryPicker({
  projectId,
  onClose,
  onChange,
}: {
  projectId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<SavedItemRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setItems((await api.listItems()) as SavedItemRow[]);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(it: SavedItemRow) {
    setBusyId(it.id);
    try {
      if (it.project_id === projectId) {
        await api.unassignItem(projectId, it.id);
      } else {
        await api.assignItem(projectId, it.id);
      }
      await load();
      onChange();
    } catch {
      toast("Could not update item.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-ink-200/70 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-950"
        style={{ animation: "scale-in .2s cubic-bezier(.2,.8,.2,1) both" }}
      >
        <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-800">
          <h3 className="font-display text-lg font-semibold">Add from your library</h3>
          <button onClick={onClose} aria-label="Close" className="btn-ghost h-8 w-8 !px-0">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {items === null ? (
            <p className="p-4 text-sm text-ink-400">Loading your saved items…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">
              You haven&apos;t saved any items yet. Save papers, datasets and more from search.
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((it) => {
                const inProject = it.project_id === projectId;
                const elsewhere = it.project_id && it.project_id !== projectId;
                return (
                  <button
                    key={it.id}
                    onClick={() => toggle(it)}
                    disabled={busyId === it.id}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      inProject
                        ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10"
                        : "border-ink-100 hover:border-brand-200 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-900"
                    }`}
                  >
                    <TypeBadge type={it.item_type} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium">{it.title}</span>
                      <span className="text-xs capitalize text-ink-400">
                        {it.item_type}
                        {elsewhere ? " · in another project" : ""}
                      </span>
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        inProject
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-ink-300 text-transparent dark:border-ink-600"
                      }`}
                    >
                      <Icon.check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-ink-100 p-3 text-right dark:border-ink-800">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ items ------------------------------- */
function ItemsPanel({
  project,
  onChange,
}: {
  project: ProjectDetail;
  onChange: () => void;
}) {
  const [picking, setPicking] = useState(false);

  async function remove(it: ProjectItem) {
    await api.unassignItem(project.id, it.id);
    onChange();
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon.star className="h-5 w-5 text-brand-500" /> Items
          <span className="text-sm font-normal text-ink-400">({project.items.length})</span>
        </h2>
        <button onClick={() => setPicking(true)} className="btn-ghost !py-1.5 !text-xs">
          <Icon.arrowRight className="h-3.5 w-3.5 rotate-[-45deg]" /> Add from library
        </button>
      </div>

      {project.items.length === 0 ? (
        <p className="py-2 text-sm text-ink-400">
          No items yet. Add saved papers, datasets, grants and more from your library.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {project.items.map((it) => {
            const href = itemUrl(it.payload);
            const inner = (
              <>
                <TypeBadge type={it.item_type} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium group-hover:text-brand-600">
                    {it.title}
                  </span>
                  <span className="text-xs capitalize text-ink-400">{it.item_type}</span>
                </span>
              </>
            );
            return (
              <div
                key={it.id}
                className="group flex items-center gap-3 rounded-xl border border-ink-100 p-2.5 dark:border-ink-800"
              >
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
                )}
                <button
                  onClick={() => remove(it)}
                  aria-label="Remove from project"
                  className="shrink-0 rounded p-1 text-ink-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                >
                  <Icon.close className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {picking && (
        <LibraryPicker
          projectId={project.id}
          onClose={() => setPicking(false)}
          onChange={onChange}
        />
      )}
    </section>
  );
}

/* ------------------------------ header ------------------------------ */
function Header({
  project,
  onChange,
}: {
  project: ProjectDetail;
  onChange: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [color, setColor] = useState(project.color);
  const theme = projectColor(project.color);

  async function save() {
    try {
      await api.updateProject(project.id, { name: name.trim() || project.name, description, color });
      setEditing(false);
      onChange();
    } catch {
      toast("Could not save changes.", "error");
    }
  }
  async function del() {
    if (!confirm(`Delete project “${project.name}”? Saved items stay in your library.`)) return;
    try {
      await api.deleteProject(project.id);
      toast("Project deleted.", "info");
      router.push("/projects");
    } catch {
      toast("Could not delete project.", "error");
    }
  }

  return (
    <header className="card overflow-hidden p-0">
      <div className={`h-2 w-full bg-gradient-to-r ${theme.bar}`} />
      <div className="p-6">
        <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-ink-400 transition hover:text-brand-600">
          <Icon.arrowRight className="h-3.5 w-3.5 rotate-180" /> All projects
        </Link>

        {editing ? (
          <div className="space-y-3">
            <input
              className="input font-display text-xl font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
            />
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full bg-gradient-to-br ${projectColor(c).bar} ring-offset-2 transition dark:ring-offset-ink-950 ${
                    color === c ? "ring-2 ring-ink-400" : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>
                Save
              </button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="mt-1 max-w-2xl text-sm text-ink-500">{project.description}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description);
                  setColor(project.color);
                  setEditing(true);
                }}
                className="btn-ghost"
              >
                <Icon.fileText className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={del}
                aria-label="Delete project"
                className="btn-ghost !px-2 text-ink-400 hover:text-rose-500"
              >
                <Icon.close className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ------------------------------- page ------------------------------- */
export default function ProjectWorkspace({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const loadedOnce = useRef(false);

  async function refresh() {
    try {
      setProject(await api.getProject(params.id));
    } catch {
      if (!loadedOnce.current && typeof window !== "undefined" && !localStorage.getItem("rp_token")) {
        router.push("/login");
        return;
      }
      setNotFound(true);
    } finally {
      loadedOnce.current = true;
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("rp_token")) {
      router.push("/login");
      return;
    }
    refresh();
  }, []);

  if (notFound) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <p className="font-semibold text-ink-700 dark:text-ink-200">Project not found</p>
        <Link href="/projects" className="btn-primary">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-ink-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        Loading project…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header project={project} onChange={refresh} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ItemsPanel project={project} onChange={refresh} />
          <NotesPanel key={project.updated_at} project={project} />
        </div>
        <div className="lg:col-span-1">
          <TasksPanel project={project} onChange={refresh} />
        </div>
      </div>
    </div>
  );
}
