import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { rupiah } from '../../lib/format'
import { statusLabel } from '../../lib/orders'
import { Button, Modal, TextField, TextArea, ErrorNote, Empty, Spinner } from '../../components/ui'
import { PageHeader } from './PanelLayout'
import DeliveryLocationLink from '../../components/DeliveryLocationLink'

export default function Penawaran() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [offer, setOffer] = useState({ biaya_pengiriman: 0, catatan_penawaran: '', items: [] })
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [q, setQ] = useState('')

  const fetchOrders = () => {
    setLoading(true)
    api
      .get('/pengelolaan/pesanan')
      .then((res) => {
        const allOrders = res.data?.data || []
        // Filter orders that need an offer or have an offer
        const offerOrders = allOrders.filter(
          (o) =>
            o.status_penawaran === 'menunggu' ||
            o.status_pesanan === 'menunggu_persetujuan' ||
            o.status_pesanan === 'disetujui'
        )
        setOrders(offerOrders.length > 0 ? offerOrders : allOrders)
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    if (!selectedCode) return
    setSelectedOrder(null)
    api
      .get(`/pengelolaan/pesanan/${selectedCode}`)
      .then((res) => {
        const d = res.data
        setSelectedOrder(d)
        setOffer({
          biaya_pengiriman: d.biaya_pengiriman || 0,
          catatan_penawaran: d.catatan_penawaran || '',
          items: d.items.map((i) => ({ id_detail: i.id_detail, harga_satuan: i.harga_satuan })),
        })
      })
      .catch((err) => setErrorMsg(err.message))
  }, [selectedCode])

  const submitOffer = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrorMsg('')
    try {
      await api.post(`/pengelolaan/pesanan/${selectedCode}/penawaran`, offer)
      setSelectedCode(null)
      fetchOrders()
    } catch (err) {
      setErrorMsg(Object.values(err.errors || {}).flat().join(' ') || err.message)
    } finally {
      setBusy(false)
    }
  }

  const list = orders.filter((item) =>
    item.kode_pesanan.toLowerCase().includes(q.trim().toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penawaran Transaksi"
        subtitle="Kelola dan kirim rincian penawaran harga & ongkos kirim ke pembeli."
        action={
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Perbarui Data</span>
          </button>
        }
      />

      {errorMsg && <ErrorNote message={errorMsg} />}

      {/* Search & Counter Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode pesanan..."
            aria-label="Cari kode pesanan"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs"
          />
          <svg className="absolute left-3 top-2.5 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Halaman 1 dari 1 ({list.length} total pesanan)
        </p>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80 font-bold text-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-center">Kode Pesanan</th>
                <th className="px-6 py-4 text-center">Tanggal</th>
                <th className="px-6 py-4 text-center">Status Pesanan</th>
                <th className="px-6 py-4 text-center">Penawaran</th>
                <th className="px-6 py-4 text-center">Total Tagihan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Memuat pesanan...
                  </td>
                </tr>
              ) : list.length ? (
                list.map((item) => (
                  <tr key={item.kode_pesanan} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-900 font-mono">
                      {item.kode_pesanan}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {item.tanggal || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 capitalize">
                        {statusLabel(item.status_pesanan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status_penawaran ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                          {item.status_penawaran}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {rupiah(item.total)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setSelectedCode(item.kode_pesanan)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0c1929] hover:bg-[#182638] text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          <span>Kelola Penawaran</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Belum ada pesanan yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penawaran */}
      <Modal
        open={!!selectedCode}
        onClose={() => !busy && setSelectedCode(null)}
        title={`Rincian Penawaran: ${selectedCode}`}
        wide
      >
        {!selectedOrder ? (
          <p className="text-sm text-slate-500 py-6 text-center">Memuat detail pesanan...</p>
        ) : (
          <form onSubmit={submitOffer} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Data Pemesan
              </span>
              <p className="font-bold text-slate-900">
                {selectedOrder.data_pengiriman?.nama} ({selectedOrder.data_pengiriman?.no_hp})
              </p>
<p className="text-slate-600 text-xs sm:text-sm mt-0.5">{selectedOrder.data_pengiriman?.alamat}</p>
              <DeliveryLocationLink shipping={selectedOrder.data_pengiriman} />
              <p className="text-slate-500 text-xs mt-2">
                Tipe Pembeli: <span className="capitalize font-semibold text-slate-800">{selectedOrder.data_pengiriman?.tipe_pembeli}</span>
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Penyesuaian Harga per Item & Biaya Kirim</h3>
              {selectedOrder.items.map((item, index) => (
                <TextField
                  key={item.id_detail}
                  label={`Harga per ${item.satuan}: ${item.nama_produk} (Jumlah: ${item.jumlah} ${item.satuan})`}
                  type="number"
                  min={1}
                  required
                  value={offer.items[index]?.harga_satuan || ''}
                  onChange={(e) =>
                    setOffer((prev) => ({
                      ...prev,
                      items: prev.items.map((row, i) =>
                        i === index ? { ...row, harga_satuan: Number(e.target.value) } : row
                      ),
                    }))
                  }
                />
              ))}
              <TextField
                label="Biaya Pengiriman / Ongkir (Rp)"
                type="number"
                min={0}
                required
                value={offer.biaya_pengiriman}
                onChange={(e) =>
                  setOffer((prev) => ({ ...prev, biaya_pengiriman: Number(e.target.value) }))
                }
              />
              <TextArea
                label="Catatan Penawaran ke Pembeli"
                maxLength={2000}
                value={offer.catatan_penawaran}
                placeholder="Misal: Tambahan es batu & box styrofoam tebal gratis untuk jaminan kesegaran."
                onChange={(e) =>
                  setOffer((prev) => ({ ...prev, catatan_penawaran: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setSelectedCode(null)}>
                Batal
              </Button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Mengirim...' : 'Kirim Penawaran ke Pembeli'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
