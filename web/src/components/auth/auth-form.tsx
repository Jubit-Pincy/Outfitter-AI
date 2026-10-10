"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { useOutfitter } from "@/lib/store";

type Mode = "login" | "signup";

const MIN_PASSWORD = 8;

/**
 * One form, two modes. Sign-up asks for a name as well and says what the
 * password has to be before it is typed, rather than rejecting it afterwards.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const adopt = useOutfitter((s) => s.adopt);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = mode === "signup";
  const tooShort = signup && password.length > 0 && password.length < MIN_PASSWORD;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { user } = signup
        ? await api.signup(name.trim(), email.trim(), password)
        : await api.login(email.trim(), password);
      await adopt(user);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onSubmit={submit}
      className="w-full max-w-[420px] rounded-2xl bg-paper p-7 sm:p-9"
    >
      <span className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-ink-soft">
        {signup ? "NEW WARDROBE" : "WELCOME BACK"}
      </span>
      <h1 className="mb-1.5 font-heading text-[26px] leading-tight font-semibold text-ink">
        {signup ? "Make an account" : "Sign in"}
      </h1>
      <p className="mb-6 max-w-[38ch] font-serif text-[17px] leading-[1.45] text-ink-soft italic">
        {signup
          ? "You start with the tagged wardrobe the tagger already read, and can change every piece of it."
          : "Your wardrobe, your day and your picks are waiting where you left them."}
      </p>

      <div className="grid gap-4">
        {signup ? (
          <Field
            id="name"
            label="Name"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
        ) : null}

        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[13px] font-medium text-ink-soft"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? MIN_PASSWORD : undefined}
              aria-describedby={signup ? "password-hint" : undefined}
              className="w-full rounded-[10px] border border-stitch bg-linen px-3.5 py-2.5 pr-11 text-[15px] text-ink outline-none transition-colors focus:border-fern focus:ring-2 focus:ring-fern/25"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft transition-colors hover:text-ink"
            >
              {visible ? (
                <EyeOff className="size-[17px]" strokeWidth={1.7} />
              ) : (
                <Eye className="size-[17px]" strokeWidth={1.7} />
              )}
            </button>
          </div>
          {signup ? (
            <p
              id="password-hint"
              className={`mt-1.5 text-[12.5px] ${tooShort ? "text-destructive" : "text-ink-soft"}`}
            >
              At least {MIN_PASSWORD} characters.
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-destructive/35 bg-destructive/10 px-3.5 py-2.5 text-[13.5px] text-destructive"
        >
          {error}
        </p>
      ) : null}

      <motion.button
        whileTap={{ scale: 0.99 }}
        type="submit"
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-fern disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {busy ? "One moment" : signup ? "Create account" : "Sign in"}
      </motion.button>

      <p className="mt-5 text-center text-[13.5px] text-ink-soft">
        {signup ? "Already have an account? " : "No account yet? "}
        <Link
          href={signup ? "/login" : "/signup"}
          className="font-medium text-fern underline underline-offset-[3px]"
        >
          {signup ? "Sign in" : "Make one"}
        </Link>
      </p>
    </motion.form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-stitch bg-linen px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-fern focus:ring-2 focus:ring-fern/25"
        {...rest}
      />
    </div>
  );
}
