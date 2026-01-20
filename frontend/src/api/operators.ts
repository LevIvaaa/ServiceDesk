import client from './client'
import { PaginatedResponse } from './tickets'

export interface Operator {
  id: number
  name: string
  code: string
  contact_email: string | null
  contact_phone: string | null
  api_endpoint: string | null
  is_active: boolean
  notes: string | null
  stations_count?: number
  created_at: string
  updated_at: string
}

export interface OperatorListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export interface CreateOperatorData {
  name: string
  code: string
  contact_email?: string
  contact_phone?: string
  api_endpoint?: string
  is_active?: boolean
  notes?: string
}

export const operatorsApi = {
  list: async (params?: OperatorListParams): Promise<PaginatedResponse<Operator>> => {
    const response = await client.get<PaginatedResponse<Operator>>('/operators', { params })
    return response.data
  },

  get: async (id: number): Promise<Operator> => {
    const response = await client.get<Operator>(`/operators/${id}`)
    return response.data
  },

  create: async (data: CreateOperatorData): Promise<Operator> => {
    const response = await client.post<Operator>('/operators', data)
    return response.data
  },

  update: async (id: number, data: Partial<CreateOperatorData>): Promise<Operator> => {
    const response = await client.put<Operator>(`/operators/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/operators/${id}`)
  },
}
