import { useEffect, useRef, useState } from 'react'

interface PDFViewerProps {
  url: string
  token?: string
}

export default function PDFViewer({ url, token }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pdfDocRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPDF() {
      setIsLoading(true)
      setError(null)
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const loadingTask = pdfjsLib.getDocument({ url, httpHeaders: headers })
        const pdf = await loadingTask.promise

        if (cancelled) return

        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)
        setCurrentPage(1)
      } catch (err) {
        if (!cancelled) {
          setError('Gagal memuat PDF. Pastikan file dapat diakses.')
          console.error('PDF load error:', err)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPDF()
    return () => { cancelled = true }
  }, [url, token])

  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return

    let cancelled = false

    async function renderPage() {
      try {
        const pdf = pdfDocRef.current as { getPage: (n: number) => Promise<unknown> }
        const page = await pdf.getPage(currentPage) as {
          getViewport: (opts: { scale: number }) => { width: number; height: number }
          render: (ctx: unknown) => { promise: Promise<void> }
        }
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        const context = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport }).promise
      } catch (err) {
        console.error('Render error:', err)
      }
    }

    renderPage()
    return () => { cancelled = true }
  }, [currentPage, scale, totalPages])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600">
            {isLoading ? '...' : `${currentPage} / ${totalPages}`}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1.5 rounded hover:bg-gray-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 rounded hover:bg-gray-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="pdf-canvas-container bg-gray-50 flex justify-center p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-lg max-w-full" />
        )}
      </div>
    </div>
  )
}
