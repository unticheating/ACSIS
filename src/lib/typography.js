/**
 * Shadcn/ui typography scale — single source for JSX `className` strings.
 * Legacy CSS should mirror these with the same Tailwind utilities via @apply.
 * @see https://ui.shadcn.com/docs/components/typography
 */
export const type = {
  h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight text-balance text-foreground',
  h2: 'scroll-m-20 text-3xl font-semibold tracking-tight text-foreground',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight text-foreground',
  h4: 'scroll-m-20 text-xl font-semibold tracking-tight text-foreground',
  lead: 'text-xl text-muted-foreground',
  p: 'leading-7 text-foreground',
  large: 'text-lg font-semibold text-foreground',
  small: 'text-sm font-medium leading-none text-foreground',
  muted: 'text-sm text-muted-foreground',
  mutedMedium: 'text-sm font-medium text-muted-foreground',
  caption: 'text-xs text-muted-foreground',
  label: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
  pageTitle: 'scroll-m-20 text-2xl font-bold tracking-tight text-foreground',
  pageMeta: 'text-sm font-medium text-muted-foreground',
  emptyTitle: 'text-lg font-semibold text-foreground',
  emptyBody: 'text-sm leading-6 text-muted-foreground',
  cardCode: 'text-sm font-bold uppercase tracking-wide text-foreground',
  cardName: 'text-sm font-medium text-muted-foreground',
  cardFooter: 'text-xs text-muted-foreground',
  cardFooterEmphasis: 'text-xs font-semibold text-muted-foreground',
  bannerTitle: 'text-2xl font-extrabold tracking-tight',
  bannerSubtitle: 'text-base font-medium',
  bannerPeriod: 'text-sm font-medium opacity-85',
  streamTitle: 'text-base font-semibold text-foreground',
  streamMeta: 'text-sm text-muted-foreground',
  uiControl: 'text-sm font-semibold',
  pill: 'text-xs font-semibold',
  sectionEyebrow: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  sectionTitle: 'scroll-m-20 text-xl font-bold tracking-tight text-foreground md:text-2xl',
  streamSectionTitle: 'text-sm font-bold uppercase tracking-wider text-muted-foreground',
}
