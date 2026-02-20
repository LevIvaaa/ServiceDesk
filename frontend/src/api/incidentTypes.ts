import client from './client'

export interface IncidentType {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface IncidentTypeCreate {
  name: string
}

export interface IncidentTypeUpdate {
  name?: string
  is_active?: boolean
}

export const incidentTypesApi = {
  list: async (activeOnly = false): Promise<IncidentType[]> => {
    const { data } = await client.get('/incident-types/', { params: { active_only: activeOnly } })
    return data
  },

  create: async (payload: IncidentTypeCreate): Promise<IncidentType> => {
    const { data } = await client.post('/incident-types/', payload)
    return data
  },

  update: async (id: number, payload: IncidentTypeUpdate): Promise<IncidentType> => {
    const { data } = await client.put(`/incident-types/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/incident-types/${id}`)
  },
}
