import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {SITE_NAME}
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
