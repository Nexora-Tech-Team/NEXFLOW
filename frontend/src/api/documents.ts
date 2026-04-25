import axiosInstance from './axios'

export interface DocumentFilters {
  category?: string
  sub_category?: string
  keyword?: string
  status?: string
  page?: number
  limit?: number
}

export interface CommentPayload {
  rating: number
  text?: string
}

export const documentsApi = {
  list: (filters?: DocumentFilters) =>
    axiosInstance.get('/api/documents', { params: filters }),

  upload: (formData: FormData) =>
    axiosInstance.post('/api/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  get: (id: string) =>
    axiosInstance.get(`/api/documents/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(`/api/documents/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/api/documents/${id}`),

  downloadUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/documents/${id}/download`,

  previewUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/documents/${id}/preview`,

  addComment: (id: string, data: CommentPayload) =>
    axiosInstance.post(`/api/documents/${id}/comments`, data),

  listComments: (id: string) =>
    axiosInstance.get(`/api/documents/${id}/comments`),

  getCategories: () =>
    axiosInstance.get('/api/documents/categories'),
}
