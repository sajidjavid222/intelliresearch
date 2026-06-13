"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read the token from the URL on the client (avoids a Suspense boundary).
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit() {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const r = await api.resetPassword(token || "", password);
      localStorage.setItem("rp_token", r.access_token);
      toast("Your password has been updated.", "success");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Could not reset your password.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="card p-7">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        {token === "" ? (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
            This reset link is missing its token. Please use the link from your email, or{" "}
            <a href="/forgot-password" className="font-medium underline">request a new one</a>.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-500">Enter a new password for your account.</p>
            <div className="mt-5 space-y-3">
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </p>
              )}
              <button
                className="btn-primary w-full !py-3"
                onClick={submit}
                disabled={loading || token === null}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </div>
          </>
        )}
        <a
          href="/login"
          className="mt-5 block text-center text-sm text-ink-500 transition hover:text-brand-600"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
