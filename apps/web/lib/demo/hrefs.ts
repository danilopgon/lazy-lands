/**
 * Every navigation target inside the public demo. The demo is a self-contained
 * island: none of these links ever point at an authenticated route (`/dashboard`,
 * `/campaigns/*`, …), so an anonymous visitor can never be bounced to a login
 * wall from inside the tour. The one deliberately external link is `home`, which
 * returns to the public landing page.
 */
export const demoHrefs = {
  home: '/',
  campaign: '/demo',
  npcs: '/demo/npcs',
  factions: '/demo/factions',
  arcs: '/demo/arcs',
  memory: '/demo/memory',
  logSession: '/demo/sessions/new',
  prepare: '/demo/prepare',
  generated: '/demo/sessions/generated',
  export: '/demo/sessions/generated/export',
} as const

export type DemoHref = (typeof demoHrefs)[keyof typeof demoHrefs]
