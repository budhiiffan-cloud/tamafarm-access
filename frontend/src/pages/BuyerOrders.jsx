import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../lib/useFetch'
import { guestOrders, rememberOrder, statusLabel } from '../lib/orders'
import { rupiah } from '../lib/format'

export default function BuyerOrders() {
  const { user, loading: authLoading } = useAuth()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const { data, loading, error, reload } = useFetch(user?.role === 'pelanggan' ? `/pembeli/pesanan?page=${page}&kategori=${category}` : null)
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const navigate = useNavigate()
  const guests = guestOrders()

  function track(event) {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (token.trim()) rememberOrder(normalized, token.trim())
    navigate(`/pesanan/${encodeURIComponent(normalized)}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {user?.role === 'pelanggan' && <label className="block text-sm font-semibold">Riwayat Pesanan
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="ml-3 rounded-xl border border-slate-200 bg-white p-2">
          <option value="">Semua pesanan</option><option value="aktif">Aktif</option><option value="selesai">Lunas</option><option value="dibatalkan">Ditolak / Dibatalkan</option>
        </select>
      </label>}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Pesanan Saya
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Pantau status penawaran harga, pembayaran, dan pengiriman pesanan Anda.
        </p>
      </div>

      {authLoading || (user?.role === 'pelanggan' && loading) ? (
        <div className="py-12 text-center text-sm text-slate-500">Memuat data pesanan...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      ) : user?.role === 'pelanggan' ? (
        <div className="space-y-4">
          {data?.data?.length ? (
            data.data.map((order) => (
              <Link
                key={order.kode_pesanan}
                to={`/pesanan/${order.kode_pesanan}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-[#dc4c3e] transition-colors">
                    {order.kode_pesanan}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 capitalize">
                    Status: <span className="font-semibold text-slate-800">{statusLabel(order.status_pesanan)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900 text-base">{rupiah(order.total)}</p>
                  <span className="text-xs text-[#dc4c3e] font-semibold mt-0.5 inline-block">Lihat Detail →</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500">
              Belum ada pesanan aktif.{' '}
              <Link to="/#produk" className="text-[#dc4c3e] font-semibold underline">
                Pilih lobster dari katalog
              </Link>
            </div>
          )}

          {data?.last_page > 1 && (
            <div className="flex gap-2 justify-center pt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={page === data.last_page}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Riwayat pesanan tamu tersimpan di browser ini:
          </p>
          {guests.length ? (
            guests.map((order) => (
              <Link
                key={order.code}
                to={`/pesanan/${order.code}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all font-semibold text-slate-900 group"
              >
                <span>{order.code}</span>
                <span className="text-xs text-[#dc4c3e] group-hover:translate-x-1 transition-transform">Buka Pesanan →</span>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500">
              Belum ada pesanan tersimpan di browser ini.
            </div>
          )}
        </div>
      )}

      {/* Track by Code Form */}
      <form onSubmit={track} className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] max-w-lg space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Lacak Pesanan dengan Kode
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Pesanan</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="Contoh: ORD-0021"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none uppercase font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Token Akses Tamu (Opsional)</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Masukkan token jika memesan tanpa akun"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#0c1929] hover:bg-[#182638] px-6 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
        >
          Lihat Pesanan
        </button>
      </form>
    </div>
  )
}
