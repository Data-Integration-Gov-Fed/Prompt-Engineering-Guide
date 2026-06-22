import type { TransitionCondition } from '@prisma/client'
import type { ConditionalLogic } from './types'

export function compareValues(
  fieldValue: string | undefined | null,
  operator: string,
  conditionValue: string | null | undefined,
): boolean {
  const fv = fieldValue ?? ''
  const cv = conditionValue ?? ''
  switch (operator) {
    case 'EQUALS':
      return fv === cv
    case 'NOT_EQUALS':
      return fv !== cv
    case 'GREATER_THAN':
      return parseFloat(fv) > parseFloat(cv)
    case 'LESS_THAN':
      return parseFloat(fv) < parseFloat(cv)
    case 'INCLUDES': {
      try {
        const arr = JSON.parse(fv)
        return Array.isArray(arr) ? arr.includes(cv) : fv.includes(cv)
      } catch {
        return fv.includes(cv)
      }
    }
    case 'NOT_INCLUDES': {
      try {
        const arr = JSON.parse(fv)
        return Array.isArray(arr) ? !arr.includes(cv) : !fv.includes(cv)
      } catch {
        return !fv.includes(cv)
      }
    }
    case 'IS_EMPTY':
      return fv === '' || fv === null || fv === undefined
    case 'IS_NOT_EMPTY':
      return fv !== '' && fv !== null && fv !== undefined
    case 'BEFORE':
      return new Date(fv) < new Date(cv)
    case 'AFTER':
      return new Date(fv) > new Date(cv)
    default:
      return false
  }
}

export function evaluateConditions(
  conditions: TransitionCondition[],
  fieldValues: Record<string, string>,
): boolean {
  if (conditions.length === 0) return true
  // Group by groupId
  const groups = new Map<string, TransitionCondition[]>()
  for (const c of conditions) {
    const key = c.groupId ?? '__default__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }
  // Each group evaluates with its groupLogic; groups combine with AND
  for (const [, groupConditions] of groups) {
    const logic = groupConditions[0]?.groupLogic ?? 'AND'
    const results = groupConditions.map((c) =>
      compareValues(fieldValues[c.fieldName], c.operator, c.value),
    )
    const groupResult = logic === 'OR' ? results.some(Boolean) : results.every(Boolean)
    if (!groupResult) return false
  }
  return true
}

export function evaluateConditionalLogic(
  logic: ConditionalLogic | null | undefined,
  fieldValues: Record<string, string>,
): boolean {
  if (!logic) return true
  const results = logic.conditions.map((c) =>
    compareValues(fieldValues[c.field], c.operator, c.value),
  )
  return logic.logic === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

export function getVisibleFields(
  fieldDefs: Array<{ name: string; conditionalLogic: string | null }>,
  fieldValues: Record<string, string>,
): Set<string> {
  const visible = new Set<string>()
  for (const field of fieldDefs) {
    if (!field.conditionalLogic) {
      visible.add(field.name)
      continue
    }
    try {
      const logic: ConditionalLogic = JSON.parse(field.conditionalLogic)
      if (logic.action === 'show') {
        if (evaluateConditionalLogic(logic, fieldValues)) visible.add(field.name)
      } else if (logic.action === 'hide') {
        if (!evaluateConditionalLogic(logic, fieldValues)) visible.add(field.name)
      } else {
        visible.add(field.name)
      }
    } catch {
      visible.add(field.name)
    }
  }
  return visible
}

export function getRequiredFields(
  fieldDefs: Array<{ name: string; isRequired: boolean; conditionalLogic: string | null }>,
  fieldValues: Record<string, string>,
  visibleFields: Set<string>,
): Set<string> {
  const required = new Set<string>()
  for (const field of fieldDefs) {
    if (!visibleFields.has(field.name)) continue
    if (field.isRequired) {
      required.add(field.name)
      continue
    }
    if (field.conditionalLogic) {
      try {
        const logic: ConditionalLogic = JSON.parse(field.conditionalLogic)
        if (logic.action === 'require' && evaluateConditionalLogic(logic, fieldValues)) {
          required.add(field.name)
        }
      } catch {}
    }
  }
  return required
}
