# FlowSwitch

A fully functional, production-style internal workflow management platform. Database-driven workflow definitions with branching conditional logic, SLA tracking, role-based access control, and audit logging. Runs entirely on Docker Compose — no paid external dependencies.

## Quick Start

```bash
cd flowswitch
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) and sign in with any demo account below.

The first startup takes 3–5 minutes while the image builds and seeds 26 sample requests.

## Demo Credentials

All accounts use password: **`Demo1234!`**

| Email | Role | Access |
|-------|------|--------|
| `admin@flowswitch.local` | Platform Admin | Full access — manage users, workflow versions, all requests |
| `designer@flowswitch.local` | Workflow Designer | Create and publish workflow versions |
| `reviewer1@flowswitch.local` | Reviewer | Process, transition, and comment on requests |
| `reviewer2@flowswitch.local` | Reviewer | Process, transition, and comment on requests |
| `requester1@flowswitch.local` | Requester | Submit and track own requests |
| `requester2@flowswitch.local` | Requester | Submit and track own requests |
| `analyst@flowswitch.local` | Analyst | Read-only — view requests and dashboard, no writes |

## Seeded Scenarios

The database starts with **26 requests** across three workflow types:

### Access Requests (10 total — AR01–AR10)
- **AR01** — Admin DB access, Security Review state, **SLA BREACHED** (80h in, 72h SLA)
- **AR02** — CRM Editor access, Manager Review, **SLA WARNING** (40h in, 48h SLA)
- **AR03** — Tableau Viewer, Approved
- **AR04** — Dev Server draft (incomplete)
- **AR05** — Confluence, Submitted
- **AR06** — Legacy VPN — **in-flight on v1 workflow** while v2 is active (proves version isolation)
- **AR07** — Finance Reports, Rejected
- **AR08** — HR Portal, Submitted (recent)
- **AR09** — Notion, Approved
- **AR10** — Kubernetes Admin, Security Review (near SLA breach)

### Change Requests (8 total — CR01–CR08)
- **CR01** — DB schema migration, CAB Review (SLA warning, high risk)
- **CR02** — Security patches — submitted with corrected rollback plan (audit trail shows field edit)
- **CR03** — UI redesign, Implemented
- **CR04** — SSL cert renewal, Initial Review (CRITICAL priority)
- **CR05** — API Gateway upgrade, Implemented
- **CR06** — Load balancer config, Submitted, **SLA BREACHED** (50h in, 48h SLA)
- **CR07** — DB backup schedule, Initial Review
- **CR08** — Remove MFA requirement, Rejected

### Exception / Waiver Requests (8 total — WR01–WR08)
- **WR01** — PCI DSS exception (119 days), Leadership Approval, **SLA WARNING** (220h in, 240h SLA)
- **WR02** — SOC2 audit limitation (60 days), Approved
- **WR03** — Firewall exception (29 days), Compliance Review
- **WR04** — Service account password draft (incomplete)
- **WR05** — Network segmentation (120 days), Compliance Review, **SLA WARNING**
- **WR06** — Encryption exception, Rejected (no compensating controls)
- **WR07** — Log retention waiver (92 days), Submitted, **SLA BREACHED**
- **WR08** — M&A access exception (180 days), Leadership Approval (>90 days path)

## Architecture

### Stack
- **Next.js 15** — App Router, server components for data fetching
- **TypeScript** — strict mode throughout
- **Tailwind CSS + shadcn/ui** — component library
- **PostgreSQL 16** — primary database
- **Prisma ORM** — schema-first, typed queries
- **NextAuth v4** — credentials provider, JWT sessions, bcrypt passwords
- **TanStack Table v8** — sortable, filterable request queues with CSV export
- **Recharts** — dashboard charts (client components)
- **Zod** — runtime validation

### Database-Driven Design

All workflow behavior is stored in the database — no hardcoded switch statements on request type names:

- **`FieldDefinition`** — defines form fields per workflow version (type, options, validation, conditional logic)
- **`WorkflowState`** — states in a workflow (initial, intermediate, final)
- **`WorkflowTransition`** — edges between states
- **`TransitionPermission`** — which roles can execute each transition
- **`TransitionCondition`** — field-value conditions that must be met (10 operators, group AND/OR logic)
- **`SLARule`** — duration + warning threshold per state
- **`ConditionalLogic`** JSON on `FieldDefinition` — show/hide/require fields based on other field values

### Workflow Version Isolation

- Every `Request` stores a `workflowVersionId` at creation time
- In-flight requests continue on their pinned version even after a new version is activated
- Published versions are immutable — no edits allowed after publishing
- AR06 demonstrates v1/v2 coexistence: it uses v1 fields/states/transitions while all new requests use v2

### SLA Computation

`src/lib/sla-utils.ts` — pure function, no Prisma imports:
```
computeSLAInfo(stateEnteredAt, slaBreachedAt, slaWarningAt) → { status: OK | WARNING | BREACHED | NONE, ... }
```

SLA times are materialized on the `Request` row when a state transition occurs, so SLA status can be computed without DB queries in client components.

### Conditional Logic

`src/lib/condition-evaluator.ts` — evaluates `ConditionalLogic` JSON:
- Actions: `show`, `hide`, `require`
- 10 operators: `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `INCLUDES`, `NOT_INCLUDES`, `IS_EMPTY`, `IS_NOT_EMPTY`, `BEFORE`, `AFTER`
- Group-based AND/OR: conditions share a `groupId` and `groupLogic`; groups combine with AND

Example — escalate to Security Review only when `sensitive_access=true` OR `access_level=admin`:
```sql
-- TransitionCondition rows for 'escalate_security':
fieldName=sensitive_access, operator=EQUALS, value=true,  groupId=g1, groupLogic=OR
fieldName=access_level,     operator=EQUALS, value=admin, groupId=g1, groupLogic=OR
```

### Roles

| Role | Permissions |
|------|-------------|
| `PLATFORM_ADMIN` | Full access — all requests, users, workflow admin |
| `WORKFLOW_DESIGNER` | Create/publish workflow versions |
| `REVIEWER` | View all requests, execute transitions, add comments (including internal) |
| `REQUESTER` | Create requests, view own requests, add public comments |
| `ANALYST` | Read-only — view requests/dashboard, no writes/transitions/comments |

Backend enforces roles independently of the frontend — `executeTransition()` re-validates role and conditions server-side.

## Project Structure

```
flowswitch/
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── lib/
    │   ├── db.ts              # Prisma singleton
    │   ├── auth.ts            # NextAuth config
    │   ├── types.ts           # Session augmentation, shared types
    │   ├── sla-utils.ts       # Pure SLA computation (no Prisma)
    │   ├── sla-engine.ts      # Prisma-backed SLA operations
    │   ├── condition-evaluator.ts  # Field condition & visibility logic
    │   └── workflow-engine.ts # Transition validation & execution
    ├── components/
    │   ├── ui/                # shadcn/ui primitives
    │   ├── forms/
    │   │   ├── dynamic-form.tsx    # Visibility-aware form
    │   │   └── field-renderer.tsx  # Renders all 10 field types
    │   ├── requests/
    │   │   ├── request-table.tsx   # TanStack Table v8
    │   │   ├── sla-badge.tsx       # SLA status badge
    │   │   └── transition-panel.tsx # Action buttons + dialog
    │   ├── dashboard/
    │   │   └── charts.tsx     # Recharts (client component)
    │   ├── admin/
    │   │   └── new-version-button.tsx
    │   └── layout/
    │       └── sidebar.tsx
    └── app/
        ├── api/               # REST API routes
        ├── (auth)/login/      # Sign-in page
        └── (dashboard)/       # Protected routes
            ├── dashboard/     # Stats + charts
            ├── requests/      # List + detail + new + print
            └── admin/         # Request types, users
```

## Development

To run locally without Docker (requires PostgreSQL):

```bash
cd flowswitch
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Reset & Re-seed

The seed script is idempotent — it deletes all data and recreates from scratch:

```bash
docker compose exec app npx tsx prisma/seed.ts
```
