import type { DreamNodeStatus, DreamNodeType, TreeItem } from './types'

export const NODE_TYPE_LABELS: Record<DreamNodeType, string> = {
  dream: 'Rêve',
  objective: 'Objectif',
  milestone: 'Jalon',
  task: 'Action', habit: 'Habitude', evidence: 'Preuve', reflection: 'Réflexion'
}

const NEXT_TYPE: Record<DreamNodeType, DreamNodeType> = {
  dream: 'objective',
  objective: 'milestone',
  milestone: 'task',
  task: 'task', habit: 'evidence', evidence: 'reflection', reflection: 'reflection'
}

export const inferNodeType = (depth: number): DreamNodeType => {
  return (['dream', 'objective', 'milestone', 'task'][Math.min(depth, 3)] || 'task') as DreamNodeType
}

export const getNodeType = (node: TreeItem, depth = 0): DreamNodeType =>
  node.type || inferNodeType(depth)

export const getChildType = (parent: TreeItem, parentDepth = 0): DreamNodeType =>
  NEXT_TYPE[getNodeType(parent, parentDepth)]

export const canContain = (parentType: DreamNodeType, childType: DreamNodeType): boolean =>
  ({ dream: [], objective: ['dream', 'objective'], milestone: ['objective'], task: ['objective', 'milestone', 'task'], habit: ['objective'], evidence: ['dream', 'objective', 'milestone', 'task', 'habit'], reflection: ['dream', 'objective', 'milestone', 'task', 'habit'] } as Record<DreamNodeType, DreamNodeType[]>)[childType].includes(parentType)

export const normalizeStatus = (node: TreeItem): DreamNodeStatus => {
  if (node.status) return node.status
  if (node.isChecked) return 'done'
  if ((node.progress || 0) > 0) return 'in-progress'
  return 'todo'
}

export const clampProgress = (value?: number): number =>
  Math.min(100, Math.max(0, Number.isFinite(value) ? Number(value) : 0))
