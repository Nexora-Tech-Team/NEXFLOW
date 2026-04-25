import axiosInstance from './axios'

export interface TaskFilters {
  status?: string
  priority?: string
  mine?: boolean
  page?: number
  limit?: number
}

export interface CreateTaskPayload {
  title: string
  description?: string
  to_user_id: string
  priority?: string
  deadline?: string
}

export const tasksApi = {
  list: (filters?: TaskFilters) =>
    axiosInstance.get('/api/tasks', { params: filters }),

  create: (data: CreateTaskPayload) =>
    axiosInstance.post('/api/tasks', data),

  get: (id: string) =>
    axiosInstance.get(`/api/tasks/${id}`),

  update: (id: string, data: Partial<CreateTaskPayload>) =>
    axiosInstance.put(`/api/tasks/${id}`, data),

  updateStatus: (id: string, status: string) =>
    axiosInstance.put(`/api/tasks/${id}/status`, { status }),

  updateProgress: (id: string, progress: number) =>
    axiosInstance.put(`/api/tasks/${id}/progress`, { progress }),

  getHistory: (id: string) =>
    axiosInstance.get(`/api/tasks/${id}/history`),

  exportCSV: (filters?: { status?: string; priority?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    return axiosInstance.get(`/api/tasks/export?${params.toString()}`, { responseType: 'blob' })
  },

  addComment: (id: string, text: string) =>
    axiosInstance.post(`/api/tasks/${id}/comments`, { text }),

  listComments: (id: string) =>
    axiosInstance.get(`/api/tasks/${id}/comments`),

  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post(`/api/tasks/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listAttachments: (id: string) =>
    axiosInstance.get(`/api/tasks/${id}/attachments`),

  downloadAttachment: (taskId: string, attachId: string) =>
    axiosInstance.get(`/api/tasks/${taskId}/attachments/${attachId}/download`, { responseType: 'blob' }),

  deleteAttachment: (taskId: string, attachId: string) =>
    axiosInstance.delete(`/api/tasks/${taskId}/attachments/${attachId}`),
}

export const monitoringApi = {
  summary: () => axiosInstance.get('/api/monitoring/summary'),
  activity: () => axiosInstance.get('/api/monitoring/activity'),
  tasks: () => axiosInstance.get('/api/monitoring/tasks'),
}
