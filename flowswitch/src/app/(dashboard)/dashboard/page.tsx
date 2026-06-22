import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeeklyBarChart, TypePieChart } from '@/components/dashboard/charts'
import { FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []
  const isRequester = roles.length === 1 && roles.includes('REQUESTER')

  const where = isRequester ? { requesterId: session!.user.id } : {}

  const [total, inProgress, completed, slaBreached] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.request.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.request.count({
      where: { ...where, slaBreachedAt: { lt: new Date() }, status: 'IN_PROGRESS' },
    }),
  ])

  const recentRequests = await prisma.request.findMany({
    where: { ...where, status: 'IN_PROGRESS' },
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Weekly chart data (last 7 days)
  const weeklyData = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i)
      const start = new Date(day.setHours(0, 0, 0, 0))
      const end = new Date(day.setHours(23, 59, 59, 999))
      return prisma.request.count({ where: { ...where, createdAt: { gte: start, lte: end } } })
        .then((count) => ({ date: format(start, 'MMM d'), count }))
    })
  )

  // Type breakdown
  const typeGroups = await prisma.request.groupBy({
    by: ['requestTypeId'],
    where,
    _count: true,
  })
  const typeIds = typeGroups.map((g) => g.requestTypeId)
  const types = await prisma.requestType.findMany({ where: { id: { in: typeIds } } })
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]))
  const typeData = typeGroups.map((g) => ({ name: typeMap[g.requestTypeId] ?? 'Unknown', value: g._count }))

  const stats = [
    { title: 'Total Requests', value: total, icon: FileText, color: 'text-blue-600' },
    { title: 'In Progress', value: inProgress, icon: Clock, color: 'text-amber-600' },
    { title: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-600' },
    { title: 'SLA Breached', value: slaBreached, icon: AlertTriangle, color: 'text-red-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Requests This Week</CardTitle></CardHeader>
          <CardContent>
            <WeeklyBarChart data={weeklyData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By Type</CardTitle></CardHeader>
          <CardContent>
            <TypePieChart data={typeData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Requests</CardTitle></CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active requests</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <Link href={`/requests/${r.id}`} className="text-sm font-medium hover:underline line-clamp-1">
                      {r.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.requestType.name} · {r.requester.name ?? r.requester.email}</p>
                  </div>
                  {r.currentState && (
                    <span className="ml-4 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: r.currentState.color ?? '#94a3b8' }}>
                      {r.currentState.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
