import client from './client'
import { PaginatedResponse } from './tickets'

export interface Notification {
  id: number
  type: string
  title: string
  message: string
  ticket_id: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationCount {
  total: number
  unread: number
}

export interface NotificationListParams {
  page?: number
  per_page?: number
  unread_only?: boolean
}

export const notificationsApi = {
  list: async (params?: NotificationListParams): Promise<PaginatedResponse<Notification>> => {
    const response = await client.get<PaginatedResponse<Notification>>('/notifications', { params })
    return response.data
  },

  getCount: async (): Promise<NotificationCount> => {
    const response = await client.get<NotificationCount>('/notifications/count')
    return response.data
  },

  markAsRead: async (id: number): Promise<void> => {
    await client.put(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await client.put('/notifications/read-all')
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/notifications/${id}`)
  },
}
