"use client"
import { computeSLAInfo } from "@/lib/sla-utils"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface SLABadgeProps {
  stateEnteredAt: string | Date | null
  slaBreachedAt: string | Date | null
  slaWarningAt: string | Date | null
}

export function SLABadge({ stateEnteredAt, slaBreachedAt, slaWarningAt }: SLABadgeProps) {
  const info = computeSLAInfo(
    stateEnteredAt ? new Date(stateEnteredAt) : null,
    slaBreachedAt ? new Date(slaBreachedAt) : null,
    slaWarningAt ? new Date(slaWarningAt) : null,
  )
  if (info.status === "NONE") return null
  if (info.status === "BREACHED") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        SLA Breached {info.hoursOverdue ? `(+${info.hoursOverdue}h)` : ""}
      </Badge>
    )
  }
  if (info.status === "WARNING") {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        SLA Warning {info.hoursRemaining ? `(${info.hoursRemaining}h left)` : ""}
      </Badge>
    )
  }
  return (
    <Badge variant="success" className="gap-1">
      <Clock className="h-3 w-3" />
      {info.hoursRemaining ? `${info.hoursRemaining}h remaining` : "On Track"}
    </Badge>
  )
}
