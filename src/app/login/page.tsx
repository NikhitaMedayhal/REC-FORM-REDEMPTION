"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../_components/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const result = await login(userName, password);

    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Login failed");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    router.replace("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2">
          <span className="kicker">pesu academy authentication</span>
          <h1 className="text-2xl font-display text-fg">access_terminal</h1>
        </div>

        <div className={`term ${shake ? "shake" : ""}`}>
          <div className="term-bar">
            <div className="term-dots">
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="term-dot" />
            </div>
            <span className="term-title">login@pesu-club</span>
          </div>

          <form className="term-body" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="userName">srn / username</label>
              <input
                id="userName"
                type="text"
                autoComplete="username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="PES1UG2XCSXXX"
                required
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label htmlFor="password">password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
              />
            </div>

            {error && <p className="field-error mb-3">{"> error: " + error}</p>}

            <button type="submit" className="btn btn-solid w-full justify-center" disabled={submitting}>
              {submitting ? "authenticating..." : "authenticate"}
            </button>
          </form>
        </div>

        <p className="field-hint mt-4 text-center">
          credentials are verified against PESU Academy. we never store your
          password.
        </p>
      </div>
    </main>
  );
}
