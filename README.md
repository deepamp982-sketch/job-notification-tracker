## Job Notification App – Design System Foundation

This project contains the visual and interaction foundation for a premium B2C Job Notification SaaS. It intentionally focuses **only** on the design system (no product features yet).

### Design Philosophy
- **Calm, intentional, coherent, confident**
- **No gradients, glassmorphism, neon, or noisy animations**
- **Serious B2C product feel, not playful or experimental**

### Core Principles
- **Color system**
  - Background: `#F7F6F3` (off‑white)
  - Primary text: `#111111`
  - Accent (primary + danger): `#8B0000` (deep red)
  - Success: muted green (single calm hue)
  - Warning: muted amber (single calm hue)
  - Usage is tightly constrained so the UI never exceeds four perceptible accent hues; background and near‑black text are treated as neutrals.

- **Typography**
  - Headings: modern serif (e.g. `Playfair Display`, falling back to system serif)
  - Body: workhorse sans‑serif (e.g. `Inter`, falling back to system sans)
  - Base body size: 16–18px, line height 1.6–1.8
  - Text blocks are constrained to a max width of 720px for readability.

- **Spacing system**
  - Only these values are allowed: `8px`, `16px`, `24px`, `40px`, `64px`.
  - Layout utilities and components are built directly on this scale; no arbitrary spacing.

- **Layout structure (global)**
  - Top Bar → Context Header → Primary Workspace (70%) + Secondary Panel (30%) → Proof Footer
  - Every page follows this same skeleton for a calm, predictable experience.

### Files
- `index.html` – Example screen demonstrating the full layout and core components.
- `styles/design-system.css` – Design tokens, layout primitives, component styles, interaction rules, and patterns for empty/error states.
- `package.json` – Minimal project metadata; no runtime dependencies required.

### Usage
Open `index.html` in a browser to see the reference implementation of:
- Global page shell (top bar, context header, workspace, secondary panel, proof footer)
- Buttons, inputs, cards, badges, progress indicator, status indicator
- Copyable prompt box and guidance for secondary panel
- Structured error and empty states

New product features should **compose these primitives** rather than introduce new ad‑hoc styles. Keep future additions aligned with:
- Existing color tokens
- Existing typography scale
- The 8/16/24/40/64 spacing system
- The same layout skeleton and interaction rules

