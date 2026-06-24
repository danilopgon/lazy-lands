import type { EdgeDef, NodeDef } from '../types'

export const nodes: NodeDef[] = [
  { id: 'party', x: 50, y: 50, r: 13, label: 'Party', kind: 'party' },
  { id: 'halia', x: 24, y: 28, r: 10, label: 'Halia', kind: 'neutral' },
  { id: 'ander', x: 76, y: 26, r: 9, label: 'Ander', kind: 'neutral' },
  { id: 'herman', x: 80, y: 70, r: 9, label: 'Herman', kind: 'enemy' },
  { id: 'fibble', x: 18, y: 72, r: 8, label: 'Fibble', kind: 'neutral' },
  { id: 'cryovain', x: 50, y: 84, r: 11, label: 'Cryovain', kind: 'enemy' },
  { id: 'blackbear', x: 90, y: 48, r: 6, label: 'B.Bear', kind: 'faction' },
  { id: 'zhent', x: 10, y: 50, r: 6, label: 'Zhent', kind: 'faction' },
]

export const edges: EdgeDef[] = [
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
