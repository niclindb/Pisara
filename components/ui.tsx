// Small building blocks shared by every page, styled with the design scheme.

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const variants = {
  primary: "bg-primary text-primary-text hover:opacity-90",
  secondary: "border border-border bg-surface text-text hover:bg-page",
  quiet: "px-1 text-primary underline underline-offset-4 hover:no-underline",
  danger: "border border-danger bg-surface text-danger hover:bg-danger-bg",
  bright: "bg-bright text-bright-text hover:opacity-90",
} as const;
export type ButtonVariant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section {...props} className={`rounded-card border border-hairline bg-surface p-5 sm:p-6 ${className}`} />;
}

export function PageTitle({ children, eyebrow }: { children: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">{eyebrow}</p>}
      <h1 className="text-[28px] leading-tight sm:text-[32px]">{children}</h1>
    </header>
  );
}

const inputClass =
  "mt-1 block w-full rounded-control border border-border bg-surface px-3 py-2.5 text-text placeholder:text-text-muted";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { className: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <label className="block">
      <span className="font-medium">{label}</span>
      {hint && (
        <span id={`${id}-hint`} className="block text-[15px] text-text-muted">
          {hint}
        </span>
      )}
      {children({ className: inputClass, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-[15px] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function ErrorList({ problems }: { problems: string[] }) {
  if (!problems.length) return null;
  return (
    <div role="alert" className="rounded-card-sm border border-danger bg-danger-bg p-4 text-danger">
      {problems.length === 1 ? (
        <p>{problems[0]}</p>
      ) : (
        <>
          <p className="font-medium">Fix these first:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * The logo, linking home. `onDark` is for the navy hero band, which stays navy
 * in both modes; elsewhere it follows the device's light or dark mode.
 */
export function Wordmark({ href = "/", onDark = false }: { href?: string; onDark?: boolean }) {
  const img = (theme: "light" | "dark", className = "") => (
    <img src={`/brand/pisara-logo-horizontal-${theme}.svg`} alt="" width={108} height={29} className={`h-[29px] w-auto ${className}`} />
  );
  return (
    <Link href={href} className="inline-flex items-center py-1">
      <span className="sr-only">Pisara home</span>
      {onDark ? img("dark") : (
        <>
          {img("light", "dark:hidden")}
          {img("dark", "hidden dark:block")}
        </>
      )}
    </Link>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" | "unpublished" }) {
  const styles = {
    draft: "border border-border text-text-muted",
    published: "bg-success-bg text-success",
    unpublished: "bg-danger-bg text-danger",
  };
  const label = { draft: "Draft", published: "Published", unpublished: "Unpublished" };
  return <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${styles[status]}`}>{label[status]}</span>;
}
