"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "@/components/Toast";

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
        placeholder={tags.length ? "" : "Add interests — press Enter…"
        }
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-ink-400"
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function ProfileEditor({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (u: User) => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<User>({ ...user });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<User>) => setF((prev) => ({ ...prev, ...patch }));

  // Profile completeness meter.
  const fields = [
    f.name, f.role, f.institution, f.research_interests, f.bio,
    f.country, f.orcid || f.google_scholar || f.website || f.github,
  ];
  const filled = fields.filter((x) => x && String(x).trim()).length;
  const pct = Math.round((filled / fields.length) * 100);

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
          <h2 className="text-lg font-bold">Research profile</h2>
          <p className="text-xs text-ink-400">Improves grant & collaborator matching.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-ink-500">{pct}% complete</p>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-all"
              style={{ width: `${pct}%` }} />
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

      <button className="btn-primary mt-5 w-full sm:w-auto" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </section>
  );
}
