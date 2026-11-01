const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

export const rupiah = (n) => idr.format(Number(n) || 0)
export const dollar = (n) => usd.format(Number(n) || 0)
export const qty = (n) => num.format(Number(n) || 0)

export const WHATSAPP = (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, '')
export const waLink = (text) =>
  WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : null

export const getGambarUrl = (url) => {
  if (!url || typeof url !== 'string') return null
  return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, '')
}
