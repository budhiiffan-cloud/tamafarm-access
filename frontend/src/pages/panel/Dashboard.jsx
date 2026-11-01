import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { rupiah } from '../../lib/format'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const ordersPath = user?.role === 'pemilik' ? '/panel/laporan' : '/panel/pesanan'
  const [data, setData] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  useEffect(() => {
    let active = true
    api
      .get('/pengelolaan/dashboard')
      .then((res) => {
        if (active) {
          setData(res.data?.data)
        }
      })
      .catch(() => {
        if (active) {
          setData({
            ringkasan: {
              pesanan_baru: 0,
              menunggu_persetujuan: 0,
              penawaran_aktif: 0,
              penjualan_bulan_ini: 'Rp 0',
            },
            penjualan_7_hari: [
              { hari: 'Sen', label: 'Senin', total: 0, tinggi_persen: 0 },
              { hari: 'Sel', label: 'Selasa', total: 0, tinggi_persen: 0 },
              { hari: 'Rab', label: 'Rabu', total: 0, tinggi_persen: 0 },
              { hari: 'Kam', label: 'Kamis', total: 0, tinggi_persen: 0 },
              { hari: 'Jum', label: 'Jumat', total: 0, tinggi_persen: 0 },
              { hari: 'Sab', label: 'Sabtu', total: 0, tinggi_persen: 0 },
              { hari: 'Min', label: 'Minggu', total: 0, tinggi_persen: 0 },
            ],
            pesanan_terbaru: [],
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  const ringkasan = data?.ringkasan || {
    pesanan_baru: 0,
    menunggu_persetujuan: 0,
    penawaran_aktif: 0,
    penjualan_bulan_ini: 'Rp 0',
  }

  const chartData = data?.penjualan_7_hari || []
  const pesananTerbaru = data?.pesanan_terbaru || []
  const totalChartSales = chartData.reduce((acc, curr) => acc + (curr.total || 0), 0)

  return (
    <div className="space-y-7 pb-8">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Selamat datang kembali, {user?.role === 'pemilik' ? 'Pemilik' : 'Admin'}.
          </p>
        </div>
        <div className="inline-flex items-center justify-center rounded-full bg-white px-7 py-2 text-sm font-semibold text-slate-700 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {user?.role === 'pemilik' ? 'Pemilik' : 'Admin'}
        </div>
      </div>

      {/* 4 KPI Cards in a Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1 */}
        <Link
          to={ordersPath}
          className="group block rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
        >
          <span className="text-xs sm:text-[13px] font-medium text-slate-400 block">
            Pesanan Baru
          </span>
          <span className="mt-3 block text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 group-hover:text-[#dc4c3e] transition-colors">
            {ringkasan.pesanan_baru}
          </span>
        </Link>

        {/* Card 2 */}
        <Link
          to={ordersPath}
          className="group block rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
        >
          <span className="text-xs sm:text-[13px] font-medium text-slate-400 block">
            Menunggu Persetujuan
          </span>
          <span className="mt-3 block text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 group-hover:text-[#f59e0b] transition-colors">
            {ringkasan.menunggu_persetujuan}
          </span>
        </Link>

        {/* Card 3 */}
        <Link
          to={user?.role === 'pemilik' ? '/panel/laporan' : '/panel/penawaran'}
          className="group block rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
        >
          <span className="text-xs sm:text-[13px] font-medium text-slate-400 block">
            Penawaran Aktif
          </span>
          <span className="mt-3 block text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 group-hover:text-[#10b981] transition-colors">
            {ringkasan.penawaran_aktif}
          </span>
        </Link>

        {/* Card 4 */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <span className="text-xs sm:text-[13px] font-medium text-slate-400 block">
            Penjualan Bulan Ini
          </span>
          <span className="mt-3 block text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900">
            {ringkasan.penjualan_bulan_ini}
          </span>
        </div>
      </div>

      {/* Two Column Layout: Chart & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Penjualan 7 Hari Terakhir */}
        <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)] lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Penjualan 7 Hari Terakhir
              </h2>
              {totalChartSales === 0 && (
                <p className="text-xs text-slate-400 mt-0.5">Belum ada transaksi dalam 7 hari terakhir</p>
              )}
            </div>
            {hoveredBar !== null && chartData[hoveredBar] && (
              <span className="text-xs font-semibold text-[#dc4c3e]">
                {chartData[hoveredBar].label}: {rupiah(chartData[hoveredBar].total)}
              </span>
            )}
          </div>

          {/* Bar Chart */}
          <div className="mt-6 flex h-72 sm:h-80 items-end justify-between px-2 sm:px-6">
            {chartData.map((bar, idx) => (
              <div
                key={bar.hari + idx}
                className="flex flex-1 flex-col items-center justify-end h-full px-1.5 sm:px-3"
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Bar capsule container */}
                <div className="relative flex w-full max-w-[48px] h-full items-end justify-center">
                  {/* Floating tooltip */}
                  {hoveredBar === idx && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl z-20 whitespace-nowrap">
                      {rupiah(bar.total)}
                    </div>
                  )}

                  {/* Rounded capsule bar matching the mockup */}
                  {bar.tinggi_persen > 0 ? (
                    <div
                      style={{ height: `${bar.tinggi_persen}%` }}
                      className={`w-full rounded-xl sm:rounded-2xl bg-[#dc4c3e] transition-all duration-300 ${
                        hoveredBar === idx ? 'brightness-110 shadow-md scale-y-[1.02]' : ''
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-full h-2 rounded-full transition-all duration-300 ${
                        hoveredBar === idx ? 'bg-slate-300' : 'bg-slate-100'
                      }`}
                    />
                  )}
                </div>

                {/* Day label */}
                <span className="mt-4 text-xs font-medium text-slate-400">
                  {bar.hari}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pesanan Terbaru */}
        <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)] lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pesanan Terbaru
              </h2>
              <Link
                to={ordersPath}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
              >
                Lihat semua
              </Link>
            </div>

            {/* List with generous spacing */}
            <div className="space-y-6">
              {pesananTerbaru.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-400">Belum ada pesanan terbaru</p>
                  <p className="text-xs text-slate-400 mt-1">Transaksi yang masuk akan otomatis tampil di sini</p>
                </div>
              ) : (
                pesananTerbaru.map((order) => {
                  let colorClass = order.status_color || 'text-[#f59e0b]'

                  return (
                    <div
                      key={order.kode_pesanan}
                      onClick={() => navigate(ordersPath)}
                      className="flex items-center justify-between py-1 cursor-pointer group transition-all"
                    >
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-[#dc4c3e] transition-colors font-mono">
                        {order.kode_pesanan}
                      </span>
                      <span className={`text-sm font-medium ${colorClass}`}>
                        {order.status_text}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <Link
              to={ordersPath}
              className="block text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              {user?.role === 'pemilik' ? 'Lihat laporan transaksi' : 'Kelola semua pesanan pelanggan'} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
