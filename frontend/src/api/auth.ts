import axiosInstance from './axios'

export const authApi = {
  login: (username: string, password: string) =>
    axiosInstance.post('/api/auth/login', { username, password }),

  logout: () =>
    axiosInstance.post('/api/auth/logout'),

  me: () =>
    axiosInstance.get('/api/auth/me'),
}
