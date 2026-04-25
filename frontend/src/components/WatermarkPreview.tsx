import { useEffect, useRef } from 'react'

interface WatermarkPreviewProps {
  type?: string
  text: string
  color: string
  opacity: number
  size: number
  angle: number
  position?: string
  tiled?: boolean
  imageUrl?: string | null
}

export default function WatermarkPreview({ type = 'text', text, color, opacity, size, angle, position, tiled, imageUrl }: WatermarkPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#f3f4f6'
    for (let y = 30; y < H - 20; y += 20) {
      const lineWidth = 80 + Math.random() * 100
      ctx.fillRect(20, y, lineWidth, 6)
    }

    const alpha = Math.min(1, Math.max(0, opacity / 100))

    if (type === 'image' && imageUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.save()
        ctx.globalAlpha = alpha
        if (tiled) {
          const positions = getPositions(W, H, 80 * (W / 595))
          for (const [px, py] of positions) {
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate((angle * Math.PI) / 180)
            const maxW = W / 4
            const scale = Math.min(maxW / img.width, maxW / img.height)
            ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale)
            ctx.restore()
          }
        } else {
          ctx.save()
          ctx.translate(W / 2, H / 2)
          ctx.rotate((angle * Math.PI) / 180)
          const maxW = W * 0.6
          const scale = Math.min(maxW / img.width, maxW / img.height)
          ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale)
          ctx.restore()
        }
        ctx.restore()
        drawBorder(ctx, W, H)
      }
      img.src = imageUrl
    } else {
      ctx.save()
      ctx.globalAlpha = alpha
      const fontSize = Math.max(10, size * (W / 400))
      ctx.font = `bold ${fontSize}px Inter, Segoe UI, sans-serif`
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (tiled) {
        const positions = getPositions(W, H, fontSize)
        for (const [px, py] of positions) {
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate((angle * Math.PI) / 180)
          ctx.fillText(text, 0, 0)
          ctx.restore()
        }
      } else if (position === 'diagonal' || !position) {
        ctx.translate(W / 2, H / 2)
        ctx.rotate((angle * Math.PI) / 180)
        ctx.fillText(text, 0, 0)
      } else if (position === 'center') {
        ctx.translate(W / 2, H / 2)
        ctx.rotate((angle * Math.PI) / 180)
        ctx.fillText(text, 0, 0)
      } else if (position === 'top') {
        ctx.translate(W / 2, 30)
        ctx.fillText(text, 0, 0)
      } else if (position === 'bottom') {
        ctx.translate(W / 2, H - 30)
        ctx.fillText(text, 0, 0)
      }
      ctx.restore()
      drawBorder(ctx, W, H)
    }

    if (type !== 'image' || !imageUrl) {
      drawBorder(ctx, W, H)
    }
  }, [type, text, color, opacity, size, angle, position, tiled, imageUrl])

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-500 font-medium">Preview Watermark</p>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="rounded-lg border border-gray-200 shadow-sm"
      />
    </div>
  )
}

function getPositions(W: number, H: number, size: number): [number, number][] {
  const stepX = Math.max(size * 4.5, W / 5)
  const stepY = Math.max(size * 3.0, H / 7)
  const positions: [number, number][] = []
  for (let y = stepY / 2; y < H; y += stepY) {
    for (let x = stepX / 2; x < W; x += stepX) {
      positions.push([x, y])
    }
  }
  return positions
}

function drawBorder(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, W, H)
}
