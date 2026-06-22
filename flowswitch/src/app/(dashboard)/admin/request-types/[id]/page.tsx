import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { NewVersionButton } from '@/components/admin/new-version-button'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'

export default async function RequestTypeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []
  if (!roles.includes('PLATFORM_ADMIN') && !roles.includes('WORKFLOW_DESIGNER')) {
    redirect('/dashboard')
  }

  const rt = await prisma.requestType.findUnique({
    where: { id: params.id },
    include: {
      workflowVersions: {
        include: {
          _count: { select: { requests: true, fieldDefinitions: true, states: true, transitions: true } },
        },
        orderBy: { version: 'desc' },
      },
      _count: { select: { requests: true } },
    },
  })

  if (!rt) notFound()

  const latestVersion = rt.workflowVersions[0]
  const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/request-types"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: rt.color ?? '#94a3b8' }} />
            <h1 className="text-2xl font-bold">{rt.name}</h1>
          </div>
          <p className="text-muted-foreground">{rt.description}</p>
        </div>
        <NewVersionButton requestTypeId={rt.id} nextVersionNumber={nextVersionNumber} />
      </div>

      <div className="grid gap-4">
        {rt.workflowVersions.map((v) => (
          <Card key={v.id} className={v.isActive ? 'border-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {v.isActive ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Version {v.version}</p>
                      {v.isActive && <Badge variant="success">Active</Badge>}
                      {v.isPublished && !v.isActive && <Badge variant="secondary">Published</Badge>}
                      {!v.isPublished && <Badge variant="outline">Draft</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {v._count.fieldDefinitions} fields · {v._count.states} states · {v._count.transitions} transitions · {v._count.requests} requests
                    </p>
                    {v.changelog && <p className="text-xs text-muted-foreground mt-1 italic">{v.changelog}</p>}
                    {v.publishedAt && <p className="text-xs text-muted-foreground">Published {format(new Date(v.publishedAt), 'MMM d, yyyy')}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
