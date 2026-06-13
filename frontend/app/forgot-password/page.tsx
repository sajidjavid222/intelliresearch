"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
    } catch {
      // Intentionally ignore — we always show the same confirmation.
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="card p-7">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
              <Icon.bell className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-ink-500">
              If an account exists for <b>{email}</b>, we&apos;ve sent a link to reset your
              password. It expires in one hour.
            </p>
            <a href="/login" className="btn-ghost mt-5 inline-flex">
              Back to sign in
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-ink-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <div className="mt-5 space-y-3">
              <input
                className="input"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoFocus
              />
              <button
                className="btn-primary w-full !py-3"
                onClick={submit}
                disabled={loading || !email.trim()}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </div>
            <a
              href="/login"
              className="mt-5 block text-center text-sm text-ink-500 transition hover:text-brand-600"
            >
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
