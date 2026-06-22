import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getAvailableTransitions } from '@/lib/workflow-engine'
import { computeSLAInfo } from '@/lib/sla-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SLABadge } from '@/components/requests/sla-badge'
import { TransitionPanel } from '@/components/requests/transition-panel'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Printer } from 'lucide-react'
import type { RoleName } from '@prisma/client'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'secondary', MEDIUM: 'outline', HIGH: 'warning', CRITICAL: 'destructive',
}

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      workflowVersion: {
        include: {
          fieldDefinitions: { orderBy: { sortOrder: 'asc' } },
          states: { orderBy: { sortOrder: 'asc' } },
          slaRules: true,
        },
      },
      fieldValues: { include: { fieldDefinition: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      auditEvents: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!request) notFound()

  const roles = (session.user as any).roles as RoleName[]
  const isAnalyst = roles.includes('ANALYST' as RoleName)
  const isRequester = roles.length === 1 && roles.includes('REQUESTER' as RoleName)

  if (isRequester && request.requesterId !== session.user.id) notFound()

  const transitions = isAnalyst ? [] : await getAvailableTransitions(params.id, roles)

  const fvMap = Object.fromEntries(request.fieldValues.map((fv) => [fv.fieldDefinition.name, fv.value]))
  const slaRule = request.currentStateId
    ? request.workflowVersion.slaRules.find((r) => r.stateId === request.currentStateId)
    : null

  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requests"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{request.title}</h1>
          <p className="text-sm text-muted-foreground">
            {request.requestType.name} · v{request.workflowVersion.version} ·
            {request.requester.name ?? request.requester.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/requests/${params.id}/print`} target="_blank">
              <Printer className="mr-1.5 h-3.5 w-3.5" />Print
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/requests/${params.id}/export`} download>
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Request Information</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={(PRIORITY_COLORS[request.priority] as any) ?? 'outline'}>{request.priority}</Badge>
                {request.currentState ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: request.currentState.color ?? '#94a3b8' }}>
                    {request.currentState.label}
                  </span>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.workflowVersion.fieldDefinitions.map((fd) => {
                const value = fvMap[fd.name]
                if (!value) return null
                return (
                  <div key={fd.id}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{fd.label}</p>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap">{
                      fd.fieldType === 'BOOLEAN' ? (value === 'true' ? 'Yes' : 'No') :
                      fd.fieldType === 'MULTI_SELECT' ? (() => { try { return JSON.parse(value).join(', ') } catch { return value } })() :
                      value
                    }</p>
                  </div>
                )
              })}
              {Object.keys(fvMap).length === 0 && <p className="text-sm text-muted-foreground">No field values filled in yet.</p>}
            </CardContent>
          </Card>

          {!isAnalyst && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent>
                <TransitionPanel
                  requestId={params.id}
                  transitions={transitions.map((t) => ({
                    id: t.id,
                    label: t.label,
                    requiresComment: t.requiresComment,
                    requiresAssignment: t.requiresAssignment,
                    toState: { label: (t as any).toState?.label ?? '' },
                  }))}
                  users={users}
                  isAnalyst={isAnalyst}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Comments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {request.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : request.comments.map((c) => (
                <div key={c.id} className={`rounded-md p-3 ${c.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-muted'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{c.author.name ?? c.author.email}</span>
                    <div className="flex items-center gap-2">
                      {c.isInternal && <Badge variant="warning" className="text-xs">Internal</Badge>}
                      <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                <p className="mt-0.5">{request.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Requester</p>
                <p className="mt-0.5">{request.requester.name ?? request.requester.email}</p>
              </div>
              {request.assignee && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Assignee</p>
                  <p className="mt-0.5">{request.assignee.name ?? request.assignee.email}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Created</p>
                <p className="mt-0.5">{format(new Date(request.createdAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
              {request.submittedAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Submitted</p>
                  <p className="mt-0.5">{format(new Date(request.submittedAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
              {slaRule && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">SLA</p>
                  <SLABadge
                    stateEnteredAt={request.stateEnteredAt?.toISOString() ?? null}
                    slaBreachedAt={request.slaBreachedAt?.toISOString() ?? null}
                    slaWarningAt={request.slaWarningAt?.toISOString() ?? null}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Audit Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {request.auditEvents.map((e) => (
                  <div key={e.id} className="text-xs">
                    <p className="font-medium">{e.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-muted-foreground">{e.user?.name ?? 'System'} · {format(new Date(e.createdAt), 'MMM d HH:mm')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Workflow</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {request.workflowVersion.states.map((s) => (
                  <div key={s.id} className={`flex items-center gap-2 text-xs py-1 ${s.id === request.currentStateId ? 'font-medium' : 'text-muted-foreground'}`}>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? '#94a3b8' }} />
                    {s.label}
                    {s.id === request.currentStateId && <span className="text-xs">(current)</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
