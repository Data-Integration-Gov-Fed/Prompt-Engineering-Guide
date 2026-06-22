import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      requestType: true,
      currentState: true,
      requester: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
      workflowVersion: { include: { fieldDefinitions: { orderBy: { sortOrder: 'asc' } } } },
      fieldValues: { include: { fieldDefinition: true } },
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      auditEvents: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fvMap = Object.fromEntries(request.fieldValues.map((fv) => [fv.fieldDefinition.name, fv.value]))
  const rows: string[][] = [
    ['Field', 'Value'],
    ['ID', request.id],
    ['Title', request.title],
    ['Type', request.requestType.name],
    ['Status', request.status],
    ['State', request.currentState?.label ?? 'Draft'],
    ['Priority', request.priority],
    ['Requester', request.requester.name ?? request.requester.email],
    ['Assignee', request.assignee?.name ?? request.assignee?.email ?? ''],
    ['Created', format(new Date(request.createdAt), 'yyyy-MM-dd HH:mm')],
    ['Submitted', request.submittedAt ? format(new Date(request.submittedAt), 'yyyy-MM-dd HH:mm') : ''],
    ['Completed', request.completedAt ? format(new Date(request.completedAt), 'yyyy-MM-dd HH:mm') : ''],
    [],
    ['--- FIELD VALUES ---', ''],
    ...request.workflowVersion.fieldDefinitions.map((fd) => [fd.label, fvMap[fd.name] ?? '']),
    [],
    ['--- COMMENTS ---', ''],
    ...request.comments.map((c) => [
      `${format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm')} - ${c.author.name ?? ''}${c.isInternal ? ' [Internal]' : ''}`,
      c.content,
    ]),
    [],
    ['--- AUDIT LOG ---', ''],
    ...request.auditEvents.map((e) => [
      format(new Date(e.createdAt), 'yyyy-MM-dd HH:mm'),
      `${e.eventType} by ${e.user?.name ?? 'System'}`,
    ]),
  ]

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="request-${request.id}.csv"`,
    },
  })
}
