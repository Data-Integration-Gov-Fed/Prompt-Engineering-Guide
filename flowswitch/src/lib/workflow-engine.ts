import { prisma } from './db'
import {
  evaluateConditions,
  getRequiredFields,
  getVisibleFields,
} from './condition-evaluator'
import { updateRequestSLATimes } from './sla-engine'
import type { RoleName } from '@prisma/client'

export async function getActiveWorkflowVersion(requestTypeId: string) {
  return prisma.workflowVersion.findFirst({
    where: { requestTypeId, isPublished: true, isActive: true },
  })
}

export async function getAvailableTransitions(requestId: string, userRoles: RoleName[]) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      currentState: true,
      fieldValues: { include: { fieldDefinition: true } },
      workflowVersion: {
        include: {
          transitions: {
            include: {
              permissions: { include: { role: true } },
              conditions: true,
              fromState: true,
              toState: true,
            },
          },
        },
      },
    },
  })
  if (!request || !request.currentStateId) return []
  const fieldValues: Record<string, string> = {}
  for (const fv of request.fieldValues) {
    fieldValues[fv.fieldDefinition.name] = fv.value
  }
  return request.workflowVersion.transitions.filter((t) => {
    if (t.fromStateId !== request.currentStateId) return false
    const hasRole = t.permissions.some((p) => userRoles.includes(p.role.name as RoleName))
    if (!hasRole) return false
    return evaluateConditions(t.conditions, fieldValues)
  })
}

export async function executeTransition({
  requestId,
  transitionId,
  userId,
  userRoles,
  comment,
  assigneeId,
}: {
  requestId: string
  transitionId: string
  userId: string
  userRoles: RoleName[]
  comment?: string
  assigneeId?: string
}) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      fieldValues: { include: { fieldDefinition: true } },
      workflowVersion: {
        include: {
          transitions: {
            include: {
              permissions: { include: { role: true } },
              conditions: true,
              toState: true,
            },
          },
        },
      },
    },
  })
  if (!request) throw new Error('Request not found')

  const transition = request.workflowVersion.transitions.find((t) => t.id === transitionId)
  if (!transition) throw new Error('Transition not found')
  if (transition.fromStateId !== request.currentStateId)
    throw new Error('Invalid transition: wrong from-state')

  const hasRole = transition.permissions.some((p) =>
    userRoles.includes(p.role.name as RoleName),
  )
  if (!hasRole) throw new Error('Insufficient permissions for this transition')

  const fieldValues: Record<string, string> = {}
  for (const fv of request.fieldValues) fieldValues[fv.fieldDefinition.name] = fv.value

  if (!evaluateConditions(transition.conditions, fieldValues))
    throw new Error('Transition conditions not met')
  if (transition.requiresComment && !comment?.trim())
    throw new Error('This transition requires a comment')

  const toState = transition.toState

  return prisma
    .$transaction(async (tx) => {
      const now = new Date()
      const isFinal = toState.isFinal
      const updated = await tx.request.update({
        where: { id: requestId },
        data: {
          currentStateId: toState.id,
          status: isFinal
            ? toState.name === 'REJECTED'
              ? 'REJECTED'
              : 'COMPLETED'
            : 'IN_PROGRESS',
          completedAt: isFinal ? now : null,
          ...(assigneeId !== undefined ? { assigneeId } : {}),
        },
      })
      await tx.auditEvent.create({
        data: {
          requestId,
          userId,
          eventType: 'STATE_CHANGED',
          metadata: {
            transitionName: transition.name,
            transitionLabel: transition.label,
            toStateName: toState.label,
          },
        },
      })
      if (comment?.trim()) {
        await tx.requestComment.create({
          data: { requestId, authorId: userId, content: comment, isInternal: false },
        })
        await tx.auditEvent.create({
          data: { requestId, userId, eventType: 'COMMENT_ADDED', metadata: { isInternal: false } },
        })
      }
      return updated
    })
    .then(async (updated) => {
      await updateRequestSLATimes(requestId, toState.id, request.workflowVersionId)
      return updated
    })
}

export async function validateRequestFields(
  workflowVersionId: string,
  fieldValues: Record<string, string>,
): Promise<{ valid: boolean; errors: Record<string, string> }> {
  const fields = await prisma.fieldDefinition.findMany({
    where: { workflowVersionId },
    orderBy: { sortOrder: 'asc' },
  })
  const visibleFields = getVisibleFields(fields, fieldValues)
  const requiredFields = getRequiredFields(fields, fieldValues, visibleFields)
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (!visibleFields.has(field.name)) continue
    const value = fieldValues[field.name] ?? ''
    if (requiredFields.has(field.name) && !value.trim()) {
      errors[field.name] = `${field.label} is required`
      continue
    }
    if (value && field.validationRules) {
      try {
        const rules = JSON.parse(field.validationRules)
        if (rules.minLength && value.length < rules.minLength)
          errors[field.name] = `Minimum ${rules.minLength} characters required`
        if (rules.maxLength && value.length > rules.maxLength)
          errors[field.name] = `Maximum ${rules.maxLength} characters allowed`
        if (rules.min !== undefined && parseFloat(value) < rules.min)
          errors[field.name] = `Minimum value is ${rules.min}`
        if (rules.max !== undefined && parseFloat(value) > rules.max)
          errors[field.name] = `Maximum value is ${rules.max}`
      } catch {}
    }
  }
  return { valid: Object.keys(errors).length === 0, errors }
}
