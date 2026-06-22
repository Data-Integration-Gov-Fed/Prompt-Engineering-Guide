import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RequestTable } from '@/components/requests/request-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function RequestsPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []
  const isRequester = roles.length === 1 && roles.includes('REQUESTER')
  const isAnalyst = roles.includes('ANALYST')

  const where = isRequester ? { requesterId: session!.user.id } : {}

  const requests = await prisma.request.findMany({
    where,
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = requests.map((r) => ({
    ...r,
    stateEnteredAt: r.stateEnteredAt?.toISOString() ?? null,
    slaBreachedAt: r.slaBreachedAt?.toISOString() ?? null,
    slaWarningAt: r.slaWarningAt?.toISOString() ?? null,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requests</h1>
          <p className="text-muted-foreground">{requests.length} total requests</p>
        </div>
        {!isAnalyst && (
          <Button asChild>
            <Link href="/requests/new"><Plus className="mr-2 h-4 w-4" />New Request</Link>
          </Button>
        )}
      </div>
      <RequestTable requests={serialized} showExport={!isAnalyst} />
    </div>
  )
}
