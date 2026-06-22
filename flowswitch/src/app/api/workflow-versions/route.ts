import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles ?? []
  if (!roles.includes('PLATFORM_ADMIN') && !roles.includes('WORKFLOW_DESIGNER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { requestTypeId, version, copyFromVersionId } = await req.json()
  if (!requestTypeId || !version) return NextResponse.json({ error: 'requestTypeId and version required' }, { status: 400 })

  const existing = await prisma.workflowVersion.findUnique({ where: { requestTypeId_version: { requestTypeId, version } } })
  if (existing) return NextResponse.json({ error: 'Version already exists' }, { status: 400 })

  const newVersion = await prisma.workflowVersion.create({
    data: { requestTypeId, version, isPublished: false, isActive: false },
  })

  await prisma.auditEvent.create({
    data: { eventType: 'WORKFLOW_VERSION_CREATED', userId: session.user.id, metadata: { versionId: newVersion.id, version, requestTypeId } },
  })

  return NextResponse.json(newVersion, { status: 201 })
}
