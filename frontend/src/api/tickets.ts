import client from './client'

export interface TicketStation {
  id: number
  station_id: string
  station_number: string | null
  name: string
  address: string | null
  operator_name: string
}

export interface AILogAnalysis {
  analysis: string
  error_codes: string[]
  status: string
  recommendations: string[]
}

export interface Ticket {
  id: number
  ticket_number: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  station_id: number | null
  station: TicketStation | null
  port_number: number | null
  reporter_name: string | null
  reporter_phone: string | null
  reporter_email: string | null
  assigned_user_id: number | null
  assigned_user: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
  assigned_department_id: number | null
  assigned_department: {
    id: number
    name: string
  } | null
  created_by_id: number
  created_by: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
  sla_due_date: string | null
  sla_breached: boolean
  ai_log_analysis: AILogAnalysis | null
  comments_count: number
  attachments_count: number
  // New fields from TZ
  incident_type: string | null
  port_type: string | null
  contact_source: string | null
  station_logs: string | null
  vehicle: string | null  // Car model
  client_type: string | null  // B2C or B2B
}

export interface TicketComment {
  id: number
  ticket_id: number
  user_id: number
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  content: string
  is_internal: boolean
  created_at: string
}

export interface TicketHistory {
  id: number
  ticket_id: number
  user_id: number
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  action: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface TicketLog {
  id: number
  log_type: string
  filename: string
  file_size: number
  collected_at: string
  log_start_time: string | null
  log_end_time: string | null
  description: string | null
}

export interface TicketAttachment {
  id: number
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by_id: number
  uploaded_at: string
}

export interface ParsedMessageData {
  title: string | null
  description: string | null
  category: string | null
  priority: string | null
  // Station info
  station_id: string | null
  station_db_id: number | null
  station_name: string | null
  station_address: string | null
  station_city: string | null
  station_found: boolean
  // Operator info
  operator_name: string | null
  operator_db_id: number | null
  operator_found: boolean
  // Port and vehicle
  port_number: number | null
  vehicle_info: string | null
  // Reporter info
  reporter_name: string | null
  reporter_phone: string | null
  reporter_email: string | null
}

export interface TicketListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  priority?: string
  category?: string
  assigned_user_id?: number
  assigned_department_id?: number
  department_id?: number
  station_id?: number
  created_by_id?: number
  my_tickets?: boolean
  delegated_to_me?: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface CreateTicketData {
  title: string
  description: string
  category: string
  priority?: string
  station_id?: number
  port_number?: number
  reporter_name?: string
  reporter_phone?: string
  reporter_email?: string
  assigned_user_id?: number
  assigned_department_id?: number
  ai_log_analysis?: AILogAnalysis
  // New fields from TZ
  incident_type?: string
  port_type?: string
  contact_source?: string
  station_logs?: string
  client_type?: string
}

export const ticketsApi = {
  list: async (params?: TicketListParams): Promise<PaginatedResponse<Ticket>> => {
    const response = await client.get<PaginatedResponse<Ticket>>('/tickets', { params })
    return response.data
  },

  get: async (id: number): Promise<Ticket & {
    comments: TicketComment[]
    history: TicketHistory[]
  }> => {
    const response = await client.get(`/tickets/${id}`)
    return response.data
  },

  create: async (data: CreateTicketData): Promise<Ticket> => {
    const response = await client.post<Ticket>('/tickets', data)
    return response.data
  },

  update: async (id: number, data: Partial<CreateTicketData>): Promise<Ticket> => {
    const response = await client.put<Ticket>(`/tickets/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/tickets/${id}`)
  },

  updateStatus: async (id: number, status: string, comment?: string): Promise<Ticket> => {
    const response = await client.put<Ticket>(`/tickets/${id}/status`, { status, comment })
    return response.data
  },

  assign: async (id: number, assignedUserId: number | null, comment?: string): Promise<Ticket> => {
    const response = await client.put<Ticket>(`/tickets/${id}/assign`, {
      assigned_user_id: assignedUserId,
      comment,
    })
    return response.data
  },

  delegate: async (id: number, departmentId: number, userId?: number, comment?: string): Promise<Ticket> => {
    const response = await client.put<Ticket>(`/tickets/${id}/delegate`, {
      assigned_department_id: departmentId,
      assigned_user_id: userId,
      comment,
    })
    return response.data
  },

  addComment: async (id: number, content: string, isInternal: boolean = false): Promise<TicketComment> => {
    const response = await client.post<TicketComment>(`/tickets/${id}/comments`, {
      content,
      is_internal: isInternal,
    })
    return response.data
  },

  getComments: async (id: number): Promise<TicketComment[]> => {
    const response = await client.get<TicketComment[]>(`/tickets/${id}/comments`)
    return response.data
  },

  getHistory: async (id: number): Promise<TicketHistory[]> => {
    const response = await client.get<TicketHistory[]>(`/tickets/${id}/history`)
    return response.data
  },

  // Logs
  getLogs: async (id: number): Promise<TicketLog[]> => {
    const response = await client.get<TicketLog[]>(`/tickets/${id}/logs`)
    return response.data
  },

  uploadLog: async (
    ticketId: number,
    file: File,
    description?: string,
    logStartTime?: string,
    logEndTime?: string
  ): Promise<TicketLog> => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    if (logStartTime) formData.append('log_start_time', logStartTime)
    if (logEndTime) formData.append('log_end_time', logEndTime)

    const response = await client.post<TicketLog>(`/tickets/${ticketId}/logs`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  downloadLog: async (ticketId: number, logId: number): Promise<Blob> => {
    const response = await client.get(`/tickets/${ticketId}/logs/${logId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  deleteLog: async (ticketId: number, logId: number): Promise<void> => {
    await client.delete(`/tickets/${ticketId}/logs/${logId}`)
  },

  parseMessage: async (message: string): Promise<ParsedMessageData> => {
    const response = await client.post<ParsedMessageData>('/tickets/parse-message', { message })
    return response.data
  },

  uploadTextLog: async (ticketId: number, content: string, description?: string): Promise<TicketLog> => {
    const response = await client.post<TicketLog>(`/tickets/${ticketId}/logs/text`, {
      content,
      description,
    })
    return response.data
  },

  // Attachments
  getAttachments: async (ticketId: number): Promise<TicketAttachment[]> => {
    const response = await client.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`)
    return response.data
  },

  uploadAttachment: async (ticketId: number, file: File): Promise<TicketAttachment> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await client.post<TicketAttachment>(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  downloadAttachment: async (ticketId: number, attachmentId: number): Promise<Blob> => {
    const response = await client.get(`/tickets/${ticketId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  deleteAttachment: async (ticketId: number, attachmentId: number): Promise<void> => {
    await client.delete(`/tickets/${ticketId}/attachments/${attachmentId}`)
  },

  export: async (params?: any): Promise<Blob> => {
    const response = await client.get('/tickets/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
