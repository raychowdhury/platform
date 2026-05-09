# Claude Skill: Trevise Frontend Design Patterns

Use this skill when working in `apps/web` and the task involves page design, layout changes, new UI components, or visual refinements. The goal is to extend the current Trevise frontend without breaking its existing product language.

## Mission

Design and build UI that feels like the current Trevise platform:

- Marketing and legal pages feel editorial, sharp, and premium.
- Auth pages feel polished and atmospheric, but still minimal.
- Dashboard pages feel like an institutional trading terminal: dense, fast, data-heavy, and operational.
- Reuse the existing local UI layer before inventing new primitives.

## Stack And Architecture

- Framework: Next.js app router in `apps/web/src/app`
- React: React 19
- Styling: Tailwind CSS v4 via `src/app/globals.css`
- Utility class merge: `cn()` from `src/lib/utils.ts`
- Generic UI primitives: `src/components/ui/*`
- Product-specific composites:
  - Marketing: `src/components/marketing/MarketingLayout.tsx`
  - Dashboard: `src/components/dashboard/*`
  - Auth: `src/components/auth/shared.tsx`
- Icons: `lucide-react`
- Data viz: `recharts`
- Theme handling: `src/hooks/use-theme.tsx`
- App providers: `src/components/providers/providers.tsx`

## Core Visual Language

Base all new UI on the tokens and rules in `src/app/globals.css`.

- Typography:
  - Primary sans is `Inter`.
  - Numeric and operational text uses `JetBrains Mono`.
  - Use `.font-display` for headlines and major labels.
  - Use mono for metrics, tickers, timestamps, section codes, pills, and dense controls.
- Shape:
  - The system biases toward sharp edges.
  - Most panels are square or nearly square.
  - Inputs keep a micro-radius.
  - Full pills are only for intentional circular or badge treatments.
- Color:
  - Dark mode is the default product experience.
  - Accent is electric teal.
  - Positive state uses `--bull`.
  - Negative state uses `--bear`.
  - Prefer token-based colors like `bg-background`, `text-muted-foreground`, `text-bull`, `text-bear`.
- Surface treatment:
  - Dashboard and institutional surfaces are flat, dense, and bordered.
  - Marketing can use gradients, radial glows, and selective blur.
  - Do not add random glassmorphism to dashboard surfaces.
- Motion:
  - Keep transitions subtle and mostly functional.
  - Use hover/focus/expand transitions, not decorative animation.
  - Existing acceptable exceptions: marquee ticker, live pulse, tiny state feedback.

## Page Family Rules

### 1. Marketing Pages

Reference files:

- `src/app/page.tsx`
- `src/components/marketing/MarketingLayout.tsx`
- `src/app/about/page.tsx`
- `src/app/status/page.tsx`
- `src/app/terms/page.tsx`

Rules:

- Wrap with `MarketingLayout`.
- Use strong editorial hierarchy with large display headlines.
- Use section dividers with `border-b hairline`.
- Use mono eyebrow labels with uppercase tracking.
- Prefer grid systems with clean borders over generic card galleries.
- Background atmosphere is allowed:
  - radial gradients
  - soft blur fields
  - subtle grids
- CTAs should feel crisp and premium, not playful.

Preferred motifs:

- `Eyebrow` rows with code + line
- `Strip` headers
- bordered metric grids
- structured feature blocks
- venue/logo grids
- code or API panels

### 2. Auth Pages

Reference files:

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/components/auth/shared.tsx`

Rules:

- Use the split-screen auth shell pattern already present.
- Left side handles the form and brand mark.
- Right side is a high-polish visual/testimonial/info panel.
- Forms are simple and direct. Avoid over-designed field chrome.
- Keep copy compact and operational.
- Prefer shared helpers like `Field` for repeated label structure.

### 3. Dashboard Pages

Reference files:

- `src/components/dashboard/Layout.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/Topbar.tsx`
- `src/app/(dashboard)/dashboard/*`

Rules:

- Dashboard is a trading workstation, not a marketing site.
- Favor density, hierarchy, and operational clarity over spaciousness.
- Layouts should compose multiple panels in responsive grids.
- Every panel should have a clear job:
  - show state
  - support action
  - summarize movement
  - expose alerts
- Use mono micro-labels and tabular numbers heavily.
- Avoid oversized border radius, large empty padding, or decorative gradients unless the specific component family already uses them.

## Global Implementation Rules

- Prefer existing components before creating new ones.
- Use `cn()` to compose class names.
- Use `@/*` imports.
- Mark files with `"use client"` only when state, effects, browser APIs, or handlers require it.
- Keep local state close to the component when it is just presentational interaction.
- Preserve the current demo-first/product-prototype style:
  - local constants
  - mock arrays
  - local interaction state
  - client-side prototypes
- For generic buttons, cards, form controls, tooltips, dropdowns, tabs, separators, tables, and dialogs, check `src/components/ui/*` first.
- For domain-specific panels, build a custom composite in `src/components/dashboard` or the relevant page file.

## Component Skills

### Skill 1: Brand And Navigation

Reference:

- `src/components/marketing/MarketingLayout.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/Topbar.tsx`

Patterns:

- Brand mark is a compact square tile with `T`, usually using accent fill.
- Brand text uses `font-display` with small mono version labeling.
- Marketing nav is slim, centered, and premium.
- Dashboard nav is coded, sectional, and operational.
- Sidebar sections should group links by function and show tiny mono codes.
- Active navigation should be obvious through contrast and a precise accent marker.

Do:

- Use small mono metadata around nav.
- Treat dashboard nav like a control surface.
- Keep icon sizing compact and consistent.

Do not:

- Introduce rounded consumer-style nav pills everywhere.
- Add oversized hero-style navigation inside dashboard views.

### Skill 2: Panel And Strip Composition

Reference:

- `src/app/globals.css`
- `src/app/page.tsx`

Patterns:

- Use `.panel` or `.glass` as the primary surface wrappers when appropriate.
- Use `.strip` for terminal-like panel headers.
- Use `hairline` borders to structure dense information.
- Footer strips can summarize totals, universe counts, or status.

Use this when:

- building feature panels
- creating watchlists
- presenting order or signal modules
- showing code or metrics panes

### Skill 3: Metric Cards

Reference:

- `src/components/dashboard/PortfolioOverview.tsx`
- `src/app/about/page.tsx`
- `src/app/status/page.tsx`

Patterns:

- Small uppercase mono label
- Large display or mono value
- Optional delta pill or contextual sub-stat
- Dense spacing, usually 3 or 4-up in grids

Rules:

- Use tabular numerals for values.
- Color changes with `text-bull` and `text-bear`.
- Keep labels terse.
- Avoid generic analytics-dashboard gradients unless the component already uses them.

### Skill 4: Trading Chart Modules

Reference:

- `src/components/dashboard/MarketChart.tsx`
- `src/app/(dashboard)/dashboard/charts/page.tsx`
- `src/components/ui/chart.tsx`
- `src/lib/chart-data.ts`

Patterns:

- Chart header includes symbol, change, type/exchange context, and quick controls.
- Timeframe toggles are compact and mono.
- Indicators appear as tiny control chips.
- Charts sit inside bordered operational surfaces, not floating consumer cards.
- Tooltips use theme tokens, not default library styling.

Rules:

- Reuse `recharts`.
- Pull colors from CSS variables.
- Use `font-mono` for price and timing data.
- Keep axes, grid, tooltip, and cursor subdued.
- Emphasize data, not decoration.

### Skill 5: Tables, Watchlists, And Rows

Reference:

- `src/components/dashboard/Positions.tsx`
- landing watchlist patterns in `src/app/page.tsx`

Patterns:

- Rows are compact.
- Symbol or identity is left-aligned and visually strongest.
- Numeric columns are right-aligned and mono.
- Side, status, or direction uses low-noise tinted pills.
- Hover state is subtle.

Rules:

- Use consistent row rhythm.
- Keep borders faint.
- Do not introduce noisy zebra striping unless there is a strong reason.

### Skill 6: Forms And Order Entry

Reference:

- `src/app/(auth)/*`
- `src/components/auth/shared.tsx`
- `src/components/dashboard/QuickTrade.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/input.tsx`

Patterns:

- Labels are small uppercase mono captions.
- Inputs are flat and direct.
- Secondary affordances sit inline with labels or field edges.
- Order-entry controls should feel precise and actionable.

Rules:

- Prefer straightforward field stacks.
- Use compact inline segmented toggles for buy/sell, range, or mode switching.
- Surface derived values like fees, totals, and balances near the input.

### Skill 7: Notifications, Menus, And Utility Chrome

Reference:

- `src/components/dashboard/Topbar.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/tooltip.tsx`

Patterns:

- Utility chrome is compact, mono, and bordered.
- Notification flyouts are structured like lightweight terminal panels.
- Account menus use existing dropdown primitives with Trevise typography and spacing.

Rules:

- Prefer Radix-backed local primitives for overlays.
- Keep elevation subtle.
- Use borders and background contrast more than blur or shadow.

### Skill 8: Legal, Status, And Editorial Information Pages

Reference:

- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/status/page.tsx`
- `src/app/about/page.tsx`

Patterns:

- Large display heading
- Mono eyebrow
- Bordered content blocks
- Sidebar or in-page navigation when content is long
- Stats and highlights broken into clean bordered grids

Rules:

- Keep prose readable but structured.
- Use layout rhythm from the current legal/about pages.
- Avoid blog-like softness or magazine whimsy.

## Preferred Reuse Order

When adding UI, search in this order:

1. `src/components/ui/*` for primitives
2. `src/components/dashboard/*` for terminal/product composites
3. `src/components/marketing/MarketingLayout.tsx` for public-page patterns
4. existing page files in `src/app/*` for section-level composition
5. only then create a new component

## Copy And Tone Guidance

- Product copy should feel concise, institutional, and high-signal.
- Avoid startup fluff and vague adjectives.
- Favor labels like:
  - `Portfolio · Live`
  - `System quota`
  - `Realtime service health`
  - `Run AI scan`
- Keep CTA text short and operational.

## Things To Preserve

- Sharp-edge institutional visual language
- High use of mono metadata
- Token-driven bullish/bearish state coloring
- The split between reusable primitives and domain-specific composites
- The contrast between public marketing polish and dashboard operational density

## Things To Avoid

- Generic SaaS pastel dashboards
- Large rounded cards everywhere
- Purple-heavy AI aesthetics
- Random animation or glow in dashboard surfaces
- Overuse of glassmorphism outside auth/marketing accents
- Introducing a third visual language that conflicts with current Trevise patterns

## Practical Prompting Guide For Claude

When asked to add or redesign frontend in this repo, Claude should follow this checklist:

1. Identify whether the work belongs to marketing, auth, or dashboard.
2. Inspect the nearest existing page/component in that family.
3. Reuse local primitives and tokens first.
4. Match typography, spacing density, and border treatment to that family.
5. Use mono for metadata and numeric data.
6. Use `text-bull`, `text-bear`, `accent`, `hairline`, `panel`, `glass`, and `strip` consistently.
7. Keep interactions practical and lightweight.

## Example Directives

- "Create this as a Trevise dashboard panel, not a generic SaaS card."
- "Use bordered terminal-strip headers and mono metadata."
- "Match the editorial marketing style from `src/app/page.tsx` and `MarketingLayout.tsx`."
- "Build on `components/ui` primitives and compose a product-specific wrapper if needed."
- "Keep dark-mode dashboard surfaces dense, flat, and operational."
