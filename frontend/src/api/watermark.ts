import axiosInstance from './axios'

export interface WatermarkSettings {
  type: string   // "text" | "image"
  text: string
  color: string
  opacity: number
  size: number
  position: string
  angle: number
  tiled: boolean
  image_path: string
}

export const watermarkApi = {
  getGlobal: () =>
    axiosInstance.get('/api/watermark/global'),

  updateGlobal: (data: WatermarkSettings) =>
    axiosInstance.put('/api/watermark/global', data),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post('/api/watermark/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
