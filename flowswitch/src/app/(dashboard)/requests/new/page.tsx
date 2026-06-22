"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface RequestType { id: string; name: string; description: string | null; color: string | null }
interface FieldDef { id: string; name: string; label: string; fieldType: string; isRequired: boolean; helpText: string | null; options: string | null; conditionalLogic: string | null; sortOrder: number; placeholder: string | null; validationRules: string | null }

export default function NewRequestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [fields, setFields] = useState<FieldDef[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/request-types').then((r) => r.json()).then(setRequestTypes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedType) { setFields([]); return }
    fetch(`/api/request-types/${selectedType}/fields`).then((r) => r.json()).then(setFields).catch(() => {})
    setFieldValues({})
  }, [selectedType])

  const handleSaveDraft = async () => {
    if (!title.trim()) { setErrors({ title: 'Title is required' }); return }
    if (!selectedType) { setErrors({ type: 'Please select a request type' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestTypeId: selectedType, title, priority, fieldValues }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      toast({ title: 'Draft saved' })
      router.push(`/requests/${data.id}`)
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requests"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">New Request</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Request Type <span className="text-destructive">*</span></Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a request type..." />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for this request..."
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {fields.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Request Fields</CardTitle></CardHeader>
          <CardContent>
            <DynamicForm
              fields={fields as any}
              onChange={setFieldValues}
              errors={errors}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/requests">Cancel</Link>
        </Button>
        <Button onClick={handleSaveDraft} disabled={loading}>
          {loading ? 'Saving...' : 'Save as Draft'}
        </Button>
      </div>
    </div>
  )
}
