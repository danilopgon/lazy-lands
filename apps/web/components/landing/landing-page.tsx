import { PublicTop } from './public-top'
import { LandHero } from './hero'
import { LandMarquee } from './marquee'
import { LandPillars } from './pillars'
import { LandBriefing } from './briefing'
import { LandHowItWorks } from './how-it-works'
import { LandPhilosophy } from './philosophy'
import { LandCTA } from './cta'
import { LandFooter } from './footer'

/**
 * Composes all landing sections in order: nav, hero, marquee, pillars, briefing, how-it-works, philosophy, CTA, footer.
 *
 * @returns {React.ReactElement} The full landing page element.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen">
      <PublicTop />
      <main id="main-content">
        <LandHero />
        <LandMarquee />
        <LandPillars />
        <LandBriefing />
        <LandHowItWorks />
        <LandPhilosophy />
        <LandCTA />
      </main>
      <LandFooter />
    </div>
  )
}
