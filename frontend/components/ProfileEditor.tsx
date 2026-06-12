"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";

const ROLES = [
  "Undergraduate", "Master's Student", "PhD Scholar", "Postdoc",
  "Assistant Professor", "Associate Professor", "Professor",
  "Research Scientist", "Industry Researcher", "Independent",
];

function TagInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);

  function add(t: string) {
    const clean = t.trim().replace(/,/g, "");
    if (clean && !tags.includes(clean)) onChange([...tags, clean].join(", "));
    setDraft("");
  }
  function remove(t: string) {
    onChange(tags.filter((x) => x !== t).join(", "));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ink-200 bg-white/80 px-2 py-2 dark:border-ink-800 dark:bg-ink-900/60">
      {tags.map((t) => (
        <span key={t} className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {t}
          <button onClick={() => remove(t)} className="ml-1 text-brand-400 hover:text-brand-600">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) { e.preventDefault(); add(draft); }
          if (e.key === "Backspace" && !draft && tags.length) remove(tags[tags.length - 1]);
        }}
        placeholder={tags.length ? "" : "Add interests — press Enter…"}
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-ink-400"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// Counts as "has a profile" once any detail beyond name is filled in.
function hasDetails(u: User): boolean {
  return Boolean(
    u.role || u.institution || u.department || u.country || u.bio ||
    (u.research_interests || "").trim() || u.orcid || u.google_scholar ||
    u.website || u.github
  );
}

function completeness(u: User): number {
  const fields = [
    u.name, u.role, u.institution, (u.research_interests || "").trim(), u.bio,
    u.country, u.orcid || u.google_scholar || u.website || u.github,
  ];
  return Math.round((fields.filter((x) => x && String(x).trim()).length / fields.length) * 100);
}

/* ----------------------------- View (read-only) ----------------------------- */
function ProfileView({ user, onEdit }: { user: User; onEdit: () => void }) {
  const pct = completeness(user);
  const interests = (user.research_interests || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const subtitle = [user.role, user.institution].filter(Boolean).join(" · ");

  const orcidUrl = user.orcid ? `https://orcid.org/${user.orcid}` : undefined;
  const githubUrl = user.github
    ? (user.github.startsWith("http") ? user.github : `https://github.com/${user.github.replace(/^@/, "")}`)
    : undefined;
  const links = [
    { label: "Website", href: user.website || undefined },
    { label: "Google Scholar", href: user.google_scholar || undefined },
    { label: "GitHub", href: githubUrl },
    { label: "ORCID", href: orcidUrl },
  ].filter((l) => l.href);

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-lg font-bold text-white">
            {(user.name || user.email)[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight">
              {user.name || "Your profile"}
            </h2>
            {subtitle && <p className="truncate text-sm text-ink-500">{subtitle}</p>}
            {(user.department || user.country) && (
              <p className="text-xs text-ink-400">
                {[user.department, user.country].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <button onClick={onEdit} className="btn-ghost shrink-0">
          <Icon.fileText className="h-4 w-4" /> Edit profile
        </button>
      </div>

      {user.bio && (
        <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{user.bio}</p>
      )}

      {interests.length > 0 && (
        <div className="mt-4">
          <p className="label">Research interests</p>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((t) => (
              <span key={t} className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{t}</span>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-300">
              <Icon.external className="h-3.5 w-3.5" /> {l.label}
            </a>
          ))}
        </div>
      )}

      {pct < 100 && (
        <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-3 dark:border-ink-800">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs text-ink-400">{pct}% complete</span>
        </div>
      )}
    </section>
  );
}

/* ------------------------------- Edit (form) -------------------------------- */
function ProfileForm({
  user,
  onSaved,
  onCancel,
}: {
  user: User;
  onSaved: (u: User) => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<User>({ ...user });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<User>) => setF((prev) => ({ ...prev, ...patch }));
  const pct = completeness(f);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: f.name, role: f.role, institution: f.institution,
        department: f.department, country: f.country, bio: f.bio,
        research_interests: f.research_interests, affiliation: f.affiliation,
        orcid: f.orcid, google_scholar: f.google_scholar,
        website: f.website, github: f.github,
      });
      onSaved(updated);
      toast("Profile updated.", "success");
    } catch {
      toast("Could not save profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Edit research profile</h2>
          <p className="text-xs text-ink-400">Improves grant & collaborator matching.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-ink-500">{pct}% complete</p>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className="input" value={f.name || ""} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Role">
          <select className="input" value={f.role || ""} onChange={(e) => set({ role: e.target.value })}>
            <option value="">Select role…</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Institution">
          <input className="input" placeholder="e.g. IIIT Delhi" value={f.institution || ""} onChange={(e) => set({ institution: e.target.value })} />
        </Field>
        <Field label="Department">
          <input className="input" placeholder="e.g. Computer Science" value={f.department || ""} onChange={(e) => set({ department: e.target.value })} />
        </Field>
        <Field label="Country">
          <input className="input" placeholder="e.g. India" value={f.country || ""} onChange={(e) => set({ country: e.target.value })} />
        </Field>
        <Field label="ORCID iD">
          <input className="input" placeholder="0000-0000-0000-0000" value={f.orcid || ""} onChange={(e) => set({ orcid: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Research interests">
          <TagInput value={f.research_interests || ""} onChange={(v) => set({ research_interests: v })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Bio">
          <textarea className="input h-20 resize-none" placeholder="A short description of your research focus…"
            value={f.bio || ""} onChange={(e) => set({ bio: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Website">
          <input className="input" placeholder="https://…" value={f.website || ""} onChange={(e) => set({ website: e.target.value })} />
        </Field>
        <Field label="Google Scholar">
          <input className="input" placeholder="Profile URL" value={f.google_scholar || ""} onChange={(e) => set({ google_scholar: e.target.value })} />
        </Field>
        <Field label="GitHub">
          <input className="input" placeholder="username" value={f.github || ""} onChange={(e) => set({ github: e.target.value })} />
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {onCancel && (
          <button className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

/* --------------------------------- Wrapper ---------------------------------- */
export function ProfileEditor({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (u: User) => void;
}) {
  // New/empty profiles open straight into the form; filled ones show the summary.
  const [editing, setEditing] = useState(() => !hasDetails(user));

  if (editing) {
    return (
      <ProfileForm
        user={user}
        onSaved={(u) => { onSaved(u); setEditing(false); }}
        // Allow cancel only if there's an existing profile to fall back to.
        onCancel={hasDetails(user) ? () => setEditing(false) : undefined}
      />
    );
  }
  return <ProfileView user={user} onEdit={() => setEditing(true)} />;
}
