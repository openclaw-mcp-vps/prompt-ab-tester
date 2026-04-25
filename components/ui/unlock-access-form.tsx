"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UnlockAccessForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage("Add the email used at checkout.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Purchase not found for this email yet.");
        return;
      }

      setMessage(payload.message ?? "Access granted. Redirecting to dashboard...");
      window.location.href = "/dashboard";
    } catch {
      setMessage("Unable to unlock right now. Try again in a minute.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={handleUnlock}>
      <label htmlFor="unlock-email" className="block text-sm font-medium text-zinc-300">
        Already purchased? Unlock with checkout email
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="unlock-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="team@company.com"
        />
        <Button type="submit" disabled={isLoading} className="sm:w-auto">
          {isLoading ? "Checking..." : "Unlock Dashboard"}
        </Button>
      </div>
      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
    </form>
  );
}
