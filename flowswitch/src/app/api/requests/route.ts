import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getActiveWorkflowVersion } from '@/lib/workflow-engine'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const requestTypeId = searchParams.get('requestTypeId')
  const mine = searchParams.get('mine') === 'true'

  const roles = (session.user as any).roles ?? []
  const isRequester = roles.length === 1 && roles.includes('REQUESTER')

  const where: Record<string, any> = {}
  if (status) where.status = status
  if (requestTypeId) where.requestTypeId = requestTypeId
  if (mine || isRequester) where.requesterId = session.user.id

  const requests = await prisma.request.findMany({
    where,
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      workflowVersion: { select: { version: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles ?? []
  if (roles.includes('ANALYST')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { requestTypeId, title, priority, fieldValues } = body

  if (!requestTypeId || !title) return NextResponse.json({ error: 'requestTypeId and title are required' }, { status: 400 })

  const version = await getActiveWorkflowVersion(requestTypeId)
  if (!version) return NextResponse.json({ error: 'No active workflow found' }, { status: 400 })

  const fvEntries = fieldValues ? Object.entries(fieldValues as Record<string, string>) : []
  const fieldCreateData: Array<{ fieldDefinitionId: string; value: string }> = []

  if (fvEntries.length > 0) {
    const fieldDefs = await prisma.fieldDefinition.findMany({ where: { workflowVersionId: version.id } })
    const defMap = Object.fromEntries(fieldDefs.map((f) => [f.name, f.id]))
    for (const [name, value] of fvEntries) {
      if (defMap[name] && value !== undefined && value !== '') {
        fieldCreateData.push({ fieldDefinitionId: defMap[name], value })
      }
    }
  }

  const request = await prisma.request.create({
    data: {
      requestTypeId,
      workflowVersionId: version.id,
      currentStateId: null,
      requesterId: session.user.id,
      title,
      priority: priority ?? 'MEDIUM',
      status: 'DRAFT',
      fieldValues: fieldCreateData.length > 0 ? { create: fieldCreateData } : undefined,
    },
    include: { requestType: true, currentState: true },
  })

  await prisma.auditEvent.create({
    data: { requestId: request.id, userId: session.user.id, eventType: 'REQUEST_CREATED' },
  })

  return NextResponse.json(request, { status: 201 })
}
