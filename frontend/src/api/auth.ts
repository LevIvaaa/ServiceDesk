import client from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  is_active: boolean
  is_admin: boolean
  department_id: number | null
  department: { id: number; name: string } | null
  roles: { id: number; name: string }[]
  permissions: string[]
  created_at: string
  updated_at: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<Token> => {
    const response = await client.post<Token>('/auth/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await client.post('/auth/logout')
  },

  me: async (): Promise<User> => {
    const response = await client.get<User>('/auth/me')
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await client.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}
