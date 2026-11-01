import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { guestOrders, orderHeaders, statusLabel } from '../lib/orders'
import { rupiah, qty } from '../lib/format'
import { useAuth } from '../context/AuthContext'

export default function BuyerOrderDetail() {
  const { code } = useParams()
  const { user, loading: authLoading } = useAuth()
  const token = guestOrders().find((item) => item.code === code)?.token
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/pesanan/${code}`, orderHeaders(token))
      setOrder(response.data)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [code, token])

  useEffect(() => {
    if (!authLoading) {
      setOrder(null)
      load()
    }
  }, [load, authLoading, user])

  async function decision(keputusan) {
    setBusy(true)
    setError('')
    try {
      await api.post(
        `/pesanan/${code}/penawaran`,
        { keputusan, versi_penawaran: order.versi_penawaran },
        orderHeaders(token)
      )
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function pay(jenis) {
    setBusy(true)
    setError('')
    try {
      const response = await api.post(`/pesanan/${code}/pembayaran`, { jenis }, orderHeaders(token))
      const url = new URL(response.data.redirect_url)
      window.location.assign(url.href)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function confirmReceived() {
    setBusy(true)
    setError('')
    try {
      await api.post(`/pesanan/${code}/diterima`, {}, orderHeaders(token))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">
        {error ? <p className="text-red-500">{error}</p> : 'Memuat data pesanan...'}
      </div>
    )
  }

  const dpPaid = order.pembayaran?.some((p) => p.jenis === 'dp' && p.status_bayar === 'dibayar')
  const isWaitingOffer = order.status_penawaran === 'menunggu'
  const isOfferAccepted = order.status_penawaran === 'diterima'
  const remainingPayment = Math.max(0, Number(order.total) - Number(order.total_dibayar || 0))
  const shipmentReceived = order.pengiriman?.status_pengiriman === 'diterima'
  const isShipped = order.pengiriman?.status_pengiriman === 'dikirim' || shipmentReceived
  const isCompleted = shipmentReceived && remainingPayment === 0
  const canPayBalance = isOfferAccepted && dpPaid && remainingPayment > 0
    && !order.simulasi_pembayaran && !['ditolak', 'dibatalkan'].includes(order.status_pesanan)

  // Stepper steps calculation
  const steps = [
    { label: 'Pesanan Masuk', done: true },
    { label: 'Penawaran Admin', done: isOfferAccepted || isWaitingOffer },
    { label: 'Pembayaran DP', done: dpPaid },
    { label: 'Pengiriman', done: isShipped || isCompleted },
    { label: 'Selesai', done: isCompleted },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <Link to="/pesanan" className="hover:text-slate-700">Pesanan Saya</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{code}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pesanan #{code}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Dibuat pada: {order.tanggal}
          </p>
        </div>

        <button
          onClick={load}
          disabled={busy}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          Perbarui Status
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Visual Stepper */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          {steps.map((st, i) => (
            <div key={st.label} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
                  st.done
                    ? 'bg-[#0c1929] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {st.done ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${st.done ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Offer Decision Card (Product Backlog #6, #7) */}
      {isWaitingOffer && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Penawaran Masuk dari Admin
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Admin Telah Mengirimkan Rincian Penawaran
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 mt-1">
                Silakan periksa rincian harga satuan dan biaya pengiriman di bawah ini. Anda dapat menyetujui untuk lanjut ke pembayaran.
              </p>
            </div>
            <span className="rounded-full bg-amber-200 text-amber-900 px-3 py-1 text-xs font-bold">
              Menunggu Keputusan
            </span>
          </div>

          {order.catatan_penawaran && (
            <div className="rounded-xl bg-white/80 p-3.5 text-xs text-slate-800 border border-amber-200">
              <strong>Catatan Admin:</strong> {order.catatan_penawaran}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => decision('diterima')}
              disabled={busy}
              className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              Setujui Penawaran
            </button>
            <button
              onClick={() => decision('ditolak')}
              disabled={busy}
              className="rounded-xl border border-slate-300 hover:bg-slate-100 px-6 py-2.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Tolak Penawaran
            </button>
          </div>
        </div>
      )}

      {/* Payment Midtrans Card (Product Backlog #8, #22) */}
      {order.simulasi_pembayaran && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Pembayaran simulasi untuk uji coba. Tidak perlu transfer uang. Unggah contoh bukti melalui aplikasi Tamafarm dan tunggu verifikasi admin.</div>}
      {isOfferAccepted && !dpPaid && !order.simulasi_pembayaran && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Pembayaran Down Payment (DP 50%)
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Penawaran Disetujui. Lanjutkan Pembayaran DP
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Nominal DP: <strong className="text-slate-900">{rupiah(Math.round(order.total * 0.5))}</strong> (50% dari total pesanan)
            </p>
          </div>
          <button
            onClick={() => pay('dp')}
            disabled={busy}
            className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-6 py-3 text-xs font-semibold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Bayar via Midtrans
          </button>
        </div>
      )}

      {canPayBalance && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pelunasan Pesanan</h2>
            <p className="text-xs text-slate-600 mt-1">
              DP sudah dibayar. Sisa tagihan: <strong>{rupiah(remainingPayment)}</strong>.
            </p>
          </div>
          <button
            onClick={() => pay('pelunasan')}
            disabled={busy}
            className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-6 py-3 text-xs font-semibold text-white shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Memproses...' : 'Bayar Pelunasan via Midtrans'}
          </button>
        </div>
      )}

      {/* Shipment Tracking Card (Product Backlog #23, #28) */}
      {order.pengiriman && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            Informasi Pengiriman
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Ekspedisi / Kurir:</span>
              <span className="font-bold text-slate-800 text-sm">{order.pengiriman.kurir}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Nomor Resi:</span>
              <span className="font-bold text-slate-800 text-sm font-mono">{order.pengiriman.no_resi}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Status Pengiriman:</span>
              <span className="font-bold text-teal-600 text-sm capitalize">{order.pengiriman.status_pengiriman}</span>
            </div>
          </div>

          {order.pengiriman.status_pengiriman === 'dikirim' && (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={confirmReceived}
                disabled={busy}
                className="rounded-xl bg-[#0c1929] hover:bg-[#182638] px-5 py-2.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Konfirmasi Pesanan Diterima
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-6 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <p>Tanggal dikirim: <strong>{order.pengiriman.tanggal_kirim || '-'}</strong></p>
            <p>Tanggal diterima: <strong>{order.pengiriman.tanggal_terima || 'Belum diterima'}</strong></p>
          </div>
        </div>
      )}

      {/* Order Item Details Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
          Rincian Produk & Biaya
        </h2>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id_detail} className="py-3 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <p className="font-bold text-slate-900">{item.nama_produk}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {qty(item.jumlah)} {item.satuan} × {rupiah(item.harga_satuan)}
                </p>
              </div>
              <span className="font-bold text-slate-900">{rupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Biaya Pengiriman</span>
            <span className="font-semibold text-slate-800">{rupiah(order.biaya_pengiriman)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total yang Sudah Dibayar</span>
            <span className="font-semibold text-emerald-600">{rupiah(order.total_dibayar)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Sisa Tagihan</span>
            <span className="font-semibold text-slate-800">{rupiah(remainingPayment)}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-extrabold text-slate-900">
            <span>Total Tagihan</span>
            <span className="text-[#dc4c3e]">{rupiah(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
