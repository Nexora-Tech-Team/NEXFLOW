import axiosInstance from './axios'

export interface ActivityLogFilters {
  user_id?: string
  type?: string
  date_from?: string
  date_to?: string
  document_id?: string
  page?: number
  limit?: number
}

export const activityLogApi = {
  list: (filters?: ActivityLogFilters) =>
    axiosInstance.get('/api/activity-log', { params: filters }),

  exportCSV: (filters?: Pick<ActivityLogFilters, 'type' | 'date_from' | 'date_to'>) =>
    axiosInstance.get('/api/activity-log/export', { params: filters, responseType: 'blob' }),
}
