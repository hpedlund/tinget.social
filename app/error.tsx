"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Boundary for runtime errors in client components (e.g. the ranking filters). */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Något gick fel</h1>
      <p className="text-lg text-muted-foreground">
        Sidan kunde inte visas. Försök igen eller gå till startsidan.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={reset}>Försök igen</Button>
        <Link
          href="/"
          className="font-medium underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Till startsidan
        </Link>
      </div>
    </div>
  );
}
