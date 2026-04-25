import axiosInstance from './axios'

export interface CreateUserPayload {
  username: string
  password: string
  fullname: string
  email: string
  is_active?: boolean
}

export interface UpdateUserPayload {
  fullname?: string
  email?: string
  password?: string
  is_active?: boolean
}

export interface PermissionUpdate {
  module_id: number
  access_level: string
}

export const usersApi = {
  list: (search?: string) =>
    axiosInstance.get('/api/users', { params: { search } }),

  create: (data: CreateUserPayload) =>
    axiosInstance.post('/api/users', data),

  update: (id: string, data: UpdateUserPayload) =>
    axiosInstance.put(`/api/users/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/api/users/${id}`),

  getPermissions: (id: string) =>
    axiosInstance.get(`/api/users/${id}/permissions`),

  updatePermissions: (id: string, permissions: PermissionUpdate[]) =>
    axiosInstance.put(`/api/users/${id}/permissions`, { permissions }),
}
