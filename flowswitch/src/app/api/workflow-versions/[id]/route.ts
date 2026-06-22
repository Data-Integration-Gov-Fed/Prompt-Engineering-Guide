import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const version = await prisma.workflowVersion.findUnique({
    where: { id: params.id },
    include: {
      requestType: true,
      fieldDefinitions: { orderBy: { sortOrder: 'asc' } },
      states: { orderBy: { sortOrder: 'asc' } },
      transitions: { include: { permissions: { include: { role: true } }, conditions: true, fromState: true, toState: true }, orderBy: { sortOrder: 'asc' } },
      slaRules: { include: { state: true } },
    },
  })
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(version)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles ?? []
  if (!roles.includes('PLATFORM_ADMIN') && !roles.includes('WORKFLOW_DESIGNER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const version = await prisma.workflowVersion.findUnique({ where: { id: params.id } })
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { action } = body

  if (action === 'publish') {
    if (version.isPublished) return NextResponse.json({ error: 'Already published' }, { status: 400 })
    const updated = await prisma.workflowVersion.update({
      where: { id: params.id },
      data: { isPublished: true, publishedAt: new Date() },
    })
    await prisma.auditEvent.create({
      data: { eventType: 'WORKFLOW_VERSION_PUBLISHED', userId: session.user.id, metadata: { versionId: params.id } },
    })
    return NextResponse.json(updated)
  }

  if (action === 'activate') {
    if (!version.isPublished) return NextResponse.json({ error: 'Cannot activate unpublished version' }, { status: 400 })
    await prisma.workflowVersion.updateMany({
      where: { requestTypeId: version.requestTypeId, isActive: true },
      data: { isActive: false },
    })
    const updated = await prisma.workflowVersion.update({
      where: { id: params.id },
      data: { isActive: true },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
