import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { orderCodeFromQr } from '../lib/orderQr'

export default function OrderQrScanner({ onOrder }) {
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState('')
  const [manual, setManual] = useState('')
  const video = useRef(null)
  const stream = useRef(null)
  const frame = useRef(null)
  const generation = useRef(0)
  const alive = useRef(false)
  const callback = useRef(onOrder)
  useEffect(() => { callback.current = onOrder }, [onOrder])

  function stop() {
    generation.current++
    if (frame.current != null) cancelAnimationFrame(frame.current)
    frame.current = null
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; stop() }
  }, [])

  function accept(value) {
    const code = orderCodeFromQr(value)
    if (!code) { setMessage('QR atau kode bukan referensi pesanan Tamafarm yang valid.'); return false }
    stop(); setActive(false); setMessage(''); setExpanded(false)
    callback.current(code)
    return true
  }
  function decode(source, width, height) {
    if (!width || !height) return null
    const scale = Math.min(1, 1600 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(image.data, image.width, image.height)?.data ?? null
  }
  async function start() {
    stop(); setActive(false); setMessage('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage('Kamera memerlukan HTTPS atau localhost. Gunakan gambar QR atau masukkan kode pesanan jika kamera tidak tersedia.')
      return
    }
    const request = generation.current
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (!alive.current || request !== generation.current || !video.current) { media.getTracks().forEach(track => track.stop()); return }
      stream.current = media
      video.current.srcObject = media
      await video.current.play()
      if (!alive.current || request !== generation.current) return
      setActive(true)
      let last = 0
      let previous = ''
      function scan(time) {
        if (!alive.current || request !== generation.current) return
        try {
          const preview = video.current
          if (preview && time - last >= 350) {
            last = time
            const result = decode(preview, preview.videoWidth, preview.videoHeight)
            if (result && result !== previous) {
              previous = result
              if (accept(result)) return
            }
          }
          frame.current = requestAnimationFrame(scan)
        } catch {
          stop(); setActive(false); setMessage('Kamera belum dapat membaca QR. Coba gunakan gambar QR.')
        }
      }
      frame.current = requestAnimationFrame(scan)
    } catch {
      if (alive.current && request === generation.current) {
        stop(); setActive(false); setMessage('Kamera tidak tersedia atau izinnya ditolak. Gunakan gambar QR atau kode pesanan.')
      }
    }
  }
  async function readFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    stop(); setActive(false); setMessage('Membaca gambar QR…')
    const request = generation.current
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Pilih gambar PNG, JPG, atau WebP maksimal 10 MB.'); return
    }
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url })
      if (!alive.current || request !== generation.current) return
      if (image.naturalWidth * image.naturalHeight > 30000000) { setMessage('Ukuran gambar terlalu besar. Potong gambar agar QR terlihat jelas.'); return }
      const result = decode(image, image.naturalWidth, image.naturalHeight)
      if (result) accept(result)
      else setMessage('QR belum terbaca. Gunakan gambar yang jelas dan tampilkan seluruh QR.')
    } catch {
      if (alive.current && request === generation.current) setMessage('Gambar tidak dapat dibaca. Pilih gambar QR lain.')
    } finally { URL.revokeObjectURL(url) }
  }
  const button = 'rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50'
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <button type="button" className={button} aria-expanded={expanded} onClick={() => {
        if (expanded) { stop(); setActive(false) }
        setExpanded(!expanded); setMessage('')
      }}>{expanded ? 'Tutup pemindai QR' : 'Pindai QR pesanan'}</button>
      {expanded && <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-600">Pindai QR dari detail pesanan pembeli. Periksa pembayaran dan status pesanan sebelum mengonfirmasi transaksi.</p>
        <video ref={video} muted playsInline className={`max-h-72 w-full rounded-lg bg-slate-900 ${active ? '' : 'hidden'}`} aria-label="Pratinjau kamera pemindai pesanan" />
        <button type="button" className={button} onClick={active ? () => { stop(); setActive(false) } : start}>{active ? 'Hentikan kamera' : 'Gunakan kamera'}</button>
        <label className="block text-sm font-semibold text-slate-700">Baca gambar QR
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={readFile} className="mt-2 block w-full text-sm" />
        </label>
        <div className="flex flex-wrap gap-2">
          <input value={manual} onChange={event => setManual(event.target.value)} maxLength={100} placeholder="TF-…" aria-label="Kode pesanan" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" className={button} onClick={() => accept(manual)}>Buka pesanan</button>
        </div>
        {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      </div>}
    </section>
  )
}
