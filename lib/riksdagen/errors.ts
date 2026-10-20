import type { z } from "zod";

const MAX_ISSUES = 10;

/** Short, readable summary of zod issues (path → message), capped in length. */
export function formatZodError(error: z.ZodError): string {
  const lines = error.issues.slice(0, MAX_ISSUES).map((issue) => {
    const where = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${where}: ${issue.message}`;
  });
  if (error.issues.length > MAX_ISSUES) {
    lines.push(`  … and ${error.issues.length - MAX_ISSUES} more issues`);
  }
  return lines.join("\n");
}
