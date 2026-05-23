# Legacy PHP / HTML / JS prototypes

These files were early ACSIS UI mockups (XAMPP-era). They are **not** used by the React + Vite app.

The live app lives under `src/views/`, `src/layouts/`, and `server/`.

## What stayed in `src/pages/`

Only **CSS** files remain in `src/pages/*-ui/` because React views still import them. Styles should gradually move to `src/styles/`.

## Restoring a file

Copy from this archive back to `src/pages/` only if you are intentionally maintaining the old prototype.
