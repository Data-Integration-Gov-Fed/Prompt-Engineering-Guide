import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeTransition } from '@/lib/workflow-engine'
import type { RoleName } from '@prisma/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = (session.user as any).roles as RoleName[]
  if (roles.includes('ANALYST' as RoleName)) return NextResponse.json({ error: 'Analysts cannot perform transitions' }, { status: 403 })

  const body = await req.json()
  const { transitionId, comment, assigneeId } = body

  if (!transitionId) return NextResponse.json({ error: 'transitionId is required' }, { status: 400 })

  try {
    const result = await executeTransition({
      requestId: params.id,
      transitionId,
      userId: session.user.id,
      userRoles: roles,
      comment,
      assigneeId,
    })
    return NextResponse.json(result)
  } catch (e) {
    const msg = (e as Error).message
    // Record invalid transition attempt if it's a permission/condition failure
    if (msg.includes('Insufficient permissions') || msg.includes('conditions not met')) {
      const { prisma } = await import('@/lib/db')
      await prisma.auditEvent.create({
        data: {
          requestId: params.id,
          userId: session.user.id,
          eventType: 'INVALID_TRANSITION_ATTEMPTED',
          metadata: { reason: msg, transitionId },
        },
      })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
