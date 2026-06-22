import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      workflowVersion: {
        include: {
          fieldDefinitions: { orderBy: { sortOrder: 'asc' } },
          states: { orderBy: { sortOrder: 'asc' } },
          slaRules: true,
        },
      },
      fieldValues: { include: { fieldDefinition: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      auditEvents: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const roles = (session.user as any).roles ?? []
  const isRequester = roles.length === 1 && roles.includes('REQUESTER')
  if (isRequester && request.requesterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(request)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles ?? []
  if (roles.includes('ANALYST')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const request = await prisma.request.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (request.status !== 'DRAFT') return NextResponse.json({ error: 'Only draft requests can be edited' }, { status: 400 })

  const isRequester = roles.length === 1 && roles.includes('REQUESTER')
  if (isRequester && request.requesterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, priority, fieldValues } = body

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: {
      ...(title ? { title } : {}),
      ...(priority ? { priority } : {}),
    },
  })

  if (fieldValues) {
    const fieldDefs = await prisma.fieldDefinition.findMany({ where: { workflowVersionId: request.workflowVersionId } })
    const defMap = Object.fromEntries(fieldDefs.map((f) => [f.name, f.id]))
    for (const [name, value] of Object.entries(fieldValues as Record<string, string>)) {
      if (!defMap[name]) continue
      await prisma.requestFieldValue.upsert({
        where: { requestId_fieldDefinitionId: { requestId: params.id, fieldDefinitionId: defMap[name] } },
        create: { requestId: params.id, fieldDefinitionId: defMap[name], value: String(value) },
        update: { value: String(value) },
      })
    }
    await prisma.auditEvent.create({
      data: { requestId: params.id, userId: session.user.id, eventType: 'REQUEST_UPDATED', metadata: { fields: Object.keys(fieldValues) } },
    })
  }

  return NextResponse.json(updated)
}
