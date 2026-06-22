"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GitBranch } from "lucide-react"

interface NewVersionButtonProps {
  requestTypeId: string
  nextVersionNumber: number
}

export function NewVersionButton({ requestTypeId, nextVersionNumber }: NewVersionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/workflow-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestTypeId, version: nextVersionNumber }),
      })
      if (!res.ok) throw new Error("Failed to create version")
      const data = await res.json()
      router.push(`/admin/workflow-versions/${data.id}`)
    } catch (e) {
      alert("Failed to create new version")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
      <GitBranch className="mr-2 h-4 w-4" />
      {loading ? "Creating..." : `Create v${nextVersionNumber}`}
    </Button>
  )
}
