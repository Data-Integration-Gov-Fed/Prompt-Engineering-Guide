import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function RequestTypesPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []
  if (!roles.includes('PLATFORM_ADMIN') && !roles.includes('WORKFLOW_DESIGNER')) {
    redirect('/dashboard')
  }

  const requestTypes = await prisma.requestType.findMany({
    include: {
      workflowVersions: { orderBy: { version: 'desc' } },
      _count: { select: { requests: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request Types</h1>
        <p className="text-muted-foreground">Manage request types and workflow versions</p>
      </div>

      <div className="grid gap-4">
        {requestTypes.map((rt) => {
          const activeVersion = rt.workflowVersions.find((v) => v.isActive)
          return (
            <Link key={rt.id} href={`/admin/request-types/${rt.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: rt.color ?? '#94a3b8' }} />
                      <div>
                        <p className="font-medium">{rt.name}</p>
                        <p className="text-sm text-muted-foreground">{rt.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm">{rt._count.requests} requests</p>
                        {activeVersion && <p className="text-xs text-muted-foreground">Active: v{activeVersion.version}</p>}
                      </div>
                      <Badge variant="outline">{rt.workflowVersions.length} version{rt.workflowVersions.length !== 1 ? 's' : ''}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
