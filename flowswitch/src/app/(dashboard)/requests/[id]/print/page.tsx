"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/requests/${id}`).then((r) => r.json()).then(setRequest)
  }, [id])

  if (!request) return <div className="p-8">Loading...</div>

  const fvMap = Object.fromEntries(request.fieldValues.map((fv: any) => [fv.fieldDefinition.name, fv.value]))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-bold">Print Preview</h1>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <p className="text-muted-foreground">{request.requestType.name} · {request.status}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border rounded p-4">
          <div><span className="font-medium">Requester:</span> {request.requester.name ?? request.requester.email}</div>
          <div><span className="font-medium">Status:</span> {request.status}</div>
          <div><span className="font-medium">Priority:</span> {request.priority}</div>
          <div><span className="font-medium">Created:</span> {format(new Date(request.createdAt), 'MMM d, yyyy')}</div>
          {request.currentState && <div><span className="font-medium">State:</span> {request.currentState.label}</div>}
        </div>

        <div>
          <h2 className="font-semibold mb-3">Field Values</h2>
          <div className="space-y-3">
            {request.workflowVersion.fieldDefinitions.map((fd: any) => {
              const val = fvMap[fd.name]
              if (!val) return null
              return (
                <div key={fd.id} className="border-b pb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{fd.label}</p>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{
                    fd.fieldType === 'BOOLEAN' ? (val === 'true' ? 'Yes' : 'No') : val
                  }</p>
                </div>
              )
            })}
          </div>
        </div>

        {request.comments.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Comments</h2>
            {request.comments.filter((c: any) => !c.isInternal).map((c: any) => (
              <div key={c.id} className="border-b py-2">
                <p className="text-xs text-muted-foreground">{c.author.name} · {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}</p>
                <p className="text-sm mt-1">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
