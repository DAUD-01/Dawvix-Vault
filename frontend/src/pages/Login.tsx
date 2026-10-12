import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/api";
import { ArrowRight, Eye, EyeOff, Shield } from "lucide-react";

export const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await authService.login(username.trim(), password);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Authentication failed. Please verify credentials or backend connection.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-canvas text-slate-100 lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)]">
      <section className="flex min-h-[36vh] flex-col justify-between border-b border-outline/[0.08] bg-surface px-6 py-7 sm:px-10 sm:py-9 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-16 lg:py-12">
        <div className="inline-flex w-fit items-center gap-2.5 text-sm font-semibold tracking-tight text-on-surface">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline/[0.14] bg-surface-variant/40 text-primary">
            <Shield className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          Dawvix Vault
        </div>

        <div className="max-w-xl py-12 lg:py-0">
          <h1 className="max-w-lg font-serif text-4xl font-medium leading-[1.08] tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
            Your connected files, ready when you are.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
            Sign in to browse, organize, and preview files in your vault.
          </p>
        </div>

        <p className="hidden text-xs text-slate-500 lg:block">
          Dawvix Vault <span aria-hidden="true">/</span> Secure file access
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
              Sign in to your vault
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use your vault credentials to continue.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-3 text-sm text-[color:var(--color-error)]"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-200"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ui-control mt-2 w-full border-outline/[0.14] px-3.5 py-3 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:bg-surface-variant focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200"
              >
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-control block w-full border-outline/[0.14] px-3.5 py-3 pr-12 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:bg-surface-variant focus:ring-2 focus:ring-teal-400/20"
                />
                <button
                  type="button"
                  className="glass-button absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  aria-pressed={isPasswordVisible}
                  aria-controls="password"
                >
                  {isPasswordVisible ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="ui-button-primary mt-2 min-h-11 w-full px-4 py-3 font-semibold"
            >
              <span>{isLoading ? "Signing in…" : "Sign in"}</span>
              {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};
