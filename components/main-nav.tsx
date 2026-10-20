"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/site";
import { cn } from "@/lib/utils";

// usePathname() excludes basePath, so this works on both the GitHub Pages
// sub-path and the custom domain.
function isCurrent(pathname: string, href: string) {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return href === "/" ? normalized === "/" : normalized.startsWith(href);
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Huvudmeny">
      <ul className="flex flex-wrap gap-x-1 gap-y-1 sm:gap-x-2">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
                  current
                    ? "font-semibold text-foreground underline decoration-2 underline-offset-8"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
