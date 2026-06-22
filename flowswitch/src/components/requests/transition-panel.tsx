"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowRight } from "lucide-react"

interface Transition {
  id: string
  label: string
  requiresComment: boolean
  requiresAssignment: boolean
  toState: { label: string }
}

interface TransitionPanelProps {
  requestId: string
  transitions: Transition[]
  users?: Array<{ id: string; name: string | null; email: string }>
  isAnalyst?: boolean
}

export function TransitionPanel({ requestId, transitions, users = [], isAnalyst }: TransitionPanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [active, setActive] = useState<Transition | null>(null)
  const [comment, setComment] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [loading, setLoading] = useState(false)

  if (isAnalyst || transitions.length === 0) return null

  const handleExecute = async () => {
    if (!active) return
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitionId: active.id, comment: comment || undefined, assigneeId: assigneeId || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Transition failed")
      }
      toast({ title: "Transition applied", description: `Request moved to ${active.toState.label}` })
      setActive(null)
      setComment("")
      setAssigneeId("")
      router.refresh()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Available Actions</p>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button key={t.id} size="sm" variant="outline" onClick={() => setActive(t)}>
            {t.label} <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        ))}
      </div>
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setComment(""); setAssigneeId("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {active?.requiresAssignment && (
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{active?.requiresComment ? "Comment (required)" : "Comment (optional)"}</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleExecute} disabled={loading || (active?.requiresComment && !comment.trim())}>
              {loading ? "Applying..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
