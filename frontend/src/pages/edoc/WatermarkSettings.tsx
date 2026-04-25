import { useState, useEffect, useContext, useRef } from 'react'
import { watermarkApi, WatermarkSettings as WMSettings } from '../../api/watermark'
import { NotifContext } from '../../context/NotifContext'
import WatermarkPreview from '../../components/WatermarkPreview'

export default function WatermarkSettings() {
  const [settings, setSettings] = useState<WMSettings>({
    type: 'text', text: 'FOR INTERNAL USE', color: '#cccccc', opacity: 15, size: 36,
    position: 'diagonal', angle: 35, tiled: false, image_path: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showNotif } = useContext(NotifContext)

  useEffect(() => {
    watermarkApi.getGlobal()
      .then(res => {
        const data = res.data.data
        setSettings({
          type: data.type || 'text',
          text: data.text || 'FOR INTERNAL USE',
          color: data.color || '#cccccc',
          opacity: data.opacity ?? 15,
          size: data.size ?? 36,
          position: data.position || 'diagonal',
          angle: data.angle ?? 35,
          tiled: data.tiled ?? false,
          image_path: data.image_path || '',
        })
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.png')) {
      showNotif('error', 'Hanya file PNG yang diperbolehkan')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setImagePreviewUrl(localUrl)

    setIsUploading(true)
    try {
      const res = await watermarkApi.uploadImage(file)
      setSettings(s => ({ ...s, image_path: res.data.image_path }))
      showNotif('success', 'Gambar berhasil diupload')
    } catch {
      showNotif('error', 'Gagal mengupload gambar')
      setImagePreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await watermarkApi.updateGlobal(settings)
      showNotif('success', 'Pengaturan watermark berhasil disimpan')
    } catch { showNotif('error', 'Gagal menyimpan watermark') }
    finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Watermark Global</h2>
          <p className="text-gray-500 text-sm mt-1">Watermark ini akan diterapkan otomatis pada semua dokumen yang didownload</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings panel */}
          <div className="card p-6 space-y-5">

            {/* Type toggle */}
            <div>
              <label className="label">Jenis Watermark</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setSettings(s => ({ ...s, type: 'text' }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${settings.type === 'text' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Teks
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, type: 'image' }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${settings.type === 'image' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Gambar (PNG)
                </button>
              </div>
            </div>

            {/* Tiled toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">Mode Full Kertas</p>
                <p className="text-xs text-gray-500">Watermark diulang memenuhi seluruh halaman</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, tiled: !s.tiled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.tiled ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.tiled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {settings.type === 'text' && (
              <>
                <div>
                  <label className="label">Teks Watermark</label>
                  <input className="input-field" value={settings.text}
                    onChange={e => setSettings(s => ({...s, text: e.target.value}))}
                    placeholder="FOR INTERNAL USE" maxLength={50} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Warna</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                        value={settings.color} onChange={e => setSettings(s => ({...s, color: e.target.value}))} />
                      <input className="input-field" value={settings.color}
                        onChange={e => setSettings(s => ({...s, color: e.target.value}))} placeholder="#cccccc" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Posisi</label>
                    <select className="input-field" value={settings.position}
                      onChange={e => setSettings(s => ({...s, position: e.target.value}))}
                      disabled={settings.tiled}
                    >
                      <option value="diagonal">Diagonal</option>
                      <option value="center">Tengah</option>
                      <option value="top">Atas</option>
                      <option value="bottom">Bawah</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Ukuran Font: {settings.size}px</label>
                  <input type="range" min={12} max={72} step={4} className="w-full accent-primary"
                    value={settings.size} onChange={e => setSettings(s => ({...s, size: Number(e.target.value)}))} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>12px</span><span>72px</span></div>
                </div>
              </>
            )}

            {settings.type === 'image' && (
              <div>
                <label className="label">Upload Gambar Watermark (PNG)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {imagePreviewUrl || settings.image_path ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={imagePreviewUrl || undefined}
                        alt="Watermark preview"
                        className="max-h-24 object-contain rounded"
                      />
                      <p className="text-xs text-gray-500">Klik untuk ganti gambar</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {isUploading ? (
                        <p className="text-sm text-gray-500">Mengupload...</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 font-medium">Klik untuk upload PNG</p>
                          <p className="text-xs text-gray-400">Format: PNG, transparan direkomendasikan</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {settings.image_path && (
                  <p className="text-xs text-green-600 mt-1">Gambar tersimpan di server</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Opacity: {settings.opacity}%</label>
              <input type="range" min={5} max={80} step={5} className="w-full accent-primary"
                value={settings.opacity} onChange={e => setSettings(s => ({...s, opacity: Number(e.target.value)}))} />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5%</span><span>80%</span></div>
            </div>

            <div>
              <label className="label">Sudut Rotasi: {settings.angle}°</label>
              <input type="range" min={0} max={90} step={5} className="w-full accent-primary"
                value={settings.angle} onChange={e => setSettings(s => ({...s, angle: Number(e.target.value)}))} />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0°</span><span>90°</span></div>
            </div>

            <button onClick={handleSave} disabled={isSaving || isUploading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Menyimpan...</> : 'Simpan Pengaturan'}
            </button>
          </div>

          {/* Preview panel */}
          <div className="card p-6">
            <WatermarkPreview
              type={settings.type}
              text={settings.text}
              color={settings.color}
              opacity={settings.opacity}
              size={settings.size}
              angle={settings.angle}
              position={settings.position}
              tiled={settings.tiled}
              imageUrl={imagePreviewUrl}
            />

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Informasi</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Watermark diterapkan saat dokumen didownload</li>
                <li>• Hanya berlaku untuk file PDF</li>
                <li>• Mode full kertas mengulang watermark di 9 posisi</li>
                <li>• PNG transparan menghasilkan tampilan terbaik</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Pengaturan Saat Ini</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div><span className="font-medium">Jenis:</span> {settings.type === 'image' ? 'Gambar PNG' : 'Teks'}</div>
                <div><span className="font-medium">Mode:</span> {settings.tiled ? 'Full Kertas' : 'Tunggal'}</div>
                {settings.type === 'text' && (
                  <>
                    <div><span className="font-medium">Teks:</span> {settings.text}</div>
                    <div><span className="font-medium">Warna:</span> {settings.color}</div>
                    <div><span className="font-medium">Ukuran:</span> {settings.size}px</div>
                    <div><span className="font-medium">Posisi:</span> {settings.tiled ? 'Full' : settings.position}</div>
                  </>
                )}
                <div><span className="font-medium">Opacity:</span> {settings.opacity}%</div>
                <div><span className="font-medium">Sudut:</span> {settings.angle}°</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
