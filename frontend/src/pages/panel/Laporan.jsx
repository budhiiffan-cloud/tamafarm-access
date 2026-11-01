import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { rupiah } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from './PanelLayout'
import { Spinner } from '../../components/ui'

export default function Laporan() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/pengelolaan/laporan')
      .then((res) => {
        setOrders(res.data || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = orders.filter((o) =>
    o.kode_pesanan.toLowerCase().includes(q.trim().toLowerCase())
    && (!from || o.tanggal.slice(0, 10) >= from)
    && (!to || o.tanggal.slice(0, 10) <= to)
    && (!status || o.status_pesanan === status)
  )
  const totalOmzet = filteredOrders.filter((o) => !['ditolak', 'dibatalkan'].includes(o.status_pesanan))
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  const exportCSV = () => {
    const headers = ['Kode Pesanan', 'Tanggal', 'Total (Rp)', 'Status Pesanan', 'Status Penawaran']
    const rows = filteredOrders.map((o) => [
      o.kode_pesanan,
      o.tanggal,
      o.total,
      o.status_pesanan,
      o.status_penawaran || '-',
    ])
    const csvContent = [headers, ...rows].map((row) => row.map((value) => {
      const text = String(value ?? '')
      const safe = /^[=+@\-\t\r\n]/.test(text) ? `'${text}` : text
      return `"${safe.replaceAll('"', '""')}"`
    }).join(',')).join('\r\n')
    const encodedUri = URL.createObjectURL(new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan-transaksi-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(encodedUri), 1000)
  }

  const now = new Date()
  const cetakTanggal =
    now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'

  const cetakTanggalOnly = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-4 print:hidden">
        <label className="text-sm">Dari tanggal<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="block rounded-lg border p-2" /></label>
        <label className="text-sm">Sampai tanggal<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="block rounded-lg border p-2" /></label>
        <label className="text-sm">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="block rounded-lg border p-2"><option value="">Semua status</option>{[...new Set(orders.map((o) => o.status_pesanan))].sort().map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></label>
        <button onClick={() => { setFrom(''); setTo(''); setStatus(''); setQ('') }} className="text-sm underline">Reset filter</button>
      </div>
      <p className="text-sm text-slate-500">Periode: {from || 'Awal'} — {to || 'Terbaru'} · {status.replaceAll('_', ' ') || 'Semua status'}</p>
      {/* Header Web Screen (Disembunyikan saat dicetak) */}
      <div className="print:hidden">
        <PageHeader
          title="Laporan Penjualan"
          subtitle="Laporan data dan rekapitulasi transaksi penjualan lobster air tawar."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                <span>Cetak Laporan</span>
              </button>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c1929] hover:bg-[#182638] active:scale-95 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Unduh CSV</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Dokumen Kop & Header Cetak Resmi (Hanya tampil saat window.print / dicetak) */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            TAMA FARM AQUACULTURE
          </h1>
          <p className="text-xs text-slate-800 mt-0.5 font-medium">
            Pusat Budidaya & Distribusi Lobster Air Tawar Berkualitas
          </p>
          <p className="text-[11px] text-slate-600">
            Jl. Tik Nibung 2 No.16, Perak Utara, Kec. Pabean Cantian, Kota Surabaya, Jawa Timur 60165 | WA: 0857-5597-1102
          </p>
        </div>

        <div className="text-center mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-black underline">
            LAPORAN TRANSAKSI PENJUALAN
          </h2>
          <div className="mt-2 flex justify-between items-center text-[11px] text-slate-700 px-1">
            <span>Tanggal Cetak: {cetakTanggal}</span>
            <span>
              Dicetak Oleh: {user?.nama || 'Petugas'} ({user?.role === 'pemilik' ? 'Pemilik' : 'Admin'})
            </span>
          </div>
        </div>

        {/* Ringkasan Rekap Cetak */}
        <div className="mb-4">
          <table className="w-full text-xs border border-slate-400 border-collapse">
            <tbody>
              <tr className="bg-slate-100">
                <td className="border border-slate-400 p-2 font-semibold">
                  Total Transaksi: <span className="font-bold">{filteredOrders.length} Pesanan</span>
                </td>
                <td className="border border-slate-400 p-2 font-semibold">
                  Total Omzet: <span className="font-bold">{rupiah(totalOmzet)}</span>
                </td>
                <td className="border border-slate-400 p-2 font-semibold">
                  Pesanan Selesai: <span className="font-bold">{filteredOrders.filter((o) => ['dikirim', 'diterima', 'lunas'].includes(o.status_pesanan)).length}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary KPIs Web (Disembunyikan saat dicetak) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 print:hidden">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Transaksi</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{filteredOrders.length} Pesanan</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Omzet Penjualan</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#dc4c3e]">{rupiah(totalOmzet)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pesanan Selesai / Dikirim</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {filteredOrders.filter((o) => ['dikirim', 'diterima', 'lunas'].includes(o.status_pesanan)).length}
          </p>
        </div>
      </div>

      {/* Search Filter Web (Disembunyikan saat dicetak) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode transaksi..."
            aria-label="Cari transaksi"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs"
          />
          <svg className="absolute left-3 top-2.5 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Menampilkan {filteredOrders.length} data transaksi
        </p>
      </div>

      {/* Table Transaksi */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)] print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm print:text-xs print:border print:border-slate-800 print:divide-y-0 print:border-collapse">
              <thead className="bg-slate-50/80 font-bold text-slate-700 text-xs uppercase tracking-wider print:bg-slate-100 print:text-black">
                <tr className="print:border-b print:border-slate-800">
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">No</th>
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">Kode Pesanan</th>
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">Tanggal</th>
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">Status Pesanan</th>
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">Status Penawaran</th>
                  <th className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-800">Total Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white print:divide-y-0">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 print:border print:border-slate-800 print:text-slate-700 print:py-6">
                      Tidak ada data transaksi yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o, idx) => (
                    <tr key={o.kode_pesanan} className="hover:bg-slate-50/70 transition-colors print:border-b print:border-slate-300">
                      <td className="px-6 py-4 text-center text-xs text-slate-500 print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900 font-mono print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        {o.kode_pesanan}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-slate-500 print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        {o.tanggal || '-'}
                      </td>
                      <td className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 capitalize print:border-none print:p-0 print:bg-transparent print:text-black">
                          {o.status_pesanan?.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        {o.status_penawaran ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 capitalize print:border-none print:p-0 print:bg-transparent print:text-black">
                            {o.status_penawaran}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 print:text-black">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900 print:px-2 print:py-2 print:border print:border-slate-300 print:text-black">
                        {rupiah(o.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lembar Pengesahan Tanda Tangan Cetak (Hanya tampil saat dicetak) */}
      <div className="hidden print:flex justify-end mt-12 pr-6">
        <div className="text-center text-xs text-black">
          <p>Surabaya, {cetakTanggalOnly}</p>
          <p className="mt-1 font-semibold">Penanggung Jawab / Admin,</p>
          <div className="h-16"></div>
          <p className="font-bold underline tracking-wide">
            ( Ahmad Rama Aditiya Iswanto )
          </p>
        </div>
      </div>
    </div>
  )
}
