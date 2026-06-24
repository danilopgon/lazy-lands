type NodeKind = 'party' | 'enemy' | 'faction' | 'neutral'

interface NodeDef {
  id: string
  x: number
  y: number
  r: number
  label: string
  kind: NodeKind
}

interface EdgeDef {
  a: string
  b: string
  kind: 'ally' | 'tense' | 'enemy' | 'member' | 'lost'
}

const nodes: NodeDef[] = [
  { id: 'party', x: 50, y: 50, r: 13, label: 'Party', kind: 'party' },
  { id: 'halia', x: 24, y: 28, r: 10, label: 'Halia', kind: 'neutral' },
  { id: 'ander', x: 76, y: 26, r: 9, label: 'Ander', kind: 'neutral' },
  { id: 'herman', x: 80, y: 70, r: 9, label: 'Herman', kind: 'enemy' },
  { id: 'fibble', x: 18, y: 72, r: 8, label: 'Fibble', kind: 'neutral' },
  { id: 'cryovain', x: 50, y: 84, r: 11, label: 'Cryovain', kind: 'enemy' },
  { id: 'blackbear', x: 90, y: 48, r: 6, label: 'B.Bear', kind: 'faction' },
  { id: 'zhent', x: 10, y: 50, r: 6, label: 'Zhent', kind: 'faction' },
]

const edges: EdgeDef[] = [
  { a: 'party', b: 'halia', kind: 'tense' },
  { a: 'party', b: 'ander', kind: 'ally' },
  { a: 'party', b: 'herman', kind: 'enemy' },
  { a: 'party', b: 'fibble', kind: 'ally' },
  { a: 'party', b: 'cryovain', kind: 'enemy' },
  { a: 'halia', b: 'zhent', kind: 'member' },
  { a: 'herman', b: 'blackbear', kind: 'member' },
  { a: 'ander', b: 'blackbear', kind: 'tense' },
  { a: 'cryovain', b: 'herman', kind: 'lost' },
]

function edgeColor(kind: EdgeDef['kind']): string {
  if (kind === 'enemy') return 'var(--accent)'
  if (kind === 'tense') return 'var(--warn)'
  if (kind === 'lost') return 'var(--mute)'
  return 'var(--ink)'
}

function edgeDash(kind: EdgeDef['kind']): string | undefined {
  if (kind === 'lost') return '1.2 1'
  if (kind === 'tense') return '0.7 0.7'
  return undefined
}

function nodeFill(kind: NodeKind): string {
  if (kind === 'party') return 'var(--accent)'
  if (kind === 'enemy') return 'var(--danger)'
  if (kind === 'faction') return 'var(--ink)'
  return 'var(--paper)'
}

function nodeTextFill(kind: NodeKind): string {
  return kind === 'neutral' ? 'var(--ink)' : 'var(--paper)'
}

const nodeIndex = Object.fromEntries(nodes.map((n) => [n.id, n]))

export function NodeGraph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <pattern id="llgrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path
            d="M 5 0 L 0 0 0 5"
            fill="none"
            stroke="rgba(26,28,25,0.07)"
            strokeWidth="0.15"
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#llgrid)" />

      {edges.map((e) => {
        const A = nodeIndex[e.a]
        const B = nodeIndex[e.b]
        if (!A || !B) return null
        return (
          <line
            key={`${e.a}-${e.b}`}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={edgeColor(e.kind)}
            strokeWidth="0.5"
            strokeDasharray={edgeDash(e.kind)}
          />
        )
      })}

      {nodes.map((node) => (
        <g key={node.id}>
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
            {node.label}
          </text>
        </g>
      ))}

      <g
        fontFamily='"JetBrains Mono", monospace'
        fontSize="1.6"
        fill="var(--ink-2)"
      >
        <text x="30" y="22">
          favor split
        </text>
        <text x="64" y="20">
          owes a favor
        </text>
        <text x="28" y="92">
          circling closer
        </text>
      </g>
    </svg>
  )
}
