import client from './client'

export interface Permission {
  id: number
  code: string
  name: string
  description: string | null
  category: string
}

export interface Role {
  id: number
  name: string
  description: string | null
  is_system: boolean
  is_active: boolean
  permissions: Permission[]
  created_at: string
  updated_at: string
}

export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const response = await client.get<Role[]>('/roles')
    return response.data
  },

  get: async (id: number): Promise<Role> => {
    const response = await client.get<Role>(`/roles/${id}`)
    return response.data
  },

  getPermissions: async (): Promise<Permission[]> => {
    const response = await client.get<Permission[]>('/roles/permissions')
    return response.data
  },
}
