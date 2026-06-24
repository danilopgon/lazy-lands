import { PublicTop } from './landing/public-top'
import { LandHero } from './landing/hero'
import { LandMarquee } from './landing/marquee'
import { LandPillars } from './landing/pillars'
import { LandBriefing } from './landing/briefing'
import { LandHowItWorks } from './landing/how-it-works'
import { LandPhilosophy } from './landing/philosophy'
import { LandCTA } from './landing/cta'
import { LandFooter } from './landing/footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicTop />
      <main>
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
