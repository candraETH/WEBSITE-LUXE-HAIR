## Purpose
Help AI coding agents become immediately productive in this Next.js + Tailwind repo.

## Big picture
- Next.js (app router, Next 16) single-page marketing / storefront app. Entry under `app/` with `app/layout.tsx` (global fonts + wrappers) and `app/page.tsx` (homepage composition).
- UI is component-driven: reusable primitives live in `ui/`, page-level composed widgets live in `components/`.
- Styling via Tailwind with CSS variables for theming in `app/globals.css` and `tailwind.config.ts` (see color tokens and `darkMode: ['class']`).

## Dev commands / workflows
- Use pnpm (repo contains `pnpm-lock.yaml`). Run scripts from `package.json`:
  - `pnpm dev` — local dev (runs `next dev --turbo`).
  - `pnpm build` — production build (`next build`).
  - `pnpm start` — run built app.
  - `pnpm lint` — runs `next lint`.
- Note: `next.config.mjs` sets `typescript.ignoreBuildErrors = true`. Be cautious: type errors may be ignored at build time.

## Key patterns & conventions
- Absolute imports use `@/*` (see `tsconfig.json` paths). Use `@/components/...` and `@/ui/...`.
- UI primitives vs composed components:
  - `ui/` contains low-level, reusable primitives (Radix wrappers, inputs, toasts). Prefer extending these for consistent behavior.
  - `components/` contains page-specific composed widgets (e.g., `product-section.tsx`, `hero.tsx`).
- Utility helper: `lib/utils.ts` exports `cn()` (Tailwind `clsx` + `twMerge`) — use for class merging to respect tailwind-merge rules.
- Data-in-component: example product arrays are in `app/page.tsx` (static product lists passed into `ProductSection`). Follow this pattern for small local demo datasets.

## Styling & theming specifics
- Global CSS variables and tokens live in `app/globals.css`. Colors are referenced as HSL tokens and mapped in `tailwind.config.ts` (e.g., `--primary`, `--card`).
- Fonts use `next/font/google` inside `app/layout.tsx` with CSS variables `--font-inter` and `--font-playfair` — preserve the variable usage when updating layout.

## TypeScript & linting
- Project is TypeScript-first; `tsconfig.json` enables `strict` but Next is configured to ignore build-time type errors. Prefer fixing type issues locally rather than relying on the config.

## Where to change behavior
- Add or modify UI primitives in `ui/` to affect all components. Example: change input styling in `ui/input.tsx`.
- Page composition lives in `app/page.tsx` and other `app/*` routes — modify here for layout/content changes.

## Integration / external deps
- Many UI primitives are Radix-based (see multiple `@radix-ui/*` deps). Reuse Radix patterns already used in `ui/` components.
- Charts use `recharts`, carousel uses `embla-carousel-react`. See `components/carousel` or `ui/chart.tsx` for usage patterns.

## Examples (do this, not generic guidance)
- To add a new homepage product block: follow `app/page.tsx` — create a product array, then pass it into `components/product-section.tsx` via the `products` prop.
- To merge classes safely: use `cn()` from `lib/utils.ts` instead of manual string concatenation.

## What not to assume
- There are no tests in the repo; don't add test-only changes without asking.
- Type errors may not fail CI locally because `next.config.mjs` ignores them — ensure critical type fixes are still applied.

## Where I looked
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/`, `ui/`, `lib/utils.ts`, `tailwind.config.ts`, `next.config.mjs`, `package.json`, `tsconfig.json`.

---
If any part is unclear or you'd like more detail (examples for a specific component or workflow), tell me which area to expand.
