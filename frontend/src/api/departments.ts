import client from './client'
import { PaginatedResponse } from './tickets'

export interface Department {
  id: number
  name: string
  description: string | null
  head_user_id: number | null
  head_user: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
  is_active: boolean
  users_count?: number
  created_at: string
}

export interface DepartmentListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export interface CreateDepartmentData {
  name: string
  description?: string
  head_user_id?: number
  is_active?: boolean
}

export const departmentsApi = {
  list: async (params?: DepartmentListParams): Promise<PaginatedResponse<Department>> => {
    const response = await client.get<PaginatedResponse<Department>>('/departments', { params })
    return response.data
  },

  getAll: async (): Promise<Department[]> => {
    const response = await client.get<Department[]>('/departments/all')
    return response.data
  },

  get: async (id: number): Promise<Department> => {
    const response = await client.get<Department>(`/departments/${id}`)
    return response.data
  },

  create: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await client.post<Department>('/departments', data)
    return response.data
  },

  update: async (id: number, data: Partial<CreateDepartmentData>): Promise<Department> => {
    const response = await client.put<Department>(`/departments/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/departments/${id}`)
  },
}
