
# Documentation Page

Add a dedicated `/docs` route that documents the GTM Engine — its purpose, its modules, and how each module works — with interactive Mermaid diagrams rendered client-side.

## What gets built

### 1. New route `/docs`

- Add `<Route path="/docs" element={<Docs />} />` in `src/App.tsx` (above the catch-all).
- Add a "Docs" link/button in `src/components/Header.tsx` that navigates to `/docs`.
- The page follows the existing design system (tokens from `index.css`, shadcn components, dark-mode safe).

### 2. Page structure

```text
/docs
├─ Hero: "GTM Engine — Documentation"
│   └─ Short paragraph: what the app is (padel-industry intelligence platform
│      for enriching clubs, people, Instagram, visual identity, and exposing
│      results to external CRMs).
│
├─ Table of contents (sticky sidebar on desktop, top links on mobile)
│
├─ Module: Club Intelligence Enrichment
│   ├─ Description (7-step pipeline, inputs, outputs, AI models used)
│   └─ Mermaid diagram (rendered)
│
├─ Module: Visual DNA Analysis
│   ├─ Description (Gemini visual + Claude voice + CTLT matching,
│   │  Invisibility Score formula, image persistence to storage)
│   └─ Mermaid diagram
│
├─ Module: People & Instagram Intelligence
│   ├─ Description (person dossiers + standalone Instagram scraping)
│   └─ Mermaid diagram
│
└─ Module: External CRM API
    ├─ Description (all api-* endpoints, x-api-key auth, request/response
    │  shapes for the main ones)
    └─ Mermaid diagram
```

### 3. Mermaid rendering

- Install the `mermaid` npm package.
- Create a small `<MermaidDiagram code={...} />` component in
  `src/components/docs/MermaidDiagram.tsx` that:
  - Initializes mermaid once with `{ startOnLoad: false, theme: 'default' }`.
  - Re-renders on theme change (reads the `dark` class on `<html>`, switches
    between `default` and `dark` themes).
  - Renders the SVG into a ref via `mermaid.render(id, code)`.
  - Wraps the SVG in a bordered, scroll-safe container using design tokens.

### 4. Content per module (diagrams)

Each module gets a `flowchart TD` (or `sequenceDiagram` for the API) showing
the real pipeline as it exists in the code today.

- **Club Intelligence**: Step 0 Perplexity discovery → Step 1 Firecrawl scrape → Step 2 Firecrawl branding → Step 3 Apify Instagram → Step 4 Perplexity research (4 parallel queries) → Step 5 Claude synthesis → Step 6 auto-trigger Visual DNA.
- **Visual DNA**: input (enriched_club_id | instagram_handle) → Apify scrape (cached check) → download + resize images → upload to storage → Gemini visual analysis → Claude voice analysis → Claude CTLT matching → score calculation → persist to `enriched_clubs`.
- **People & Instagram**: dual-pipeline diagram — person enrichment worker path and Instagram scraper worker path with shared job/rows tables.
- **External CRM API**: sequence diagram — CRM client → `x-api-key` check → `api-*` function → internal worker/DB → response.

### 5. New files

| File | Purpose |
|---|---|
| `src/pages/Docs.tsx` | The documentation page |
| `src/components/docs/MermaidDiagram.tsx` | Client-side Mermaid renderer |
| `src/components/docs/ModuleSection.tsx` | Reusable section wrapper (title, description, diagram) |
| `src/components/docs/mermaid-sources.ts` | The 4 diagram source strings kept in one place |

### 6. Files modified

- `src/App.tsx` — register the `/docs` route.
- `src/components/Header.tsx` — add a "Docs" nav link.
- `package.json` — add `mermaid` dependency (via `bun add mermaid`).
- `index.html` — update `<title>` and meta description if still defaults.

## Out of scope

- No backend changes, no new edge functions.
- No auth-gating on `/docs` (public page).
- No content management / editing UI — content is static React/TSX.
