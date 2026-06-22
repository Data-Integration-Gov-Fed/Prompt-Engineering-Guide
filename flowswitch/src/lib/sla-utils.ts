export type SLAStatus = 'OK' | 'WARNING' | 'BREACHED' | 'NONE'

export interface SLAInfo {
  status: SLAStatus
  hoursRemaining?: number
  hoursOverdue?: number
  percentUsed?: number
  breachAt?: Date
  warnAt?: Date
}

export function computeSLAInfo(
  stateEnteredAt: Date | null,
  slaBreachedAt: Date | null,
  slaWarningAt: Date | null,
  _slaRule?: unknown,
): SLAInfo {
  if (!stateEnteredAt || !slaBreachedAt) return { status: 'NONE' }
  const now = new Date()
  const totalMs = slaBreachedAt.getTime() - stateEnteredAt.getTime()
  const elapsedMs = now.getTime() - stateEnteredAt.getTime()
  const percentUsed = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0

  if (now > slaBreachedAt) {
    const hoursOverdue = (now.getTime() - slaBreachedAt.getTime()) / 3600000
    return {
      status: 'BREACHED',
      hoursOverdue: Math.round(hoursOverdue * 10) / 10,
      percentUsed,
      breachAt: slaBreachedAt,
      warnAt: slaWarningAt ?? undefined,
    }
  }
  if (slaWarningAt && now > slaWarningAt) {
    const hoursRemaining = (slaBreachedAt.getTime() - now.getTime()) / 3600000
    return {
      status: 'WARNING',
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      percentUsed,
      breachAt: slaBreachedAt,
      warnAt: slaWarningAt,
    }
  }
  const hoursRemaining = (slaBreachedAt.getTime() - now.getTime()) / 3600000
  return {
    status: 'OK',
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    percentUsed,
    breachAt: slaBreachedAt,
    warnAt: slaWarningAt ?? undefined,
  }
}
