import client from './client'
import { PaginatedResponse } from './tickets'

export interface StationPort {
  id: number
  port_number: number
  connector_type: string | null
  power_kw: number | null
  status: string
  last_session_at: string | null
}

export interface Station {
  id: number
  station_id: string
  external_id: string | null  // Operator's station number
  name: string
  operator_id: number
  operator: {
    id: number
    name: string
  }
  address: string | null
  city: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  model: string | null
  manufacturer: string | null
  firmware_version: string | null
  installation_date: string | null
  last_maintenance_date: string | null
  status: string
  ports: StationPort[]
  created_at: string
  updated_at: string | null
}

export interface StationListItem {
  id: number
  station_id: string
  external_id: string | null  // Operator's station number
  name: string
  operator: {
    id: number
    name: string
  }
  address: string | null
  city: string | null
  model: string | null
  status: string
}

export interface StationListParams {
  page?: number
  per_page?: number
  search?: string
  operator_id?: number
  city?: string
  station_status?: string
  language?: string
}

export interface CreateStationPort {
  port_number: number
  connector_type?: string
  power_kw?: number
}

export interface CreateStationData {
  station_id: string
  name: string
  operator_id: number
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  model?: string
  manufacturer?: string
  firmware_version?: string
  installation_date?: string
  ports?: CreateStationPort[]
}

export interface UpdateStationData {
  station_id?: string
  name?: string
  operator_id?: number
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  model?: string
  manufacturer?: string
  firmware_version?: string
  installation_date?: string
  last_maintenance_date?: string
  status?: string
}

export const stationsApi = {
  list: async (params?: StationListParams): Promise<PaginatedResponse<StationListItem>> => {
    const response = await client.get<PaginatedResponse<StationListItem>>('/stations', { params })
    return response.data
  },

  get: async (id: number, language?: string): Promise<Station> => {
    const response = await client.get<Station>(`/stations/${id}`, {
      params: { language: language || 'ua' }
    })
    return response.data
  },

  create: async (data: CreateStationData): Promise<Station> => {
    const response = await client.post<Station>('/stations', data)
    return response.data
  },

  update: async (id: number, data: UpdateStationData): Promise<Station> => {
    const response = await client.put<Station>(`/stations/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/stations/${id}`)
  },

  search: async (q: string, limit?: number, language?: string): Promise<Station[]> => {
    const response = await client.get<Station[]>('/stations/search', {
      params: { q, limit, language: language || 'ua' },
    })
    return response.data
  },

  // Ports
  getPorts: async (stationId: number): Promise<StationPort[]> => {
    const response = await client.get<StationPort[]>(`/stations/${stationId}/ports`)
    return response.data
  },

  createPort: async (stationId: number, data: CreateStationPort): Promise<StationPort> => {
    const response = await client.post<StationPort>(`/stations/${stationId}/ports`, data)
    return response.data
  },

  updatePort: async (stationId: number, portId: number, data: Partial<CreateStationPort & { status?: string }>): Promise<StationPort> => {
    const response = await client.put<StationPort>(`/stations/${stationId}/ports/${portId}`, data)
    return response.data
  },

  deletePort: async (stationId: number, portId: number): Promise<void> => {
    await client.delete(`/stations/${stationId}/ports/${portId}`)
  },
}
