"use client"
import { useState } from "react"
import type { FieldDefinition } from "@prisma/client"
import { FieldRenderer } from "./field-renderer"
import { evaluateConditionalLogic } from "@/lib/condition-evaluator"
import type { ConditionalLogic } from "@/lib/types"

interface DynamicFormProps {
  fields: FieldDefinition[]
  initialValues?: Record<string, string>
  onChange?: (values: Record<string, string>) => void
  errors?: Record<string, string>
  disabled?: boolean
  users?: Array<{ id: string; name: string | null; email: string }>
}

export function DynamicForm({ fields, initialValues = {}, onChange, errors = {}, disabled, users }: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues)

  const handleChange = (name: string, value: string) => {
    const next = { ...values, [name]: value }
    setValues(next)
    onChange?.(next)
  }

  const isVisible = (field: FieldDefinition): boolean => {
    if (!field.conditionalLogic) return true
    try {
      const logic: ConditionalLogic = JSON.parse(field.conditionalLogic)
      if (logic.action === 'show') return evaluateConditionalLogic(logic, values)
      if (logic.action === 'hide') return !evaluateConditionalLogic(logic, values)
      return true
    } catch { return true }
  }

  const sortedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-4">
      {sortedFields.map((field) =>
        isVisible(field) ? (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.name] ?? ""}
            onChange={(v) => handleChange(field.name, v)}
            error={errors[field.name]}
            disabled={disabled}
            users={users}
          />
        ) : null
      )}
    </div>
  )
}
