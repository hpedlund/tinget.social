import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sidan finns inte",
};

export default function NotFound() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Sidan finns inte</h1>
      <p className="text-lg text-muted-foreground">
        Sidan du letar efter finns inte eller har flyttats.
      </p>
      <p>
        <Link
          href="/"
          className="font-medium underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Till startsidan
        </Link>
      </p>
    </div>
  );
}
