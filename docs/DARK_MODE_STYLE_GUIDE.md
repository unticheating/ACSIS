# ACSIS Dark Mode Design System

Premium charcoal UI with **institution color** as the only hue accent (Emerald, Ocean, Crimson, Violet, Amber, Slate).

## Architecture

| Layer | File | Role |
|-------|------|------|
| Tokens | `src/styles/design-tokens.css` | Semantic `--bg-*`, `--fg-*`, spacing |
| Institution apply | `src/lib/institutionThemeApply.js` | Runtime CSS vars from palette + dark neutrals |
| Color math | `src/lib/institutionColorScale.js` | Brand scale 50–700, tint/shade |
| Shell dark | `src/styles/shell-dark.css` | Legacy per-component overrides |
| **Design system** | `src/styles/dark-mode-system.css` | Unified dark surfaces, tables, buttons |
| Shadcn | `src/index.css` | Tailwind `hsl(var(--primary))` synced at runtime |

Loaded in `AppShell.jsx` after admin `style.css`. Default theme: **dark** (`ThemeContext`).

---

## 1. Institution color system

When an admin picks a palette in **Institution Settings**, `setInstitutionTheme()` updates `<html>`:

| Token | Use |
|-------|-----|
| `--acsis-brand` / `--acsis-brand-500` | Primary buttons, progress fill, active tab border |
| `--acsis-brand-600` | Button default / hover base |
| `--acsis-brand-700` | Disabled primary |
| `--acsis-brand-50` / `100` | Subtle tinted backgrounds |
| `--acsis-brand-muted-bg` | Active nav, table header, tab active |
| `--acsis-brand-muted-text` | Accent text, stat values, breadcrumbs |
| `--acsis-brand-subtle` | Row hover, focus ring wash |
| `--acsis-brand-ring` | Card hover border, focus |

**Dark backgrounds stay neutral** (`#0A0A0A` canvas) — institution color does **not** tint the whole shell (except subtle borders).

---

## 2. Dark palette (strict)

| Role | Hex | CSS variable |
|------|-----|----------------|
| Main background | `#0A0A0A` | `--acsis-canvas`, `--bg-canvas` |
| Sidebar | `#111111` | `--acsis-sidebar-bg` |
| Card / surface | `#1A1A1A` | `--bg-surface` |
| Muted surface | `#171717` | `--bg-surface-muted` |
| Elevated (inputs, modals) | `#212121` | `--bg-elevated` |
| Table row alt | `#1F1F1F` | `--acsis-dark-row-alt` |
| Border | `#2A2A2A` | `--border-default` |
| Primary text | `#F5F5F5` | `--fg-default` |
| Secondary text | `#A3A3A3` | `--fg-muted` |
| Muted text | `#6B7280` | `--fg-subtle` |

---

## 3. Components

### Cards
- Radius: **14px** (`rounded-xl`)
- Border: `1px solid var(--border-default)`
- Shadow: soft inner highlight + `0 2px 12px rgba(0,0,0,0.35)`
- Hover: institution ring border + lift (`hover:-translate-y-px` on buttons/cards where applicable)

### Buttons
- Primary: `bg-primary` → institution HSL via shadcn
- Hover: lighten + `translateY(-1px)` + stronger shadow
- Ghost/secondary: `--bg-elevated` surface

### Tables
- Header: `--acsis-brand-muted-bg`
- Rows: even `#1F1F1F`, hover `--acsis-brand-subtle`
- Dividers: `--border-muted`

### Sidebar
- Inactive: `#A3A3A3` text, `#6B7280` icons
- Active: institution fill + ring shadow
- Hover: 10% brand wash

---

## 4. Page-specific notes

| Page | Status |
|------|--------|
| Institution Settings | Palette uses `.admin-settings-palette.is-active` + brand vars |
| User Management | `.table` / `.um-table` via dark-mode-system |
| Classes (admin) | `.panel`, `.acsis-class-card` |
| My Classes (teacher) | `my_classes.css` + `.acsis-mc-tab--active` brand |
| Live Monitoring | `teacher-detections-live.css` + empty/board/seat dark rules |
| Student Enrolled Classes | `StudentExamsPage` → `bg-card`, `text-primary` |
| Student Performance / Reports | `reports.css` panels + tab-btn |
| Exam session (fullscreen) | Still light-first; migrate to `exam_session.react.css` separately |

---

## 5. Role consistency

Admin, Teacher, and Student share:
- `AppShell` + `admin-ui/style.css` + `dark-mode-system.css`
- Same sidebar/nav tokens
- Same institution propagation

Only **nav items** and page content differ by role.

---

## 6. Developer guidelines

**Do**
- Use `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary`
- Use `var(--acsis-brand)` in custom CSS for accents
- Call `applyInstitutionTheme` when palette changes (already in `InstitutionThemeContext`)

**Don't**
- `bg-white`, `text-gray-900`, `bg-green-600` (use semantic/brand tokens)
- Hardcode emerald `#16A34A` in new components
- Tint full page background with institution secondary in dark mode

**Tailwind escape hatch:** `html.dark .bg-white` is remapped to `--bg-surface` in `dark-mode-system.css` for legacy markup.

---

## 7. Testing institution colors

1. Log in as admin → **Settings** → pick **Amber** (or any palette) → Save  
2. Confirm sidebar active item, primary buttons, stat values, and table header tint **amber**  
3. Switch to **Ocean** — accents should turn blue without changing charcoal background  
4. Check Teacher Live Monitoring + Student Enrolled Classes for consistent surfaces
