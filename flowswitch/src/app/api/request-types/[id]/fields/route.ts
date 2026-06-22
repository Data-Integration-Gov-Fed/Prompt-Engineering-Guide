import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activeVersion = await prisma.workflowVersion.findFirst({
    where: { requestTypeId: params.id, isPublished: true, isActive: true },
  })
  if (!activeVersion) return NextResponse.json([], { status: 200 })

  const fields = await prisma.fieldDefinition.findMany({
    where: { workflowVersionId: activeVersion.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(fields)
}
