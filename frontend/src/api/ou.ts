import axiosInstance from './axios'

export interface OUUnitPayload {
  name: string
  parent_id?: string | null
  assigned_user_id?: string | null
  order?: number
}

export const ouApi = {
  getTree: () =>
    axiosInstance.get('/api/ou'),

  create: (data: OUUnitPayload) =>
    axiosInstance.post('/api/ou', data),

  update: (id: string, data: Partial<OUUnitPayload>) =>
    axiosInstance.put(`/api/ou/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/api/ou/${id}`),
}
