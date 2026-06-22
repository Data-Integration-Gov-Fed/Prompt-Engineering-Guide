"use client"
import { useState, useMemo } from "react"
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowUpDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SLABadge } from "./sla-badge"

interface RequestRow {
  id: string
  title: string
  status: string
  priority: string
  requestType: { name: string; color: string | null }
  currentState: { label: string; color: string | null } | null
  requester: { name: string | null; email: string }
  assignee: { name: string | null; email: string } | null
  stateEnteredAt: string | null
  slaBreachedAt: string | null
  slaWarningAt: string | null
  createdAt: string
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "secondary", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive",
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary", IN_PROGRESS: "info", COMPLETED: "success", REJECTED: "destructive", CANCELLED: "secondary",
}

interface RequestTableProps {
  requests: RequestRow[]
  showExport?: boolean
}

export function RequestTable({ requests, showExport }: RequestTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<RequestRow>[]>(() => [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link href={`/requests/${row.original.id}`} className="font-medium text-blue-600 hover:underline line-clamp-1">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: "requestType.name",
      header: "Type",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: row.original.requestType.color ?? "#94a3b8" }} />
          {row.original.requestType.name}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Status <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={(STATUS_COLORS[row.original.status] as any) ?? "secondary"}>
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "currentState.label",
      header: "State",
      cell: ({ row }) => row.original.currentState ? (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: row.original.currentState.color ?? "#94a3b8" }}>
          {row.original.currentState.label}
        </span>
      ) : <span className="text-muted-foreground text-xs">Draft</span>,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant={(PRIORITY_COLORS[row.original.priority] as any) ?? "secondary"}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      id: "sla",
      header: "SLA",
      cell: ({ row }) => (
        <SLABadge
          stateEnteredAt={row.original.stateEnteredAt}
          slaBreachedAt={row.original.slaBreachedAt}
          slaWarningAt={row.original.slaWarningAt}
        />
      ),
    },
    {
      accessorKey: "requester.name",
      header: "Requester",
      cell: ({ row }) => <span className="text-sm">{row.original.requester.name ?? row.original.requester.email}</span>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</span>,
    },
  ], [])

  const table = useReactTable({
    data: requests,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows
    const headers = ["ID", "Title", "Type", "Status", "State", "Priority", "Requester", "Assignee", "Created"]
    const csv = [headers.join(","), ...rows.map((r) => [
      r.original.id, `"${r.original.title.replace(/"/g, '""')}"`,
      `"${r.original.requestType.name}"`, r.original.status,
      r.original.currentState?.label ?? "Draft", r.original.priority,
      `"${r.original.requester.name ?? r.original.requester.email}"`,
      `"${r.original.assignee?.name ?? r.original.assignee?.email ?? ""}"`,
      format(new Date(r.original.createdAt), "yyyy-MM-dd"),
    ].join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "requests.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search requests..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {showExport && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="h-24 text-center text-muted-foreground">No requests found</td></tr>
            ) : table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {table.getFilteredRowModel().rows.length} of {requests.length} requests
      </p>
    </div>
  )
}
