import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { rupiah } from '../../lib/format'
import { statusLabel } from '../../lib/orders'
import { PageHeader } from './PanelLayout'

export default function Pelanggan() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    api.get(`/pengelolaan/pelanggan?page=${page}&q=${encodeURIComponent(q)}`)
      .then((res) => { if (active) setData(res.data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [page, q])
  useEffect(() => {
    if (!selected) return
    let active = true
    setOrders(null)
    setError('')
    api.get(`/pengelolaan/pelanggan/${selected.id_pelanggan}/pesanan`)
      .then((res) => { if (active) setOrders(res.data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [selected])
  return (
    <div className="space-y-6">
      <PageHeader title="Pelanggan" subtitle="Data pelanggan dan riwayat transaksi penjualan." />
      <label className="block text-sm">Cari nama atau nomor HP
        <input className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); setSelected(null) }} />
      </label>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {!data && !error && <p>Memuat pelanggan...</p>}
      {data && <>
        <div className="overflow-x-auto rounded-2xl bg-white p-4">
          <table className="w-full text-left text-sm">
            <thead><tr>{['Pelanggan', 'Kontak & Alamat', 'Jumlah Pesanan', 'Pesanan Terakhir', 'Riwayat'].map((h) => <th className="p-3" key={h}>{h}</th>)}</tr></thead>
            <tbody>{data.data.map((c) => <tr key={c.id_pelanggan} className="border-t border-slate-100">
              <td className="p-3 font-semibold">{c.nama}<span className="block text-xs font-normal text-slate-500">{c.tipe_pembeli.replaceAll('_', ' ')}</span></td>
              <td className="p-3">{c.no_hp}<span className="block text-xs text-slate-500">{c.alamat || '-'} · {c.negara || '-'}</span></td>
              <td className="p-3">{c.jumlah_pesanan}</td><td className="p-3">{c.pesanan_terakhir || '-'}</td>
              <td className="p-3"><button className="font-semibold text-blue-700" onClick={() => setSelected(c)}>Lihat Riwayat</button></td>
            </tr>)}</tbody>
          </table>
          {!data.data.length && <p className="p-4 text-slate-500">Pelanggan tidak ditemukan.</p>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Sebelumnya</button>
          <span>Halaman {data.current_page} dari {data.last_page} · {data.total} pelanggan</span>
          <button disabled={page >= data.last_page} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Berikutnya</button>
        </div>
      </>}
      {selected && <section className="rounded-2xl bg-white p-6 space-y-3">
        <div className="flex justify-between"><h2 className="font-bold">Riwayat Pesanan — {selected.nama}</h2><button onClick={() => setSelected(null)}>Tutup</button></div>
        {!orders && !error && <p>Memuat riwayat...</p>}
        {orders?.length === 0 && <p>Belum ada pesanan.</p>}
        {orders?.map((o) => <div key={o.kode_pesanan} className="flex flex-wrap justify-between gap-3 border-t py-3 text-sm">
          <div><p className="font-semibold">{o.kode_pesanan}</p><p className="text-slate-500">{o.tanggal}</p></div>
          <span>{statusLabel(o.status_pesanan)}</span><strong>{rupiah(o.total)}</strong>
        </div>)}
      </section>}
    </div>
  )
}
