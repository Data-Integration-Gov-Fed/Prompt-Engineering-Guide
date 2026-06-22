import { prisma } from './db'
export { computeSLAInfo } from './sla-utils'
export type { SLAStatus, SLAInfo } from './sla-utils'

export async function getSLARuleForState(workflowVersionId: string, stateId: string) {
  return prisma.sLARule.findFirst({
    where: { workflowVersionId, stateId },
  })
}

export async function updateRequestSLATimes(
  requestId: string,
  stateId: string,
  workflowVersionId: string,
) {
  const now = new Date()
  const rule = await getSLARuleForState(workflowVersionId, stateId)
  if (!rule) {
    return prisma.request.update({
      where: { id: requestId },
      data: { stateEnteredAt: now, slaBreachedAt: null, slaWarningAt: null },
    })
  }
  const breachAt = new Date(now.getTime() + rule.durationHours * 3600000)
  const warnAt = new Date(
    now.getTime() + rule.durationHours * (rule.warningPercent / 100) * 3600000,
  )
  return prisma.request.update({
    where: { id: requestId },
    data: { stateEnteredAt: now, slaBreachedAt: breachAt, slaWarningAt: warnAt },
  })
}
