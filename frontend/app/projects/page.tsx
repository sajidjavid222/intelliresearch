"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ProjectSummary } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { EmptyState, Icon } from "@/components/ui";
import { COLOR_KEYS, projectColor, relTime } from "@/lib/projectTheme";

function ColorSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {COLOR_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full bg-gradient-to-br ${projectColor(c).bar} ring-offset-2 transition dark:ring-offset-ink-950 ${
            value === c ? "ring-2 ring-ink-400" : "hover:scale-110"
          }`}
        />
      ))}
    </div>
  );
}

function NewProjectCard({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("brand");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createProject(name.trim(), description.trim(), color);
      toast(`Project “${name.trim()}” created.`, "success");
      setName("");
      setDescription("");
      setColor("brand");
      setOpen(false);
      onCreated();
    } catch {
      toast("Could not create project.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex min-h-[150px] flex-col items-center justify-center gap-2 border-dashed text-ink-400 transition hover:text-brand-600"
      >
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
          <Icon.arrowRight className="h-5 w-5 rotate-[-45deg]" />
        </span>
        <span className="text-sm font-semibold">New project</span>
      </button>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-semibold">New project</h3>
      <div className="mt-3 space-y-3">
        <input
          autoFocus
          className="input"
          placeholder="Project name — e.g. PhD Thesis"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <input
          className="input"
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <ColorSwatch value={color} onChange={setColor} />
        </div>
        <div className="flex gap-2 pt-1">
          <button className="btn-primary" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create project"}
          </button>
          <button className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  p,
  onDeleted,
}: {
  p: ProjectSummary;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const theme = projectColor(p.color);

  async function del(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete project “${p.name}”? Saved items stay in your library.`)) return;
    try {
      await api.deleteProject(p.id);
      toast("Project deleted.", "info");
      onDeleted();
    } catch {
      toast("Could not delete project.", "error");
    }
  }

  return (
    <Link href={`/projects/${p.id}`} className="card card-hover group relative overflow-hidden p-0">
      <div className={`h-1.5 w-full bg-gradient-to-r ${theme.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-brand-600">
            {p.name}
          </h3>
          <button
            onClick={del}
            aria-label="Delete project"
            className="shrink-0 rounded-lg p-1 text-ink-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-500/10"
          >
            <Icon.close className="h-4 w-4" />
          </button>
        </div>
        {p.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-500">{p.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className={`chip ${theme.chip}`}>
            <Icon.paper className="h-3 w-3" /> {p.item_count} items
          </span>
          <span className="chip-muted">
            <Icon.check className="h-3 w-3" />
            {p.open_tasks > 0 ? `${p.open_tasks} open` : `${p.task_count} tasks`}
          </span>
          <span className="ml-auto text-ink-400">{relTime(p.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);

  async function refresh() {
    try {
      setProjects(await api.listProjects());
    } catch {
      router.push("/login");
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("rp_token")) {
      router.push("/login");
      return;
    }
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <header className="card relative overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-blob rounded-full bg-gradient-to-br from-brand-300/40 to-accent-300/40 blur-2xl"
        />
        <div className="relative">
          <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Icon.fileText className="h-3.5 w-3.5" /> Workspaces
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Research Projects</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Organize your work into projects — gather papers and datasets, keep notes,
            and track tasks and deadlines, all in one place.
          </p>
        </div>
      </header>

      {projects === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton mb-3 h-5 w-2/3" />
              <div className="skeleton mb-4 h-3 w-full" />
              <div className="flex gap-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NewProjectCard onCreated={refresh} />
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} onDeleted={refresh} />
          ))}
        </div>
      )}

      {projects !== null && projects.length === 0 && (
        <EmptyState
          icon={<Icon.fileText className="h-5 w-5" />}
          title="No projects yet"
          hint="Create your first project above to start organizing your research."
        />
      )}
    </div>
  );
}
