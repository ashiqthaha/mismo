"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { btnPrimary } from "./ui";

/** A form's submit button that disables itself and shows progress while the action runs. */
export function SubmitButton({
  children,
  className = btnPrimary,
  pendingText = "Saving…",
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}
