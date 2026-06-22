"use client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { FieldDefinition } from "@prisma/client"
import type { FieldOption } from "@/lib/types"

interface FieldRendererProps {
  field: FieldDefinition & { parsedOptions?: FieldOption[] }
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  users?: Array<{ id: string; name: string | null; email: string }>
}

export function FieldRenderer({ field, value, onChange, error, disabled, users = [] }: FieldRendererProps) {
  const options: FieldOption[] = field.parsedOptions ?? (() => {
    try { return field.options ? JSON.parse(field.options) : [] } catch { return [] }
  })()

  const renderInput = () => {
    switch (field.fieldType) {
      case "SHORT_TEXT":
        return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ""} disabled={disabled} />
      case "LONG_TEXT":
        return <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ""} disabled={disabled} rows={4} />
      case "NUMBER":
        return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ""} disabled={disabled} />
      case "EMAIL":
        return <Input type="email" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? "email@example.com"} disabled={disabled} />
      case "DATE":
        return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      case "DATETIME":
        return <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      case "BOOLEAN":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
              disabled={disabled}
              id={`field-${field.id}`}
            />
            <span className="text-sm text-muted-foreground">{value === "true" ? "Yes" : "No"}</span>
          </div>
        )
      case "SINGLE_SELECT":
        return (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "MULTI_SELECT": {
        const selected: string[] = (() => { try { return value ? JSON.parse(value) : [] } catch { return [] } })()
        const toggle = (v: string) => {
          const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
          onChange(JSON.stringify(next))
        }
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${opt.value}`}
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.id}-${opt.value}`} className="font-normal">{opt.label}</Label>
              </div>
            ))}
          </div>
        )
      }
      case "USER_PICKER":
        return (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.id}`} className="font-medium">
        {field.label}
        {field.isRequired && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {renderInput()}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
