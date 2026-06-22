import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles ?? []
  if (roles.includes('ANALYST')) return NextResponse.json({ error: 'Analysts cannot comment' }, { status: 403 })

  const { content, isInternal } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  const request = await prisma.request.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isRequester = roles.length === 1 && roles.includes('REQUESTER')
  if (isRequester && request.requesterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const comment = await prisma.requestComment.create({
    data: {
      requestId: params.id,
      authorId: session.user.id,
      content,
      isInternal: isInternal && !isRequester ? true : false,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  })

  await prisma.auditEvent.create({
    data: { requestId: params.id, userId: session.user.id, eventType: 'COMMENT_ADDED', metadata: { isInternal: comment.isInternal } },
  })

  return NextResponse.json(comment, { status: 201 })
}
