"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";

export function AccountSettings() {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `intelliresearch-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data has been exported.", "success");
    } catch {
      toast("Could not export your data.", "error");
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api.deleteAccount();
      localStorage.removeItem("rp_token");
      toast("Your account has been deleted.", "info");
      router.push("/");
    } catch {
      toast("Could not delete your account.", "error");
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon.fileText className="h-5 w-5 text-ink-400" /> Account &amp; data
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Download everything we store about you, or permanently delete your account.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={exportData} className="btn-ghost">
          <Icon.download className="h-4 w-4" /> Export my data (JSON)
        </button>
        {!confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          >
            <Icon.close className="h-4 w-4" /> Delete account
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            This permanently deletes your account, saved library, notes, and monitored
            topics. This cannot be undone.
          </p>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/80">
            Type <span className="font-mono font-bold">DELETE</span> to confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="input max-w-[160px]"
            />
            <button
              onClick={deleteAccount}
              disabled={confirmText !== "DELETE" || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
              }}
              disabled={busy}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
