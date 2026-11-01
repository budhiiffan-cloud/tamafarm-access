import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { rupiah, qty, getGambarUrl } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: p, loading, error, reload } = useFetch(`/produk/${id}`)
  const [quantity, setQuantity] = useState(1)
  const [imgError, setImgError] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">
        Memuat detail produk...
      </div>
    )
  }

  if (error || !p) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-red-500 text-sm mb-4">{error || 'Produk tidak ditemukan.'}</p>
        <button onClick={reload} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs">
          Coba Lagi
        </button>
      </div>
    )
  }

  const isKg = p.satuan === 'kg'
  const subtotal = Number(p.harga) * quantity

  const handleAddToCart = () => {
    addToCart(p, quantity)
    toast(`${quantity} ${p.satuan} ${p.nama_produk} berhasil dimasukkan ke keranjang!`)
  }

  const handleOrder = () => {
    addToCart(p, quantity)
    navigate('/checkout')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link to="/" className="hover:text-slate-700">Beranda</Link>
        <span>/</span>
        <Link to="/#produk" className="hover:text-slate-700">Produk</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{p.nama_produk}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Image / Photo Placeholder */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="rounded-2xl bg-[#e5eff2] h-72 sm:h-96 flex items-center justify-center text-sm font-semibold tracking-wider text-slate-400 overflow-hidden relative">
            {getGambarUrl(p.gambar_url) && !imgError ? (
              <img
                src={getGambarUrl(p.gambar_url)}
                alt={p.nama_produk}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-4">
                <span className="text-5xl block mb-3">🦞</span>
                <span className="uppercase text-xs tracking-widest text-slate-400">FOTO PRODUK LOBSTER</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Info & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#dc4c3e] uppercase tracking-wider">
              {p.kategori?.nama_kategori || 'Lobster Hidup'}
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {p.nama_produk}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {p.ukuran ? `Ukuran ${p.ukuran}` : 'Ukuran Standar Konsumsi'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100/80">
            <span className="text-xs font-medium text-slate-500 block">Harga Satuan</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#dc4c3e]">
                {rupiah(p.harga)}
              </span>
              <span className="text-sm font-semibold text-slate-600">/{p.satuan}</span>
            </div>
            {p.harga_usd != null && (
              <p className="mt-1 text-xs text-slate-500">
                USD ${p.harga_usd}/{p.satuan} (khusus pemesanan luar negeri)
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ketentuan Pemesanan
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="text-slate-400 block mb-0.5">Stok Tersedia:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {qty(p.stok)} {p.satuan}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="text-slate-400 block mb-0.5">Minimal Order (MOQ):</span>
                <span className="font-bold text-slate-800 text-sm">
                  {isKg ? `${qty(p.moq_restoran || 1)} kg (Resto)` : '1 Paket'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Deskripsi Produk
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {p.deskripsi ||
                'Produk lobster air tawar berkualitas dari tambak budidaya terstandarisasi. Dipanen segar dan diseleksi dengan ketat sebelum pengiriman untuk menjamin ketahanan hidup optimal.'}
            </p>
          </div>

          {/* Kuantitas Selector */}
          <div className="pt-2 flex items-center gap-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-700">Jumlah ({p.satuan}):</span>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-bold active:scale-90 transition-all cursor-pointer"
              >
                -
              </button>
              <span className="px-4 text-sm font-semibold text-slate-800">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-bold active:scale-90 transition-all cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="ml-auto text-right">
              <span className="text-xs text-slate-400 block">Total Estimasi:</span>
              <span className="text-base font-bold text-slate-900">{rupiah(subtotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#dc4c3e] text-[#dc4c3e] hover:bg-red-50 active:scale-95 py-3 text-center text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              + Keranjang
            </button>
            <button
              type="button"
              onClick={handleOrder}
              className="flex-1 rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:bg-[#b83325] active:scale-95 py-3 text-center text-sm font-semibold text-white transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer"
            >
              Pesan Sekarang
            </button>
            <Link
              to="/konsultasi"
              className="rounded-xl border border-slate-800 hover:bg-slate-800 hover:text-white active:scale-95 px-6 py-3 text-center text-sm font-semibold text-slate-800 transition-all duration-200 cursor-pointer"
            >
              Konsultasi
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
