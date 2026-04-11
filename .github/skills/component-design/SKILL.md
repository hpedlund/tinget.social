---
name: component-design
description: "Design and build UI components with shadcn/ui, Tailwind CSS, and proper accessibility. Use when creating new UI features, designing page layouts, building data display components, or auditing accessibility (WCAG 2.1 AA) for tinget.social."
argument-hint: "Describe the UI you need (e.g., 'politician profile card with voting history')"
---

# Component Design Skill

Design accessible, responsive UI components using shadcn/ui and Tailwind CSS for a Swedish civic tech platform.

## When to Use

- Designing new UI components or page layouts
- Building data display components (tables, cards, lists)
- Creating form components with validation
- Auditing accessibility compliance
- Establishing visual patterns for the design system

## Procedure

### 1. Understand the Requirements

- What data does this component display?
- Who is the target user?
- What interactions are needed?
- What states exist (loading, error, empty, populated)?
- Where does this component appear (page, sidebar, card)?

### 2. Choose shadcn/ui Base Components

Select from the shadcn/ui library before building custom:

| Need | shadcn/ui Component |
|------|-------------------|
| Navigation | `NavigationMenu`, `Breadcrumb`, `Tabs` |
| Data display | `Table`, `Card`, `Badge`, `Avatar` |
| Data input | `Input`, `Select`, `Checkbox`, `RadioGroup`, `Textarea` |
| Feedback | `Alert`, `Toast`, `Skeleton`, `Progress` |
| Layout | `Sheet`, `Dialog`, `Popover`, `Separator` |
| Actions | `Button`, `DropdownMenu`, `Command` |

Install as needed: `npx shadcn@latest add <component>`

### 3. Design the Component Tree

```
PageComponent (Server)
├── Header (Server)
│   ├── Breadcrumb
│   └── PageTitle
├── FilterBar (Client — needs interactivity)
│   ├── SearchInput
│   ├── PartySelect
│   └── SortSelect
├── DataList (Server)
│   ├── DataCard × N
│   │   ├── Avatar
│   │   ├── Info
│   │   └── ActionButtons
│   └── Pagination (Client)
├── EmptyState (conditional)
└── Attribution (Server)
```

Mark each component as **Server** (default) or **Client** (needs interactivity).

### 4. Implement with Tailwind

#### Layout Pattern

```tsx
<div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
  <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
      <p className="mt-2 text-lg text-muted-foreground">Description</p>
    </header>
    <main>{/* Content */}</main>
  </div>
</div>
```

#### Card Grid Pattern

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>{item.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  ))}
</div>
```

#### Data Table Pattern

```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Party</TableHead>
        <TableHead className="text-right">Votes</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((row) => (
        <TableRow key={row.id}>
          <TableCell className="font-medium">{row.name}</TableCell>
          <TableCell><Badge variant="outline">{row.party}</Badge></TableCell>
          <TableCell className="text-right">{row.votes}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

{/* Mobile alternative */}
<div className="space-y-4 sm:hidden">
  {data.map((row) => (
    <Card key={row.id}>{/* Mobile-friendly card layout */}</Card>
  ))}
</div>
```

### 5. Handle All States

Every data component needs these states:

```tsx
// Loading (Skeleton)
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

// Empty
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// Error
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {message}
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry} className="ml-2">Try again</Button>}
      </AlertDescription>
    </Alert>
  );
}
```

### 6. Accessibility Audit

Run through this checklist for every component:

- [ ] **Keyboard**: All interactive elements reachable via Tab, activatable via Enter/Space
- [ ] **Focus**: Visible focus ring on all interactive elements
- [ ] **Labels**: All inputs have `<Label>`, icon buttons have `aria-label`
- [ ] **Headings**: Proper hierarchy (h1 → h2 → h3), no skipped levels
- [ ] **Color**: 4.5:1 contrast for text, 3:1 for large text and UI elements
- [ ] **Images**: Descriptive `alt` text (empty `alt=""` for decorative)
- [ ] **Motion**: Respect `prefers-reduced-motion`
- [ ] **Screen reader**: Dynamic updates use `aria-live`, status use `role="status"`
- [ ] **Touch**: Minimum 44x44px touch targets on mobile

### 7. Civic Design Tokens

For tinget.social's civic/trust theme:

```
Typography:
- Headings: font-bold tracking-tight (strong, authoritative)
- Body: text-base (readable, clear)
- Data: tabular-nums (aligned numbers)

Colors (via shadcn/ui CSS variables):
- Primary: Neutral, trustworthy blue (not political party blue)
- Background: Clean white/light gray
- Accents: Sparing use — data visualization only
- Party colors: Only in party-specific contexts (badges, charts)

Spacing:
- Generous whitespace for readability
- Consistent use of space-y-4, space-y-6, space-y-8
- Cards with p-6 padding

Tone:
- Professional, neutral, institutional
- No casual language in UI chrome
- Clear, descriptive button labels (not "Click here")
```
