import {
  PrismaClient,
  RoleName,
  FieldType,
  ConditionOperator,
  LogicType,
  RequestStatus,
  Priority,
  AuditEventType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { subHours, subDays } from 'date-fns'

const prisma = new PrismaClient()

const PASS = bcrypt.hashSync('Demo1234!', 10)
const now = new Date()
const h = (n: number) => subHours(now, n)
const d = (n: number) => subDays(now, n)

function slaAt(enteredAt: Date, durationHours: number, percent = 100) {
  return new Date(enteredAt.getTime() + durationHours * percent * 36000)
}

async function main() {
  console.log('🌱 Seeding FlowSwitch...')

  // ── Clean ────────────────────────────────────────────────────────────────
  await prisma.auditEvent.deleteMany()
  await prisma.requestComment.deleteMany()
  await prisma.requestFieldValue.deleteMany()
  await prisma.request.deleteMany()
  await prisma.transitionCondition.deleteMany()
  await prisma.transitionPermission.deleteMany()
  await prisma.workflowTransition.deleteMany()
  await prisma.sLARule.deleteMany()
  await prisma.workflowState.deleteMany()
  await prisma.fieldDefinition.deleteMany()
  await prisma.workflowVersion.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()

  // ── Roles ────────────────────────────────────────────────────────────────
  const roleAdmin = await prisma.role.create({ data: { name: RoleName.PLATFORM_ADMIN, description: 'Full system access' } })
  const roleDesigner = await prisma.role.create({ data: { name: RoleName.WORKFLOW_DESIGNER, description: 'Design workflows and request types' } })
  const roleReviewer = await prisma.role.create({ data: { name: RoleName.REVIEWER, description: 'Review and process requests' } })
  const roleRequester = await prisma.role.create({ data: { name: RoleName.REQUESTER, description: 'Submit and track requests' } })
  const roleAnalyst = await prisma.role.create({ data: { name: RoleName.ANALYST, description: 'Read-only analytics access' } })

  // ── Users ────────────────────────────────────────────────────────────────
  const uAdmin = await prisma.user.create({
    data: { email: 'admin@flowswitch.local', password: PASS, name: 'Alex Admin',
      userRoles: { create: { roleId: roleAdmin.id } } },
  })
  const uDesigner = await prisma.user.create({
    data: { email: 'designer@flowswitch.local', password: PASS, name: 'Dana Designer',
      userRoles: { create: { roleId: roleDesigner.id } } },
  })
  const uReviewer1 = await prisma.user.create({
    data: { email: 'reviewer1@flowswitch.local', password: PASS, name: 'Riley Reviewer',
      userRoles: { create: { roleId: roleReviewer.id } } },
  })
  const uReviewer2 = await prisma.user.create({
    data: { email: 'reviewer2@flowswitch.local', password: PASS, name: 'Morgan Reviewer',
      userRoles: { create: { roleId: roleReviewer.id } } },
  })
  const uReq1 = await prisma.user.create({
    data: { email: 'requester1@flowswitch.local', password: PASS, name: 'Sam Requester',
      userRoles: { create: { roleId: roleRequester.id } } },
  })
  const uReq2 = await prisma.user.create({
    data: { email: 'requester2@flowswitch.local', password: PASS, name: 'Jordan Requester',
      userRoles: { create: { roleId: roleRequester.id } } },
  })
  const uAnalyst = await prisma.user.create({
    data: { email: 'analyst@flowswitch.local', password: PASS, name: 'Avery Analyst',
      userRoles: { create: { roleId: roleAnalyst.id } } },
  })

  console.log('✅ Users created')

  // ── Request Types ────────────────────────────────────────────────────────
  const rtAccess = await prisma.requestType.create({
    data: { name: 'Access Request', slug: 'access-request', color: '#6366f1',
      description: 'Request access to systems, applications, and resources', icon: 'shield' },
  })
  const rtChange = await prisma.requestType.create({
    data: { name: 'Change Request', slug: 'change-request', color: '#f59e0b',
      description: 'Request changes to production systems and infrastructure', icon: 'git-branch' },
  })
  const rtWaiver = await prisma.requestType.create({
    data: { name: 'Exception / Waiver Request', slug: 'waiver-request', color: '#ef4444',
      description: 'Request exceptions or waivers to policies and controls', icon: 'alert-triangle' },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS REQUEST — V1 (published, NOT active, has 1 in-flight request)
  // ═══════════════════════════════════════════════════════════════════════════
  const avV1 = await prisma.workflowVersion.create({
    data: { requestTypeId: rtAccess.id, version: 1, isPublished: true, isActive: false,
      publishedAt: d(30), changelog: 'Initial access request workflow' },
  })

  // Fields V1
  const arV1Fields = await Promise.all([
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'system_name', label: 'System / Application Name', fieldType: FieldType.SHORT_TEXT, isRequired: true, helpText: 'Name of the system you need access to', sortOrder: 1 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'access_level', label: 'Access Level', fieldType: FieldType.SINGLE_SELECT, isRequired: true, sortOrder: 2, options: JSON.stringify([{ value: 'viewer', label: 'Viewer (read-only)' }, { value: 'editor', label: 'Editor (read/write)' }, { value: 'admin', label: 'Admin (full control)' }]) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'business_justification', label: 'Business Justification', fieldType: FieldType.LONG_TEXT, isRequired: true, placeholder: 'Explain why you need this access...', sortOrder: 3, validationRules: JSON.stringify({ minLength: 20 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'manager_name', label: "Manager's Name", fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 4 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'manager_email', label: "Manager's Email", fieldType: FieldType.EMAIL, isRequired: true, sortOrder: 5 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'temporary_access', label: 'Is this temporary access?', fieldType: FieldType.BOOLEAN, isRequired: true, sortOrder: 6 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'expiration_date', label: 'Access Expiration Date', fieldType: FieldType.DATE, isRequired: false, sortOrder: 7, helpText: 'Required if temporary access is requested', conditionalLogic: JSON.stringify({ action: 'require', logic: 'AND', conditions: [{ field: 'temporary_access', operator: 'EQUALS', value: 'true' }] }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV1.id, name: 'sensitive_access', label: 'Does this involve sensitive/privileged data?', fieldType: FieldType.BOOLEAN, isRequired: true, sortOrder: 8 } }),
  ])

  // States V1
  const arV1States = {
    draft: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'DRAFT', label: 'Draft', isInitial: true, isFinal: false, color: '#94a3b8', sortOrder: 1 } }),
    submitted: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'SUBMITTED', label: 'Submitted', color: '#3b82f6', sortOrder: 2 } }),
    managerReview: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'MANAGER_REVIEW', label: 'Manager Review', color: '#8b5cf6', sortOrder: 3 } }),
    securityReview: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'SECURITY_REVIEW', label: 'Security Review', color: '#f59e0b', sortOrder: 4 } }),
    approved: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'APPROVED', label: 'Approved', isFinal: true, color: '#10b981', sortOrder: 5 } }),
    rejected: await prisma.workflowState.create({ data: { workflowVersionId: avV1.id, name: 'REJECTED', label: 'Rejected', isFinal: true, color: '#ef4444', sortOrder: 6 } }),
  }

  // Transitions V1
  await seedAccessTransitions(avV1.id, arV1States, roleRequester, roleReviewer, roleAdmin)
  // SLA V1
  await prisma.sLARule.createMany({ data: [
    { workflowVersionId: avV1.id, stateId: arV1States.submitted.id, name: 'Submission SLA', durationHours: 24, warningPercent: 80 },
    { workflowVersionId: avV1.id, stateId: arV1States.managerReview.id, name: 'Manager Review SLA', durationHours: 48, warningPercent: 75 },
    { workflowVersionId: avV1.id, stateId: arV1States.securityReview.id, name: 'Security Review SLA', durationHours: 72, warningPercent: 80, escalateOnBreach: true },
  ]})

  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_CREATED, userId: uDesigner.id, metadata: { versionId: avV1.id, version: 1, requestTypeId: rtAccess.id } } })
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_PUBLISHED, userId: uAdmin.id, metadata: { versionId: avV1.id, version: 1 } } })

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS REQUEST — V2 (published, ACTIVE — current version)
  // ═══════════════════════════════════════════════════════════════════════════
  const avV2 = await prisma.workflowVersion.create({
    data: { requestTypeId: rtAccess.id, version: 2, isPublished: true, isActive: true,
      publishedAt: d(7), changelog: 'Added access duration field and improved SLA timers' },
  })

  const arV2Fields = await Promise.all([
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'system_name', label: 'System / Application Name', fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 1 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'access_level', label: 'Access Level', fieldType: FieldType.SINGLE_SELECT, isRequired: true, sortOrder: 2, options: JSON.stringify([{ value: 'viewer', label: 'Viewer (read-only)' }, { value: 'editor', label: 'Editor (read/write)' }, { value: 'admin', label: 'Admin (full control)' }]) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'business_justification', label: 'Business Justification', fieldType: FieldType.LONG_TEXT, isRequired: true, sortOrder: 3, validationRules: JSON.stringify({ minLength: 20 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'manager_name', label: "Manager's Name", fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 4 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'manager_email', label: "Manager's Email", fieldType: FieldType.EMAIL, isRequired: true, sortOrder: 5 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'temporary_access', label: 'Is this temporary access?', fieldType: FieldType.BOOLEAN, isRequired: true, sortOrder: 6 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'expiration_date', label: 'Access Expiration Date', fieldType: FieldType.DATE, isRequired: false, sortOrder: 7, conditionalLogic: JSON.stringify({ action: 'require', logic: 'AND', conditions: [{ field: 'temporary_access', operator: 'EQUALS', value: 'true' }] }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'sensitive_access', label: 'Does this involve sensitive/privileged data?', fieldType: FieldType.BOOLEAN, isRequired: true, sortOrder: 8 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: avV2.id, name: 'access_duration', label: 'Access Duration', fieldType: FieldType.SINGLE_SELECT, isRequired: true, sortOrder: 9, options: JSON.stringify([{ value: '30_days', label: '30 Days' }, { value: '90_days', label: '90 Days' }, { value: '1_year', label: '1 Year' }, { value: 'permanent', label: 'Permanent' }]) } }),
  ])

  const arV2States = {
    draft: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'DRAFT', label: 'Draft', isInitial: true, color: '#94a3b8', sortOrder: 1 } }),
    submitted: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'SUBMITTED', label: 'Submitted', color: '#3b82f6', sortOrder: 2 } }),
    managerReview: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'MANAGER_REVIEW', label: 'Manager Review', color: '#8b5cf6', sortOrder: 3 } }),
    securityReview: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'SECURITY_REVIEW', label: 'Security Review', color: '#f59e0b', sortOrder: 4 } }),
    approved: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'APPROVED', label: 'Approved', isFinal: true, color: '#10b981', sortOrder: 5 } }),
    rejected: await prisma.workflowState.create({ data: { workflowVersionId: avV2.id, name: 'REJECTED', label: 'Rejected', isFinal: true, color: '#ef4444', sortOrder: 6 } }),
  }

  await seedAccessTransitions(avV2.id, arV2States, roleRequester, roleReviewer, roleAdmin)
  await prisma.sLARule.createMany({ data: [
    { workflowVersionId: avV2.id, stateId: arV2States.submitted.id, name: 'Submission SLA', durationHours: 24, warningPercent: 80 },
    { workflowVersionId: avV2.id, stateId: arV2States.managerReview.id, name: 'Manager Review SLA', durationHours: 48, warningPercent: 75 },
    { workflowVersionId: avV2.id, stateId: arV2States.securityReview.id, name: 'Security Review SLA', durationHours: 72, warningPercent: 80, escalateOnBreach: true },
  ]})

  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_CREATED, userId: uDesigner.id, metadata: { versionId: avV2.id, version: 2 } } })
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_PUBLISHED, userId: uAdmin.id, metadata: { versionId: avV2.id, version: 2, setActive: true } } })

  console.log('✅ Access Request workflows created')

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE REQUEST — V1 (published, active)
  // ═══════════════════════════════════════════════════════════════════════════
  const cvV1 = await prisma.workflowVersion.create({
    data: { requestTypeId: rtChange.id, version: 1, isPublished: true, isActive: true,
      publishedAt: d(14), changelog: 'Initial change request workflow with CAB escalation' },
  })

  const crFields = await Promise.all([
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'system_application', label: 'System / Application', fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 1 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'change_summary', label: 'Change Summary', fieldType: FieldType.LONG_TEXT, isRequired: true, sortOrder: 2, validationRules: JSON.stringify({ minLength: 30 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'implementation_date', label: 'Planned Implementation Date', fieldType: FieldType.DATETIME, isRequired: true, sortOrder: 3 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'rollback_plan', label: 'Rollback Plan', fieldType: FieldType.LONG_TEXT, isRequired: true, sortOrder: 4, helpText: 'Describe steps to revert if the change fails', validationRules: JSON.stringify({ minLength: 20 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'outage_expected', label: 'Is an outage expected?', fieldType: FieldType.BOOLEAN, isRequired: true, sortOrder: 5 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'outage_duration', label: 'Estimated Outage Duration (minutes)', fieldType: FieldType.NUMBER, isRequired: false, sortOrder: 6, conditionalLogic: JSON.stringify({ action: 'require', logic: 'AND', conditions: [{ field: 'outage_expected', operator: 'EQUALS', value: 'true' }] }), validationRules: JSON.stringify({ min: 1 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'risk_level', label: 'Risk Level', fieldType: FieldType.SINGLE_SELECT, isRequired: true, sortOrder: 7, options: JSON.stringify([{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: cvV1.id, name: 'test_evidence_provided', label: 'Test Evidence Provided', fieldType: FieldType.BOOLEAN, isRequired: false, sortOrder: 8 } }),
  ])

  const crStates = {
    draft: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'DRAFT', label: 'Draft', isInitial: true, color: '#94a3b8', sortOrder: 1 } }),
    submitted: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'SUBMITTED', label: 'Submitted', color: '#3b82f6', sortOrder: 2 } }),
    initialReview: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'INITIAL_REVIEW', label: 'Initial Review', color: '#8b5cf6', sortOrder: 3 } }),
    cabReview: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'CAB_REVIEW', label: 'CAB Review', color: '#f59e0b', sortOrder: 4 } }),
    approved: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'APPROVED', label: 'Approved', isFinal: false, color: '#10b981', sortOrder: 5 } }),
    implemented: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'IMPLEMENTED', label: 'Implemented', isFinal: true, color: '#059669', sortOrder: 6 } }),
    rejected: await prisma.workflowState.create({ data: { workflowVersionId: cvV1.id, name: 'REJECTED', label: 'Rejected', isFinal: true, color: '#ef4444', sortOrder: 7 } }),
  }

  // Change Request Transitions
  const crT1 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'submit', label: 'Submit Request', fromStateId: crStates.draft.id, toStateId: crStates.submitted.id, sortOrder: 1, permissions: { create: [{ roleId: roleRequester.id }, { roleId: roleAdmin.id }] } } })
  const crT2 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'start_review', label: 'Start Review', fromStateId: crStates.submitted.id, toStateId: crStates.initialReview.id, sortOrder: 1, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  const crT3 = await prisma.workflowTransition.create({
    data: { workflowVersionId: cvV1.id, name: 'escalate_cab', label: 'Escalate to CAB', fromStateId: crStates.initialReview.id, toStateId: crStates.cabReview.id, sortOrder: 1, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [{ fieldName: 'risk_level', operator: ConditionOperator.EQUALS, value: 'high', groupLogic: LogicType.AND, sortOrder: 1 }] },
    },
  })
  const crT4 = await prisma.workflowTransition.create({
    data: { workflowVersionId: cvV1.id, name: 'approve_initial', label: 'Approve', fromStateId: crStates.initialReview.id, toStateId: crStates.approved.id, sortOrder: 2, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [{ fieldName: 'risk_level', operator: ConditionOperator.NOT_EQUALS, value: 'high', groupLogic: LogicType.AND, sortOrder: 1 }] },
    },
  })
  const crT5 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'reject_initial', label: 'Reject', fromStateId: crStates.initialReview.id, toStateId: crStates.rejected.id, sortOrder: 3, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  const crT6 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'cab_approve', label: 'CAB Approve', fromStateId: crStates.cabReview.id, toStateId: crStates.approved.id, sortOrder: 1, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  const crT7 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'cab_reject', label: 'CAB Reject', fromStateId: crStates.cabReview.id, toStateId: crStates.rejected.id, sortOrder: 2, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  const crT8 = await prisma.workflowTransition.create({ data: { workflowVersionId: cvV1.id, name: 'mark_implemented', label: 'Mark as Implemented', fromStateId: crStates.approved.id, toStateId: crStates.implemented.id, sortOrder: 1, permissions: { create: [{ roleId: roleRequester.id }, { roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })

  await prisma.sLARule.createMany({ data: [
    { workflowVersionId: cvV1.id, stateId: crStates.submitted.id, name: 'Submission SLA', durationHours: 48, warningPercent: 75 },
    { workflowVersionId: cvV1.id, stateId: crStates.initialReview.id, name: 'Initial Review SLA', durationHours: 72, warningPercent: 80 },
    { workflowVersionId: cvV1.id, stateId: crStates.cabReview.id, name: 'CAB Review SLA', durationHours: 168, warningPercent: 80, escalateOnBreach: true },
  ]})

  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_CREATED, userId: uDesigner.id, metadata: { versionId: cvV1.id, version: 1, requestTypeId: rtChange.id } } })
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_PUBLISHED, userId: uAdmin.id, metadata: { versionId: cvV1.id, setActive: true } } })

  console.log('✅ Change Request workflow created')

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCEPTION / WAIVER REQUEST — V1 (published, active)
  // ═══════════════════════════════════════════════════════════════════════════
  const wvV1 = await prisma.workflowVersion.create({
    data: { requestTypeId: rtWaiver.id, version: 1, isPublished: true, isActive: true,
      publishedAt: d(10), changelog: 'Initial waiver workflow with leadership escalation for >90 day exceptions' },
  })

  const wrFields = await Promise.all([
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'policy_control_name', label: 'Policy / Control Name', fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 1 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'exception_reason', label: 'Exception Reason', fieldType: FieldType.LONG_TEXT, isRequired: true, sortOrder: 2, validationRules: JSON.stringify({ minLength: 30 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'compensating_controls', label: 'Compensating Controls', fieldType: FieldType.LONG_TEXT, isRequired: true, sortOrder: 3, helpText: 'Describe controls in place to mitigate the risk. Required — must not be blank.' } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'start_date', label: 'Exception Start Date', fieldType: FieldType.DATE, isRequired: true, sortOrder: 4 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'end_date', label: 'Exception End Date', fieldType: FieldType.DATE, isRequired: true, sortOrder: 5, helpText: 'Must be after the start date' } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'duration_days', label: 'Duration (days)', fieldType: FieldType.NUMBER, isRequired: true, sortOrder: 6, helpText: 'Number of days for this exception. Exceptions > 90 days require leadership approval.', validationRules: JSON.stringify({ min: 1 }) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'review_frequency', label: 'Review Frequency', fieldType: FieldType.SINGLE_SELECT, isRequired: true, sortOrder: 7, options: JSON.stringify([{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annually', label: 'Annually' }]) } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'risk_accepted_by', label: 'Risk Accepted By', fieldType: FieldType.SHORT_TEXT, isRequired: true, sortOrder: 8 } }),
    prisma.fieldDefinition.create({ data: { workflowVersionId: wvV1.id, name: 'evidence_summary', label: 'Evidence / Attachment Summary', fieldType: FieldType.LONG_TEXT, isRequired: false, sortOrder: 9 } }),
  ])

  const wrStates = {
    draft: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'DRAFT', label: 'Draft', isInitial: true, color: '#94a3b8', sortOrder: 1 } }),
    submitted: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'SUBMITTED', label: 'Submitted', color: '#3b82f6', sortOrder: 2 } }),
    complianceReview: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'COMPLIANCE_REVIEW', label: 'Compliance Review', color: '#8b5cf6', sortOrder: 3 } }),
    leadershipApproval: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'LEADERSHIP_APPROVAL', label: 'Leadership Approval', color: '#f59e0b', sortOrder: 4 } }),
    approved: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'APPROVED', label: 'Approved', isFinal: true, color: '#10b981', sortOrder: 5 } }),
    rejected: await prisma.workflowState.create({ data: { workflowVersionId: wvV1.id, name: 'REJECTED', label: 'Rejected', isFinal: true, color: '#ef4444', sortOrder: 6 } }),
  }

  await prisma.workflowTransition.create({ data: { workflowVersionId: wvV1.id, name: 'submit', label: 'Submit Request', fromStateId: wrStates.draft.id, toStateId: wrStates.submitted.id, sortOrder: 1, permissions: { create: [{ roleId: roleRequester.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: wvV1.id, name: 'start_compliance', label: 'Start Compliance Review', fromStateId: wrStates.submitted.id, toStateId: wrStates.complianceReview.id, sortOrder: 1, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({
    data: { workflowVersionId: wvV1.id, name: 'escalate_leadership', label: 'Escalate to Leadership', fromStateId: wrStates.complianceReview.id, toStateId: wrStates.leadershipApproval.id, sortOrder: 1, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [{ fieldName: 'duration_days', operator: ConditionOperator.GREATER_THAN, value: '90', groupLogic: LogicType.AND, sortOrder: 1 }] },
    },
  })
  await prisma.workflowTransition.create({
    data: { workflowVersionId: wvV1.id, name: 'approve_compliance', label: 'Approve', fromStateId: wrStates.complianceReview.id, toStateId: wrStates.approved.id, sortOrder: 2, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [{ fieldName: 'duration_days', operator: ConditionOperator.LESS_THAN, value: '91', groupLogic: LogicType.AND, sortOrder: 1 }] },
    },
  })
  await prisma.workflowTransition.create({ data: { workflowVersionId: wvV1.id, name: 'reject_compliance', label: 'Reject', fromStateId: wrStates.complianceReview.id, toStateId: wrStates.rejected.id, sortOrder: 3, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: wvV1.id, name: 'leadership_approve', label: 'Leadership Approve', fromStateId: wrStates.leadershipApproval.id, toStateId: wrStates.approved.id, sortOrder: 1, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: wvV1.id, name: 'leadership_reject', label: 'Leadership Reject', fromStateId: wrStates.leadershipApproval.id, toStateId: wrStates.rejected.id, sortOrder: 2, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })

  await prisma.sLARule.createMany({ data: [
    { workflowVersionId: wvV1.id, stateId: wrStates.submitted.id, name: 'Submission SLA', durationHours: 48, warningPercent: 75 },
    { workflowVersionId: wvV1.id, stateId: wrStates.complianceReview.id, name: 'Compliance Review SLA', durationHours: 120, warningPercent: 80, escalateOnBreach: true },
    { workflowVersionId: wvV1.id, stateId: wrStates.leadershipApproval.id, name: 'Leadership Approval SLA', durationHours: 240, warningPercent: 80, escalateOnBreach: true },
  ]})

  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_CREATED, userId: uDesigner.id, metadata: { versionId: wvV1.id, version: 1, requestTypeId: rtWaiver.id } } })
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.WORKFLOW_VERSION_PUBLISHED, userId: uAdmin.id, metadata: { versionId: wvV1.id, setActive: true } } })

  console.log('✅ Waiver Request workflow created')

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  const ar = (fds: any[], fieldMap: Record<string,string>) =>
    fds.filter(f => fieldMap[f.name] !== undefined).map(f => ({ fieldDefinitionId: f.id, value: fieldMap[f.name] }))

  // ── Access Requests (v2) ─────────────────────────────────────────────────

  // AR01: Admin access to prod DB — SECURITY_REVIEW, SLA BREACHED (80h in, 72h SLA)
  const ar01EnteredAt = h(80)
  const ar01BreachAt = slaAt(ar01EnteredAt, 72, 100)
  const ar01WarnAt = slaAt(ar01EnteredAt, 72, 80)
  const ar01 = await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.securityReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer1.id, title: 'Admin access to Production Database',
    status: RequestStatus.IN_PROGRESS, priority: Priority.CRITICAL,
    stateEnteredAt: ar01EnteredAt, slaBreachedAt: ar01BreachAt, slaWarningAt: ar01WarnAt,
    submittedAt: d(4), createdAt: d(5),
    fieldValues: { create: ar(arV2Fields, { system_name: 'PostgreSQL Production', access_level: 'admin', business_justification: 'DBA team requires admin access for urgent performance optimization and incident response. Production latency has increased by 400%.', manager_name: 'Chris Manager', manager_email: 'chris@company.com', temporary_access: 'false', sensitive_access: 'true', access_duration: '1_year' }) },
  }})
  await prisma.auditEvent.createMany({ data: [
    { requestId: ar01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(5) },
    { requestId: ar01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: d(4) },
    { requestId: ar01.id, userId: uReviewer1.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Submitted', toStateName: 'Manager Review' }, createdAt: d(3) },
    { requestId: ar01.id, userId: uReviewer1.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Manager Review', toStateName: 'Security Review' }, createdAt: h(80) },
    { requestId: ar01.id, userId: uReq2.id, eventType: AuditEventType.INVALID_TRANSITION_ATTEMPTED, metadata: { reason: 'Insufficient role', transitionLabel: 'Approve' }, createdAt: h(70) },
  ]})
  await prisma.requestComment.createMany({ data: [
    { requestId: ar01.id, authorId: uReviewer1.id, content: 'Admin access to production DB detected — escalating to security team for review. This is a privileged access request.', isInternal: true, createdAt: d(3) },
    { requestId: ar01.id, authorId: uReviewer1.id, content: 'Security team: please expedite this review. SLA has now been breached.', isInternal: true, createdAt: h(5) },
  ]})

  // AR02: Editor access to CRM — MANAGER_REVIEW, SLA WARNING (40h in, 48h SLA warn at 75%=36h)
  const ar02EnteredAt = h(40)
  const ar02BreachAt = slaAt(ar02EnteredAt, 48, 100)
  const ar02WarnAt = slaAt(ar02EnteredAt, 48, 75)
  const ar02 = await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.managerReview.id,
    requesterId: uReq2.id, assigneeId: uReviewer1.id, title: 'Editor access to CRM system for Q4 campaign',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: ar02EnteredAt, slaBreachedAt: ar02BreachAt, slaWarningAt: ar02WarnAt,
    submittedAt: d(2), createdAt: d(2),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Salesforce CRM', access_level: 'editor', business_justification: 'Need editor access to manage Q4 campaign contacts and update lead scoring. Currently blocked from essential sales workflows.', manager_name: 'Taylor Lead', manager_email: 'taylor@company.com', temporary_access: 'true', expiration_date: '2026-12-31', sensitive_access: 'false', access_duration: '90_days' }) },
  }})
  await prisma.auditEvent.createMany({ data: [
    { requestId: ar02.id, userId: uReq2.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(2) },
    { requestId: ar02.id, userId: uReq2.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: d(2) },
    { requestId: ar02.id, userId: uReviewer1.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Submitted', toStateName: 'Manager Review' }, createdAt: ar02EnteredAt },
  ]})
  await prisma.requestComment.create({ data: { requestId: ar02.id, authorId: uReviewer1.id, content: 'Verified with manager — temporary access approved in principle, processing formal approval.', isInternal: false, createdAt: h(35) } })

  // AR03: APPROVED
  const ar03 = await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.approved.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'Viewer access to Analytics Dashboard',
    status: RequestStatus.COMPLETED, priority: Priority.LOW,
    stateEnteredAt: d(5), submittedAt: d(8), completedAt: d(5), createdAt: d(9),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Tableau Analytics', access_level: 'viewer', business_justification: 'Need read access to sales dashboards to prepare monthly executive reports. Role requires data visibility without edit capability.', manager_name: 'Alex Manager', manager_email: 'alex@company.com', temporary_access: 'false', sensitive_access: 'false', access_duration: '1_year' }) },
  }})

  // AR04: DRAFT (requester2, incomplete)
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: null,
    requesterId: uReq2.id, title: 'Admin access to Dev Server', status: RequestStatus.DRAFT, priority: Priority.MEDIUM, createdAt: d(1),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Dev-Server-01', access_level: 'admin' }) },
  }})

  // AR05: SUBMITTED
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.submitted.id,
    requesterId: uReq1.id, title: 'Editor access to Confluence documentation', status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: h(6), slaBreachedAt: slaAt(h(6), 24, 100), slaWarningAt: slaAt(h(6), 24, 80),
    submittedAt: h(6), createdAt: h(8),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Confluence', access_level: 'editor', business_justification: 'Need to update team documentation and create new runbooks for the platform engineering team.', manager_name: 'Pat Manager', manager_email: 'pat@company.com', temporary_access: 'false', sensitive_access: 'false', access_duration: '1_year' }) },
  }})

  // AR06: *** IN-FLIGHT ON OLD V1 — this proves version isolation ***
  const ar06EnteredAt = d(15)
  const ar06 = await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV1.id, currentStateId: arV1States.managerReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'Legacy VPN access for remote work (v1 workflow)',
    status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: ar06EnteredAt, slaBreachedAt: slaAt(ar06EnteredAt, 48, 100), slaWarningAt: slaAt(ar06EnteredAt, 48, 75),
    submittedAt: d(20), createdAt: d(21),
    fieldValues: { create: ar(arV1Fields, { system_name: 'Legacy VPN Gateway', access_level: 'viewer', business_justification: 'Remote team member needs VPN access to reach internal resources securely. This was submitted before the v2 workflow was activated.', manager_name: 'Sam Manager', manager_email: 'sam@company.com', temporary_access: 'true', expiration_date: '2026-09-30', sensitive_access: 'false' }) },
  }})
  await prisma.requestComment.create({ data: { requestId: ar06.id, authorId: uReq1.id, content: 'Please expedite this — our team member starts Monday and needs VPN access.', isInternal: false, createdAt: d(16) } })
  await prisma.requestComment.create({ data: { requestId: ar06.id, authorId: uReviewer2.id, content: 'Under review. Note: this request was created under the old v1 workflow and will continue on that version.', isInternal: false, createdAt: d(15) } })
  await prisma.auditEvent.createMany({ data: [
    { requestId: ar06.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(21) },
    { requestId: ar06.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: d(20) },
    { requestId: ar06.id, userId: uReviewer2.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Submitted', toStateName: 'Manager Review' }, createdAt: d(15) },
  ]})

  // AR07: REJECTED
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.rejected.id,
    requesterId: uReq2.id, title: 'Admin access to Financial Reports system',
    status: RequestStatus.REJECTED, priority: Priority.HIGH,
    stateEnteredAt: d(2), submittedAt: d(4), completedAt: d(2), createdAt: d(5),
    fieldValues: { create: ar(arV2Fields, { system_name: 'FinanceReports Pro', access_level: 'admin', business_justification: 'Need admin access to run financial reports.', manager_name: 'Joe Mgr', manager_email: 'joe@company.com', temporary_access: 'false', sensitive_access: 'true', access_duration: 'permanent' }) },
  }})

  // AR08: SUBMITTED
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.submitted.id,
    requesterId: uReq2.id, title: 'Viewer access to HR Portal for onboarding',
    status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: h(3), slaBreachedAt: slaAt(h(3), 24, 100), slaWarningAt: slaAt(h(3), 24, 80),
    submittedAt: h(3), createdAt: h(5),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Workday HR', access_level: 'viewer', business_justification: 'New hire onboarding requires access to HR portal to complete benefits enrollment and policy acknowledgements.', manager_name: 'Kim Manager', manager_email: 'kim@company.com', temporary_access: 'false', sensitive_access: 'false', access_duration: '1_year' }) },
  }})

  // AR09: APPROVED
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.approved.id,
    requesterId: uReq1.id, title: 'Editor access to Notion workspace',
    status: RequestStatus.COMPLETED, priority: Priority.LOW,
    stateEnteredAt: d(1), submittedAt: d(3), completedAt: d(1), createdAt: d(4),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Notion', access_level: 'editor', business_justification: 'Product team needs editor access to maintain roadmap and OKR tracking in shared Notion workspace.', manager_name: 'Lee Manager', manager_email: 'lee@company.com', temporary_access: 'false', sensitive_access: 'false', access_duration: '1_year' }) },
  }})

  // AR10: SECURITY_REVIEW, SLA near breach
  const ar10EnteredAt = h(68)
  await prisma.request.create({ data: {
    requestTypeId: rtAccess.id, workflowVersionId: avV2.id, currentStateId: arV2States.securityReview.id,
    requesterId: uReq2.id, assigneeId: uReviewer2.id, title: 'Admin access to Kubernetes production cluster',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: ar10EnteredAt, slaBreachedAt: slaAt(ar10EnteredAt, 72, 100), slaWarningAt: slaAt(ar10EnteredAt, 72, 80),
    submittedAt: d(4), createdAt: d(5),
    fieldValues: { create: ar(arV2Fields, { system_name: 'Kubernetes Production', access_level: 'admin', business_justification: 'Platform engineering team needs kubectl admin access to manage production workloads, debug pods, and perform cluster maintenance.', manager_name: 'Casey Director', manager_email: 'casey@company.com', temporary_access: 'false', sensitive_access: 'true', access_duration: '1_year' }) },
  }})

  console.log('✅ Access Request records created')

  // ── Change Requests ──────────────────────────────────────────────────────

  const cr = (fieldMap: Record<string,string>) =>
    crFields.filter(f => fieldMap[f.name] !== undefined).map(f => ({ fieldDefinitionId: f.id, value: fieldMap[f.name] }))

  // CR01: CAB_REVIEW, near breach (136h in, 168h SLA warn at 80%=134.4h)
  const cr01EnteredAt = h(136)
  const cr01 = await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.cabReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'Production database schema migration for v3.0 release',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: cr01EnteredAt, slaBreachedAt: slaAt(cr01EnteredAt, 168, 100), slaWarningAt: slaAt(cr01EnteredAt, 168, 80),
    submittedAt: d(8), createdAt: d(9),
    fieldValues: { create: cr({ system_application: 'PostgreSQL Production', change_summary: 'Schema migration adding 3 new tables and modifying 5 existing tables for the v3.0 data model. Includes adding foreign key constraints and updating indexes for query performance.', implementation_date: '2026-06-28T02:00', rollback_plan: 'Pre-migration snapshot taken. Rollback script prepared and tested in staging. Estimated rollback time: 15 minutes. DBA on-call during change window.', outage_expected: 'true', outage_duration: '30', risk_level: 'high', test_evidence_provided: 'true' }) },
  }})
  await prisma.requestComment.createMany({ data: [
    { requestId: cr01.id, authorId: uReviewer2.id, content: 'High risk change — escalating to CAB for full board review. Schema migrations on production require additional sign-off.', isInternal: false, createdAt: d(6) },
    { requestId: cr01.id, authorId: uReviewer2.id, content: 'CAB meeting scheduled for Thursday. Pre-read materials sent to board members.', isInternal: true, createdAt: h(140) },
  ]})
  await prisma.auditEvent.createMany({ data: [
    { requestId: cr01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(9) },
    { requestId: cr01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: d(8) },
    { requestId: cr01.id, userId: uReviewer2.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Submitted', toStateName: 'Initial Review' }, createdAt: d(7) },
    { requestId: cr01.id, userId: uReviewer2.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Initial Review', toStateName: 'CAB Review' }, createdAt: cr01EnteredAt },
  ]})

  // CR02: SUBMITTED — was draft with missing rollback plan, then corrected and submitted
  const cr02 = await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.submitted.id,
    requesterId: uReq2.id, title: 'Apply security patches to all web servers',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: h(10), slaBreachedAt: slaAt(h(10), 48, 100), slaWarningAt: slaAt(h(10), 48, 75),
    submittedAt: h(10), createdAt: d(2),
    fieldValues: { create: cr({ system_application: 'Web Server Fleet (Nginx)', change_summary: 'Apply critical security patches CVE-2026-1234 and CVE-2026-5678 to all production web servers. Patches address remote code execution vulnerabilities rated CVSS 9.8.', implementation_date: '2026-06-25T22:00', rollback_plan: 'Uninstall patches via package manager. Verified rollback procedure in staging. Rollback time < 5 minutes per server with automation.', outage_expected: 'false', risk_level: 'medium', test_evidence_provided: 'true' }) },
  }})
  await prisma.requestComment.create({ data: { requestId: cr02.id, authorId: uReq2.id, content: 'Initially submitted without rollback plan. Have now added detailed rollback procedure including uninstall commands and timing estimates.', isInternal: false, createdAt: h(11) } })
  await prisma.auditEvent.createMany({ data: [
    { requestId: cr02.id, userId: uReq2.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(2) },
    { requestId: cr02.id, userId: uReq2.id, eventType: AuditEventType.REQUEST_UPDATED, metadata: { changes: ['rollback_plan'] }, createdAt: h(12) },
    { requestId: cr02.id, userId: uReq2.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: h(10) },
  ]})

  // CR03: IMPLEMENTED
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.implemented.id,
    requesterId: uReq1.id, title: 'Deploy UI redesign to production (v2.5.0)',
    status: RequestStatus.COMPLETED, priority: Priority.MEDIUM,
    stateEnteredAt: d(1), submittedAt: d(7), completedAt: d(1), createdAt: d(8),
    fieldValues: { create: cr({ system_application: 'Frontend Application', change_summary: 'Deploy redesigned UI with new navigation structure, updated color palette, and improved accessibility (WCAG 2.1 AA compliance). Includes 15 new components and removal of deprecated jQuery dependency.', implementation_date: '2026-06-20T03:00', rollback_plan: 'Blue-green deployment — switch load balancer back to v2.4.9 instance. < 30 second rollback.', outage_expected: 'false', risk_level: 'low', test_evidence_provided: 'true' }) },
  }})

  // CR04: INITIAL_REVIEW, urgent (implementation within 48h from now)
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.initialReview.id,
    requesterId: uReq2.id, assigneeId: uReviewer1.id, title: 'Emergency SSL certificate renewal — expires in 36 hours',
    status: RequestStatus.IN_PROGRESS, priority: Priority.CRITICAL,
    stateEnteredAt: h(2), slaBreachedAt: slaAt(h(2), 72, 100), slaWarningAt: slaAt(h(2), 72, 80),
    submittedAt: h(3), createdAt: h(4),
    fieldValues: { create: cr({ system_application: 'api.company.com (Production)', change_summary: 'Emergency SSL certificate renewal. Current certificate expires in 36 hours. Must renew to prevent service outage and security warnings for all API consumers.', implementation_date: new Date(now.getTime() + 36 * 3600000).toISOString().slice(0, 16), rollback_plan: 'Keep old certificate available for 24h. Revert DNS if new cert has issues. Tested renewal in staging.', outage_expected: 'false', risk_level: 'medium', test_evidence_provided: 'false' }) },
  }})
  await prisma.requestComment.create({ data: { requestId: cr02.id, authorId: uReviewer1.id, content: 'Implementation date is within 48 hours — flagging as urgent and expediting review.', isInternal: true, createdAt: h(1) } })

  // CR05: IMPLEMENTED
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.implemented.id,
    requesterId: uReq1.id, title: 'Upgrade API Gateway from v2.1 to v3.0',
    status: RequestStatus.COMPLETED, priority: Priority.HIGH,
    stateEnteredAt: d(3), submittedAt: d(10), completedAt: d(3), createdAt: d(12),
    fieldValues: { create: cr({ system_application: 'Kong API Gateway', change_summary: 'Major version upgrade of Kong from 2.1 to 3.0. Includes breaking changes to rate limiting config, new authentication plugins, and improved observability features.', implementation_date: '2026-06-19T01:00', rollback_plan: 'Backup all Kong configuration. Can reinstall v2.1 from package within 10 minutes. Configuration tested.', outage_expected: 'true', outage_duration: '15', risk_level: 'high', test_evidence_provided: 'true' }) },
  }})

  // CR06: SUBMITTED, SLA BREACHED (50h in, 48h SLA)
  const cr06EnteredAt = h(50)
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.submitted.id,
    requesterId: uReq2.id, title: 'Load balancer health check configuration update',
    status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: cr06EnteredAt, slaBreachedAt: slaAt(cr06EnteredAt, 48, 100), slaWarningAt: slaAt(cr06EnteredAt, 48, 75),
    submittedAt: cr06EnteredAt, createdAt: h(52),
    fieldValues: { create: cr({ system_application: 'HAProxy Load Balancer', change_summary: 'Update health check intervals from 5s to 2s and adjust failure thresholds for faster failover detection. Also updating session persistence settings.', implementation_date: '2026-06-27T04:00', rollback_plan: 'Revert haproxy.cfg from version control. Service restart < 2 minutes.', outage_expected: 'false', risk_level: 'low', test_evidence_provided: 'true' }) },
  }})

  // CR07: INITIAL_REVIEW
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.initialReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'Database backup schedule optimization',
    status: RequestStatus.IN_PROGRESS, priority: Priority.LOW,
    stateEnteredAt: h(24), slaBreachedAt: slaAt(h(24), 72, 100), slaWarningAt: slaAt(h(24), 72, 80),
    submittedAt: d(2), createdAt: d(3),
    fieldValues: { create: cr({ system_application: 'PostgreSQL Production', change_summary: 'Optimize backup schedule by changing from full daily backups to incremental hourly backups with weekly full backup. Reduces backup window from 4h to 30min.', implementation_date: '2026-07-01T00:00', rollback_plan: 'Revert to previous pg_cron schedule. Previous schedule stored in runbook.', outage_expected: 'false', risk_level: 'low', test_evidence_provided: 'true' }) },
  }})

  // CR08: REJECTED
  await prisma.request.create({ data: {
    requestTypeId: rtChange.id, workflowVersionId: cvV1.id, currentStateId: crStates.rejected.id,
    requesterId: uReq2.id, title: 'Remove multi-factor authentication requirement',
    status: RequestStatus.REJECTED, priority: Priority.MEDIUM,
    stateEnteredAt: d(1), submittedAt: d(5), completedAt: d(1), createdAt: d(6),
    fieldValues: { create: cr({ system_application: 'All production systems', change_summary: 'Disable MFA requirement for internal network connections to reduce authentication friction.', implementation_date: '2026-06-30T09:00', rollback_plan: 'Re-enable MFA policies via IAM console.', outage_expected: 'false', risk_level: 'medium', test_evidence_provided: 'false' }) },
  }})

  console.log('✅ Change Request records created')

  // ── Waiver Requests ──────────────────────────────────────────────────────

  const wr = (fieldMap: Record<string,string>) =>
    wrFields.filter(f => fieldMap[f.name] !== undefined).map(f => ({ fieldDefinitionId: f.id, value: fieldMap[f.name] }))

  // WR01: LEADERSHIP_APPROVAL, near breach (220h in, 240h SLA warn at 80%=192h)
  const wr01EnteredAt = h(220)
  const wr01 = await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.leadershipApproval.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'PCI DSS scope reduction exception — card data tokenization delay',
    status: RequestStatus.IN_PROGRESS, priority: Priority.CRITICAL,
    stateEnteredAt: wr01EnteredAt, slaBreachedAt: slaAt(wr01EnteredAt, 240, 100), slaWarningAt: slaAt(wr01EnteredAt, 240, 80),
    submittedAt: d(14), createdAt: d(15),
    fieldValues: { create: wr({ policy_control_name: 'PCI DSS Requirement 3.4 - Card Data Tokenization', exception_reason: 'The tokenization vendor integration has been delayed by 6 weeks due to API compatibility issues discovered during UAT. We need a 120-day exception to complete integration while maintaining compliance posture.', compensating_controls: '1. All card data encrypted at rest using AES-256. 2. Network segmentation isolating cardholder data environment. 3. Monthly vulnerability scans performed. 4. Access logs reviewed weekly by security team. 5. Incident response plan in place.', start_date: '2026-07-01', end_date: '2026-10-28', duration_days: '119', review_frequency: 'monthly', risk_accepted_by: 'CISO - Dr. Sarah Chen', evidence_summary: 'UAT test reports, vendor delay notification, compensating control evidence attached to ticket TS-2847.' }) },
  }})
  await prisma.requestComment.createMany({ data: [
    { requestId: wr01.id, authorId: uReviewer2.id, content: 'Duration is 119 days — exceeds 90-day threshold. Escalating to leadership for mandatory approval per policy.', isInternal: false, createdAt: d(10) },
    { requestId: wr01.id, authorId: uAdmin.id, content: 'Leadership review in progress. CISO has been briefed. Decision expected within 5 business days.', isInternal: true, createdAt: d(5) },
  ]})
  await prisma.auditEvent.createMany({ data: [
    { requestId: wr01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_CREATED, createdAt: d(15) },
    { requestId: wr01.id, userId: uReq1.id, eventType: AuditEventType.REQUEST_SUBMITTED, createdAt: d(14) },
    { requestId: wr01.id, userId: uReviewer2.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Submitted', toStateName: 'Compliance Review' }, createdAt: d(12) },
    { requestId: wr01.id, userId: uReviewer2.id, eventType: AuditEventType.STATE_CHANGED, metadata: { fromStateName: 'Compliance Review', toStateName: 'Leadership Approval' }, createdAt: wr01EnteredAt },
  ]})

  // WR02: APPROVED (60-day waiver, normal path)
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.approved.id,
    requesterId: uReq2.id, assigneeId: uReviewer1.id, title: 'SOC2 audit scope limitation — legacy reporting module',
    status: RequestStatus.COMPLETED, priority: Priority.HIGH,
    stateEnteredAt: d(2), submittedAt: d(10), completedAt: d(2), createdAt: d(12),
    fieldValues: { create: wr({ policy_control_name: 'SOC2 Type II - Availability and Confidentiality', exception_reason: 'Legacy reporting module (v1.2, end-of-life Q4) cannot be updated to meet SOC2 logging requirements without complete rewrite. Module retirement scheduled for Q4 2026.', compensating_controls: 'Enhanced monitoring via SIEM, daily log review, network isolation, read-only access only, quarterly penetration testing.', start_date: '2026-07-01', end_date: '2026-08-29', duration_days: '60', review_frequency: 'monthly', risk_accepted_by: 'CTO - Marcus Williams', evidence_summary: 'Legacy system architecture diagram, retirement plan Q4-2026 attached.' }) },
  }})
  await prisma.requestComment.create({ data: {
    requestId: (await prisma.request.findFirst({ where: { title: { contains: 'SOC2' } } }))!.id,
    authorId: uReviewer1.id, content: 'Compensating controls are adequate for the 60-day exception period. Approving with monthly review requirement.', isInternal: false, createdAt: d(3),
  }})

  // WR03: COMPLIANCE_REVIEW, 30 days
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.complianceReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer1.id, title: 'Firewall exception for third-party integration',
    status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: h(48), slaBreachedAt: slaAt(h(48), 120, 100), slaWarningAt: slaAt(h(48), 120, 80),
    submittedAt: d(3), createdAt: d(4),
    fieldValues: { create: wr({ policy_control_name: 'Network Security Policy - Firewall Rule Management', exception_reason: 'Third-party payment processor requires inbound access on port 8443 from specific IP range. Standard firewall policy blocks this.', compensating_controls: 'IP whitelist restricted to vendor IP range, TLS 1.3 enforced, traffic monitored via IDS, vendor security attestation on file.', start_date: '2026-07-01', end_date: '2026-07-30', duration_days: '29', review_frequency: 'monthly', risk_accepted_by: 'VP Engineering', evidence_summary: 'Vendor security questionnaire attached.' }) },
  }})

  // WR04: DRAFT
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: null,
    requesterId: uReq2.id, title: 'Password complexity policy exception for service accounts',
    status: RequestStatus.DRAFT, priority: Priority.LOW, createdAt: h(2),
    fieldValues: { create: wr({ policy_control_name: 'Password Policy - Complexity Requirements', exception_reason: 'Service accounts cannot use special characters as the legacy system rejects them.' }) },
  }})

  // WR05: COMPLIANCE_REVIEW, 120 days, near breach (100h in, 120h SLA warn at 80%=96h)
  const wr05EnteredAt = h(100)
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.complianceReview.id,
    requesterId: uReq1.id, assigneeId: uReviewer2.id, title: 'Network segmentation waiver for microservices migration',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: wr05EnteredAt, slaBreachedAt: slaAt(wr05EnteredAt, 120, 100), slaWarningAt: slaAt(wr05EnteredAt, 120, 80),
    submittedAt: d(6), createdAt: d(7),
    fieldValues: { create: wr({ policy_control_name: 'Network Security - Micro-segmentation Policy', exception_reason: 'Microservices migration requires temporary relaxation of strict network segmentation. East-west traffic must flow freely between pods during migration phase.', compensating_controls: 'Service mesh (Istio) enforcing mTLS between all services, pod security policies enforced, network policies still applied at namespace level, continuous monitoring with Falco.', start_date: '2026-07-01', end_date: '2026-10-28', duration_days: '120', review_frequency: 'monthly', risk_accepted_by: 'Head of Platform Engineering', evidence_summary: 'Istio configuration, namespace network policy docs attached.' }) },
  }})

  // WR06: REJECTED
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.rejected.id,
    requesterId: uReq2.id, title: 'Encryption exception for internal data lake',
    status: RequestStatus.REJECTED, priority: Priority.HIGH,
    stateEnteredAt: d(3), submittedAt: d(8), completedAt: d(3), createdAt: d(10),
    fieldValues: { create: wr({ policy_control_name: 'Data Protection - Encryption at Rest', exception_reason: 'Data lake storage costs are significantly higher with encryption enabled.', compensating_controls: '', start_date: '2026-07-01', end_date: '2026-12-31', duration_days: '183', review_frequency: 'quarterly', risk_accepted_by: 'VP Engineering', evidence_summary: '' }) },
  }})

  // WR07: SUBMITTED, SLA BREACHED (50h in, 48h SLA)
  const wr07EnteredAt = h(50)
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.submitted.id,
    requesterId: uReq1.id, title: 'Log retention reduction waiver — storage cost optimization',
    status: RequestStatus.IN_PROGRESS, priority: Priority.MEDIUM,
    stateEnteredAt: wr07EnteredAt, slaBreachedAt: slaAt(wr07EnteredAt, 48, 100), slaWarningAt: slaAt(wr07EnteredAt, 48, 75),
    submittedAt: wr07EnteredAt, createdAt: h(52),
    fieldValues: { create: wr({ policy_control_name: 'Log Retention Policy - 12 Month Minimum', exception_reason: 'Log storage costs have increased 300% YoY. Proposing 6-month retention for non-security logs to reduce costs while maintaining security log retention at 12 months.', compensating_controls: 'SIEM retains security event correlation data for 12 months. Compressed cold storage for older logs at 60% cost reduction. Automated archival policy in place.', start_date: '2026-07-15', end_date: '2026-10-15', duration_days: '92', review_frequency: 'quarterly', risk_accepted_by: 'CISO', evidence_summary: 'Cost analysis report and log classification matrix attached.' }) },
  }})

  // WR08: LEADERSHIP_APPROVAL, 180 days
  const wr08EnteredAt = h(120)
  await prisma.request.create({ data: {
    requestTypeId: rtWaiver.id, workflowVersionId: wvV1.id, currentStateId: wrStates.leadershipApproval.id,
    requesterId: uReq2.id, assigneeId: uAdmin.id, title: 'Access control exception for M&A due diligence team',
    status: RequestStatus.IN_PROGRESS, priority: Priority.HIGH,
    stateEnteredAt: wr08EnteredAt, slaBreachedAt: slaAt(wr08EnteredAt, 240, 100), slaWarningAt: slaAt(wr08EnteredAt, 240, 80),
    submittedAt: d(7), createdAt: d(8),
    fieldValues: { create: wr({ policy_control_name: 'Access Control Policy - Need-to-Know Principle', exception_reason: 'M&A due diligence requires external advisors to access financial and IP data across multiple restricted systems simultaneously for a 6-month period.', compensating_controls: 'All access through dedicated VDI environment, no data download, audit logging of all actions, NDA signed, access revoked immediately upon deal completion or termination.', start_date: '2026-07-01', end_date: '2026-12-28', duration_days: '180', review_frequency: 'monthly', risk_accepted_by: 'CEO + General Counsel', evidence_summary: 'NDA, advisor vetting reports, VDI configuration docs attached.' }) },
  }})

  // User role changed audit event
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.USER_ROLE_CHANGED, userId: uAdmin.id, metadata: { targetUserId: uAnalyst.id, prevRoles: [], newRoles: ['ANALYST'] } } })
  await prisma.auditEvent.create({ data: { eventType: AuditEventType.USER_ROLE_CHANGED, userId: uAdmin.id, metadata: { targetUserId: uDesigner.id, prevRoles: [], newRoles: ['WORKFLOW_DESIGNER'] } } })

  console.log('✅ Waiver Request records created')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Demo credentials (password: Demo1234!):')
  console.log('  admin@flowswitch.local      — Platform Admin')
  console.log('  designer@flowswitch.local   — Workflow Designer')
  console.log('  reviewer1@flowswitch.local  — Reviewer')
  console.log('  reviewer2@flowswitch.local  — Reviewer')
  console.log('  requester1@flowswitch.local — Requester')
  console.log('  requester2@flowswitch.local — Requester')
  console.log('  analyst@flowswitch.local    — Analyst (read-only)')
}

// ── Shared helper: seed Access Request transitions (same structure for v1 & v2) ──
async function seedAccessTransitions(
  versionId: string,
  states: Record<string, { id: string }>,
  roleRequester: { id: string },
  roleReviewer: { id: string },
  roleAdmin: { id: string },
) {
  await prisma.workflowTransition.create({ data: { workflowVersionId: versionId, name: 'submit', label: 'Submit for Review', fromStateId: states.draft.id, toStateId: states.submitted.id, sortOrder: 1, permissions: { create: [{ roleId: roleRequester.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: versionId, name: 'start_review', label: 'Start Review', fromStateId: states.submitted.id, toStateId: states.managerReview.id, sortOrder: 1, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({
    data: { workflowVersionId: versionId, name: 'escalate_security', label: 'Escalate to Security Review', fromStateId: states.managerReview.id, toStateId: states.securityReview.id, sortOrder: 1, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [
        { fieldName: 'sensitive_access', operator: ConditionOperator.EQUALS, value: 'true', groupId: 'g1', groupLogic: LogicType.OR, sortOrder: 1 },
        { fieldName: 'access_level', operator: ConditionOperator.EQUALS, value: 'admin', groupId: 'g1', groupLogic: LogicType.OR, sortOrder: 2 },
      ]},
    },
  })
  await prisma.workflowTransition.create({
    data: { workflowVersionId: versionId, name: 'approve_manager', label: 'Approve', fromStateId: states.managerReview.id, toStateId: states.approved.id, sortOrder: 2, requiresComment: true,
      permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] },
      conditions: { create: [
        { fieldName: 'sensitive_access', operator: ConditionOperator.EQUALS, value: 'false', groupId: 'g1', groupLogic: LogicType.AND, sortOrder: 1 },
        { fieldName: 'access_level', operator: ConditionOperator.NOT_EQUALS, value: 'admin', groupId: 'g1', groupLogic: LogicType.AND, sortOrder: 2 },
      ]},
    },
  })
  await prisma.workflowTransition.create({ data: { workflowVersionId: versionId, name: 'reject_manager', label: 'Reject', fromStateId: states.managerReview.id, toStateId: states.rejected.id, sortOrder: 3, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: versionId, name: 'approve_security', label: 'Approve', fromStateId: states.securityReview.id, toStateId: states.approved.id, sortOrder: 1, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
  await prisma.workflowTransition.create({ data: { workflowVersionId: versionId, name: 'reject_security', label: 'Reject', fromStateId: states.securityReview.id, toStateId: states.rejected.id, sortOrder: 2, requiresComment: true, permissions: { create: [{ roleId: roleReviewer.id }, { roleId: roleAdmin.id }] } } })
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
