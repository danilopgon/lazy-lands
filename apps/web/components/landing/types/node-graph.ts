export type NodeKind = 'party' | 'enemy' | 'faction' | 'neutral'

export type NodeDef = {
  id: string
  x: number
  y: number
  r: number
  label: string
  kind: NodeKind
}

export type EdgeKind = 'ally' | 'tense' | 'enemy' | 'member' | 'lost'

export type EdgeDef = {
  a: string
  b: string
  kind: EdgeKind
}
