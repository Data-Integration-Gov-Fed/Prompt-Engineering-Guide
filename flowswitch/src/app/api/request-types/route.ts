import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const types = await prisma.requestType.findMany({
    include: {
      _count: { select: { requests: true } },
      workflowVersions: { where: { isActive: true }, select: { id: true, version: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(types)
}
