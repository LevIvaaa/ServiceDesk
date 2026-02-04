import client from './client'
import { PaginatedResponse } from './tickets'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  department_id: number | null
  department: {
    id: number
    name: string
  } | null
  is_active: boolean
  is_admin: boolean
  roles: {
    id: number
    name: string
  }[]
  created_at: string
  updated_at: string
}

export interface UserListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
  department_id?: number
  role_id?: number
  lang?: string
}

export interface CreateUserData {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  department_id?: number
  is_active?: boolean
  is_admin?: boolean
  role_ids?: number[]
}

export interface UpdateUserData {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  department_id?: number | null
  is_active?: boolean
  is_admin?: boolean
  role_ids?: number[]
}

export const usersApi = {
  list: async (params?: UserListParams): Promise<PaginatedResponse<User>> => {
    const response = await client.get<PaginatedResponse<User>>('/users', { params })
    return response.data
  },

  get: async (id: number): Promise<User> => {
    const response = await client.get<User>(`/users/${id}`)
    return response.data
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await client.post<User>('/users', data)
    return response.data
  },

  update: async (id: number, data: UpdateUserData): Promise<User> => {
    const response = await client.put<User>(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/users/${id}`)
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await client.put(`/users/${id}/password`, null, { params: { new_password: newPassword } })
  },
}
