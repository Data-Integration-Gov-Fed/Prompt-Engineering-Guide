import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_ADMIN: 'destructive',
  WORKFLOW_DESIGNER: 'warning',
  REVIEWER: 'info',
  REQUESTER: 'secondary',
  ANALYST: 'outline',
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []
  if (!roles.includes('PLATFORM_ADMIN')) redirect('/dashboard')

  const users = await prisma.user.findMany({
    include: { userRoles: { include: { role: true } }, _count: { select: { requests: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">{users.length} total users</p>
      </div>
      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {u.name?.split(' ').map((n) => n[0]).join('') ?? u.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.userRoles.map((ur) => (
                    <Badge key={ur.id} variant={(ROLE_COLORS[ur.role.name] as any) ?? 'secondary'}>
                      {ur.role.name.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  <span className="text-sm text-muted-foreground">{u._count.requests} requests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
