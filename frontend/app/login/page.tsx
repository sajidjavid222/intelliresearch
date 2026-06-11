"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { GoogleButton } from "@/components/GoogleButton";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const r =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name);
      localStorage.setItem("rp_token", r.access_token);
      toast(`Welcome${r.user.name ? ", " + r.user.name : ""}!`, "success");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const onGoogleSuccess = useCallback(
    (token: string) => {
      localStorage.setItem("rp_token", token);
      toast("Signed in with Google.", "success");
      router.push("/dashboard");
    },
    [router, toast]
  );
  const onGoogleError = useCallback((msg: string) => setError(msg), []);

  const FEATURES = [
    "Save papers, datasets & grants",
    "Subscribe to topics & get alerts",
    "AI literature reviews & proposals",
    "Personalized grant matching",
  ];

  return (
    <div className="mx-auto mt-6 grid max-w-4xl gap-6 md:mt-12 md:grid-cols-2">
      {/* Left: value prop */}
      <div className="hidden flex-col justify-center rounded-3xl border border-ink-200/60 bg-gradient-to-br from-brand-500 to-accent-600 p-8 text-white shadow-lift md:flex">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
          ✦
        </span>
        <h2 className="mt-5 font-display text-3xl font-semibold leading-tight">
          Your research, on autopilot.
        </h2>
        <p className="mt-2 text-sm text-white/80">
          One account unlocks your saved library, alerts, and AI-powered tools.
        </p>
        <ul className="mt-6 space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs">
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: form */}
      <div className="card p-7">
        <h1 className="text-xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {mode === "login"
            ? "Sign in to access your research dashboard."
            : "Free forever. No credit card required."}
        </p>

        <div className="mt-5 space-y-3">
          {mode === "register" && (
            <div>
              <label className="label">Full name</label>
              <input className="input" placeholder="Ada Lovelace"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" placeholder="you@university.edu" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" placeholder="At least 6 characters" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          <button className="btn-primary w-full !py-3" onClick={submit} disabled={loading}>
            {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>

        <GoogleButton onSuccess={onGoogleSuccess} onError={onGoogleError} />

        <button
          className="mt-5 w-full text-center text-sm text-ink-500 transition hover:text-brand-600"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
        >
          {mode === "login" ? (
            <>Need an account? <span className="font-semibold text-brand-600">Register</span></>
          ) : (
            <>Already have an account? <span className="font-semibold text-brand-600">Sign in</span></>
          )}
        </button>
      </div>
    </div>
  );
}
