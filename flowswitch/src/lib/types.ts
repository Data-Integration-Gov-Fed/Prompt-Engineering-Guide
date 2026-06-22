import type { RoleName, RequestStatus, Priority } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      roles: RoleName[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: RoleName[]
  }
}

export type { RoleName, RequestStatus, Priority }

export interface ConditionalLogic {
  action: 'show' | 'hide' | 'require'
  logic: 'AND' | 'OR'
  conditions: Array<{
    field: string
    operator: string
    value?: string
  }>
}

export interface FieldOption {
  value: string
  label: string
}

export interface ValidationRules {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
}
