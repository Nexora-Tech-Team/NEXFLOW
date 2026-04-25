import axiosInstance from './axios'

export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  ref_id: string | null
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  list: () => axiosInstance.get<{ data: AppNotification[]; unread: number }>('/api/notifications'),
  markRead: (id: string) => axiosInstance.put(`/api/notifications/${id}/read`),
  markAllRead: () => axiosInstance.put('/api/notifications/read-all'),
}
