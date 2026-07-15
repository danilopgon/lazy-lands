'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useTranslations } from 'next-intl'

import { edges, nodes } from './data'
import type { EdgeDef, NodeKind } from './types'

// ── Visual mapping (ported from the former static node-graph) ──────────
/**
 * Map an edge kind to its CSS custom-property colour.
 *
 * @param {EdgeDef['kind']} kind - The edge relationship kind.
 * @returns {string} The CSS colour variable string for the edge.
 */
function edgeColor(kind: EdgeDef['kind']): string {
  if (kind === 'enemy') return 'var(--accent)'
  if (kind === 'tense') return 'var(--warn)'
  if (kind === 'lost') return 'var(--mute)'
  return 'var(--ink)'
}

/**
 * Return the SVG dash pattern for frayed edges, or undefined for firm bonds.
 *
 * @param {EdgeDef['kind']} kind - The edge relationship kind.
 * @returns {string|undefined} The SVG stroke-dasharray string, or undefined for solid lines.
 */
function edgeDash(kind: EdgeDef['kind']): string | undefined {
  if (kind === 'lost') return '1.2 1'
  if (kind === 'tense') return '0.7 0.7'
  return undefined
}

// Frayed bonds (tense/lost) keep their dash pattern and ghost in via opacity;
// firm bonds draw themselves with a pathLength stroke reveal.
/**
 * Whether an edge is frayed (tense/lost) — determines fade-in vs stroke-reveal.
 *
 * @param {EdgeDef['kind']} kind - The edge relationship kind.
 * @returns {boolean} True if the edge should use opacity fade-in instead of stroke reveal.
 */
function isFrayed(kind: EdgeDef['kind']): boolean {
  return kind === 'tense' || kind === 'lost'
}

/**
 * Map a node kind to its fill colour.
 *
 * @param {NodeKind} kind - The node category kind.
 * @returns {string} The CSS colour variable string for the node fill.
 */
function nodeFill(kind: NodeKind): string {
  if (kind === 'party') return 'var(--accent)'
  if (kind === 'enemy') return 'var(--danger)'
  if (kind === 'faction') return 'var(--ink)'
  return 'var(--paper)'
}

/**
 * Map a node kind to its label text colour.
 *
 * @param {NodeKind} kind - The node category kind.
 * @returns {string} The CSS colour variable string for the node label text.
 */
function nodeTextFill(kind: NodeKind): string {
  return kind === 'neutral' ? 'var(--ink)' : 'var(--paper)'
}

const nodeIndex = Object.fromEntries(nodes.map((n) => [n.id, n]))

const EASE = [0.16, 1, 0.3, 1] as const

// On-load choreography timeline (seconds)
const EDGE_START = 0.15
const EDGE_STEP = 0.05
const NODE_START = 0.55
const NODE_STEP = 0.05
const ANNOT_DELAY = 1.0
const CARD_LEFT_DELAY = 0.95
const CARD_RIGHT_DELAY = 1.1

/**
 * Animated campaign graph — SVG nodes/edges with parallax cards and scroll transforms.
 *
 * @returns {React.ReactElement} The animated hero graph scene element.
 */
export function HeroGraphScene() {
  const t = useTranslations('Landing.heroGraph')
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  // Layered parallax for depth. The frame is the backdrop: it LAGS the scroll
  // (drifts slightly down) so it appears to sit further back. The paper cards
  // are the foreground: they LEAD the scroll (pull up faster), lifting off the
  // graph. Max relative separation between layers → the 3D reads clearly. The
  // two cards drift by different amounts so they aren't one flat plane.
  const frameY = useTransform(scrollY, [0, 800], [0, 22])
  const noteY = useTransform(scrollY, [0, 800], [0, -128])
  const briefingY = useTransform(scrollY, [0, 800], [0, -88])

  return (
    // Fills whatever square box the parent gives it. Keeping the box square
    // means the 100×100 viewBox never distorts, so nodes stay circular at
    // every width (the old fixed-height box squashed them on narrow screens).
    <div
      aria-hidden="true"
      className="relative h-full w-full"
      style={{ containerType: 'size' }}
    >
      {/* ── Graph frame ── */}
      <motion.div
        className="absolute inset-0 overflow-hidden border-2 border-[var(--border)] bg-[var(--paper-2)] shadow-[1.6cqmin_1.6cqmin_0_var(--shadow)]"
        style={{ y: reduce ? 0 : frameY }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <pattern
              id="llgrid"
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 5 0 L 0 0 0 5"
                fill="none"
                stroke="rgba(26,28,25,0.07)"
                strokeWidth="0.15"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#llgrid)" />

          {/* Edges — firm bonds draw, frayed bonds ghost in */}
          {edges.map((e, i) => {
            const A = nodeIndex[e.a]
            const B = nodeIndex[e.b]
            if (!A || !B) return null
            const delay = EDGE_START + i * EDGE_STEP
            const frayed = isFrayed(e.kind)
            return (
              <motion.line
                key={`${e.a}-${e.b}`}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={edgeColor(e.kind)}
                strokeWidth="0.5"
                strokeDasharray={edgeDash(e.kind)}
                initial={
                  reduce
                    ? false
                    : frayed
                      ? { opacity: 0 }
                      : { pathLength: 0, opacity: 0 }
                }
                animate={
                  frayed ? { opacity: 1 } : { pathLength: 1, opacity: 1 }
                }
                transition={{
                  delay,
                  duration: frayed ? 0.4 : 0.55,
                  ease: EASE,
                }}
              />
            )
          })}

          {/* Nodes — pop in cascade, party (center) first */}
          {nodes.map((node, i) => (
            <motion.g
              key={node.id}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={reduce ? false : { opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: NODE_START + i * NODE_STEP,
                type: 'spring',
                stiffness: 340,
                damping: 20,
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r / 2 + 1.5}
                fill="var(--ink)"
                opacity="0.1"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r / 2}
                fill={nodeFill(node.kind)}
                stroke="var(--ink)"
                strokeWidth="0.5"
              />
              <text
                x={node.x}
                y={node.y + 0.7}
                textAnchor="middle"
                fontSize={node.r > 10 ? 2.1 : 1.7}
                fontWeight="700"
                fontFamily='"Instrument Sans", sans-serif'
                fill={nodeTextFill(node.kind)}
              >
                {node.id === 'party' ? t('nodeParty') : node.label}
              </text>
            </motion.g>
          ))}

          {/* Relationship annotations — settle in last */}
          <motion.g
            fontFamily='"JetBrains Mono", monospace'
            fontSize="1.6"
            fill="var(--ink-2)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: ANNOT_DELAY, duration: 0.5, ease: EASE }}
          >
            <text x="30" y="22">
              {t('annotationFavorSplit')}
            </text>
            <text x="64" y="20">
              {t('annotationOwesFavor')}
            </text>
            <text x="28" y="92">
              {t('annotationCirclingCloser')}
            </text>
          </motion.g>
        </svg>
      </motion.div>

      {/* ── Briefing card (bottom-right) ── */}
      <motion.div
        className="absolute"
        style={{
          right: '-4.4cqmin',
          bottom: '-4.4cqmin',
          width: '57.2cqmin',
          y: reduce ? 0 : briefingY,
        }}
      >
        <motion.div
          className="border-2 border-[var(--border)] bg-[var(--paper)] p-[3.2cqmin] shadow-[1.2cqmin_1.2cqmin_0_var(--accent)]"
          initial={reduce ? false : { opacity: 0, y: -26, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{
            delay: CARD_RIGHT_DELAY,
            type: 'spring',
            stiffness: 220,
            damping: 18,
          }}
        >
          <div className="mb-[1cqmin] font-mono text-[1.9cqmin] uppercase tracking-[0.08em] text-[var(--accent)]">
            {t('briefingKicker')}
          </div>
          <div className="mb-[1.8cqmin] font-serif text-[4.2cqmin] font-semibold leading-[1.05]">
            {t('briefingTitle')}
          </div>
          <div className="mb-[1.8cqmin] font-mono text-[2cqmin] text-[var(--mute)]">
            {t('briefingSpecs')}
          </div>
          <div className="mb-[1.8cqmin] h-[0.4cqmin] bg-[var(--ink)]" />
          <div className="font-serif text-[2.5cqmin] leading-[1.4]">
            {t('briefingBody')}
            <span className="ml-[0.8cqmin] bg-[var(--accent-wash)] px-[0.8cqmin] font-semibold text-[var(--accent-deep)]">
              {t('memoryInPlay')}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Reminder note (top-left, foreground) ── */}
      <motion.div
        className="absolute"
        style={{
          left: '-3.2cqmin',
          top: '3.2cqmin',
          width: '32.4cqmin',
          y: reduce ? 0 : noteY,
        }}
      >
        <motion.div
          className="border-2 border-[var(--border)] p-[2.4cqmin] shadow-[0.6cqmin_0.6cqmin_0_var(--shadow)]"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg-contrast)',
          }}
          initial={reduce ? false : { opacity: 0, y: -22, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{
            delay: CARD_LEFT_DELAY,
            type: 'spring',
            stiffness: 240,
            damping: 17,
          }}
        >
          <div className="mb-[1cqmin] font-mono text-[1.8cqmin] uppercase tracking-[0.1em] opacity-85">
            {t('noteKicker')}
          </div>
          <div className="font-serif text-[2.5cqmin] leading-[1.3]">
            {t('noteBody')}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
