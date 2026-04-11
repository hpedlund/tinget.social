---
description: "Use when building UI components with shadcn/ui and Tailwind CSS. Covers component composition, accessibility requirements, responsive design, and theming conventions."
applyTo: "**/components/**"
---

# Component Conventions

## shadcn/ui Usage

- Use shadcn/ui components as the base — extend, don't replace
- Install components via `npx shadcn@latest add <component>`
- Generated components live in `components/ui/`
- Customization: modify the generated files, don't wrap unnecessarily

```tsx
// Good — use shadcn/ui Button directly
import { Button } from "@/components/ui/button";
<Button variant="outline" size="sm">Click me</Button>

// Bad — wrapping for no reason
function MyButton(props) { return <Button {...props} /> }
```

## Tailwind Conventions

### Mobile-First Responsive Design

Always write base styles for mobile, then add breakpoints:

```tsx
// Good — mobile-first progression
<div className="flex flex-col gap-4 sm:flex-row sm:gap-6 lg:gap-8">

// Bad — desktop-first
<div className="flex flex-row gap-8 max-sm:flex-col max-sm:gap-4">
```

### Theme Colors

Use CSS variables from shadcn/ui theme — never hardcode hex values:

```tsx
// Good — theme variables
<div className="bg-background text-foreground border-border">
<div className="text-muted-foreground bg-muted">
<div className="bg-primary text-primary-foreground">

// Bad — hardcoded colors
<div className="bg-white text-gray-900 border-gray-200">
<div className="text-[#6b7280] bg-[#f3f4f6]">
```

### Spacing & Typography

Use Tailwind's default scale consistently — don't mix custom values:

```tsx
// Good — consistent Tailwind scale
<div className="space-y-4 p-6">
  <h1 className="text-3xl font-bold tracking-tight">Title</h1>
  <p className="text-lg text-muted-foreground">Subtitle</p>
</div>
```

## Accessibility Requirements

### Labels and ARIA

```tsx
// Every form input needs a label
<Label htmlFor="search">Search politicians</Label>
<Input id="search" placeholder="Name or party..." />

// Icon-only buttons need accessible names
<Button variant="ghost" size="icon" aria-label="Close menu">
  <X className="h-4 w-4" />
</Button>

// Dynamic content updates
<div aria-live="polite" role="status">
  {results.length} results found
</div>
```

### Keyboard Navigation

- All interactive elements must be keyboard-accessible
- Focus visible on all interactive elements (shadcn/ui handles this)
- Logical tab order — don't use `tabIndex` > 0

### Color Contrast

- Text: minimum 4.5:1 contrast ratio (AA)
- Large text (18px+ or 14px+ bold): minimum 3:1
- UI components and graphics: minimum 3:1

## Component Patterns

### Data Display with Loading and Error States

```tsx
// Server component with Suspense
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<MemberListSkeleton />}>
      <MemberList />
    </Suspense>
  );
}

function MemberListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
```

### Empty States

```tsx
import { Users } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No results found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Try adjusting your search or filters.
      </p>
    </div>
  );
}
```

### Attribution Component

Always include on pages showing Riksdagen data:

```tsx
function RiksdagenAttribution() {
  return (
    <p className="text-xs text-muted-foreground">
      Källa: Sveriges riksdag
    </p>
  );
}
```
