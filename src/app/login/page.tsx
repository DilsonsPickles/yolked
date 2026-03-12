"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { login, signup } from "./actions";
import { createClient } from "@/lib/supabase/client";

function SubmitButton({ isSignUp }: { isSignUp: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
    >
      {pending && (
        <svg
          className="h-5 w-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {pending
        ? isSignUp
          ? "Creating account..."
          : "Signing in..."
        : isSignUp
          ? "Create Account"
          : "Sign In"}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("Sign in failed. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setError(null);

    const result = isSignUp ? await signup(formData) : await login(formData);

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white">
          YOLKED
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isSignUp ? "Create your account" : "Welcome back"}
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label
              htmlFor="displayName"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="••••••••"
          />
        </div>

        {isSignUp && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="••••••••"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <SubmitButton isSignUp={isSignUp} />
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-zinc-950 px-2 text-zinc-500">or</span>
        </div>
      </div>

      <button
        onClick={async () => {
          setGoogleLoading(true);
          setError(null);
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
            if (error) {
              setError(error.message);
              setGoogleLoading(false);
            }
          } catch {
            setError("Failed to start Google sign in");
            setGoogleLoading(false);
          }
        }}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {googleLoading ? (
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        {googleLoading ? "Signing in..." : "Continue with Google"}
      </button>

      <p className="mt-6 text-center text-sm text-zinc-400">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="font-medium text-orange-500 hover:text-orange-400"
        >
          {isSignUp ? "Sign In" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
