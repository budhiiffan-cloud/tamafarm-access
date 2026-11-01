import { lazy, Suspense, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { rupiah, qty } from '../../lib/format'
import { statusLabel } from '../../lib/orders'
import { useFetch } from '../../lib/useFetch'
import { PageHeader } from './PanelLayout'
import DeliveryLocationLink from '../../components/DeliveryLocationLink'
const OrderQrScanner = lazy(() => import('../../components/OrderQrScanner'))

export default function Pesanan() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch(`/pengelolaan/pesanan?page=${page}`)
  const [code, setCode] = useState(null)
  const [order, setOrder] = useState(null)
  const [offer, setOffer] = useState({ biaya_pengiriman: 0, catatan_penawaran: '', items: [] })
  const [shipment, setShipment] = useState({ kurir: '', no_resi: '' })
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [verificationNotes, setVerificationNotes] = useState({})

  useEffect(() => {
    let off = false
    setOrder(null)
    setFailure('')
    setProofUrl('')
    setVerificationNotes({})
    if (!code) return
    api
      .get(`/pengelolaan/pesanan/${code}`)
      .then((r) => {
        if (off) return
        setOrder(r.data)
        setOffer({
          biaya_pengiriman: Number(r.data.biaya_pengiriman || 0),
          catatan_penawaran: r.data.catatan_penawaran || '',
          items: r.data.items.map((item) => ({ id_detail: item.id_detail, harga_satuan: Number(item.harga_satuan) })),
        })
        setShipment({ kurir: r.data.pengiriman?.kurir || '', no_resi: r.data.pengiriman?.no_resi || '' })
      })
      .catch((e) => !off && setFailure(e.message))
    return () => {
      off = true
    }
  }, [code])

  async function save(path, body) {
    if (path === 'penawaran') {
      body = {
        ...body,
        biaya_pengiriman: Number(body.biaya_pengiriman),
        items: body.items.map((item) => ({ ...item, harga_satuan: Number(item.harga_satuan) })),
      }
      if (!Number.isInteger(body.biaya_pengiriman) || body.biaya_pengiriman < 0 || body.biaya_pengiriman > 1000000000 ||
          body.items.some((item) => !Number.isInteger(item.harga_satuan) || item.harga_satuan < 1 || item.harga_satuan > 1000000000)) {
        setFailure('Harga produk dan ongkir harus berupa rupiah bulat. Harga minimal Rp1 dan ongkir minimal Rp0, masing-masing maksimal Rp1.000.000.000.')
        return
      }
    }
    setBusy(true)
    setFailure('')
    try {
      await api.post(`/pengelolaan/pesanan/${code}/${path}`, body)
      setCode(null)
      reload()
    } catch (err) {
      setFailure(Object.values(err.errors || {}).flat().join(' ') || err.message)
    } finally {
      setBusy(false)
    }
  }

  const getStatusColor = (status, penawaran) => {
    if (penawaran === 'menunggu') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (status === 'menunggu_persetujuan') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (status === 'disetujui') return 'bg-sky-50 text-sky-700 border-sky-200'
    if (status === 'dp_dibayar' || status === 'lunas') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'dikirim') return 'bg-teal-50 text-teal-700 border-teal-200'
    if (status === 'ditolak') return 'bg-rose-50 text-rose-700 border-rose-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const ordersList = (data?.data || []).filter((item) =>
    item.kode_pesanan.toLowerCase().includes(q.trim().toLowerCase())
  )

  async function openProof(payment) {
    setBusy(true)
    setFailure('')
    setProofUrl('')
    try {
      const response = await api.get(`/pengelolaan/pesanan/${code}/bukti/${payment.id_pembayaran}`)
      setProofUrl(response.data.url)
    } catch (err) {
      setFailure(err.message)
    } finally {
      setBusy(false)
    }
  }

  function verify(payment, keputusan) {
    const catatan = (verificationNotes[payment.id_pembayaran] || '').trim()
    if (keputusan === 'ditolak' && !catatan) {
      setFailure('Isi alasan penolakan agar pembeli dapat memperbaiki buktinya.')
      return
    }
    if (window.confirm(keputusan === 'dibayar'
      ? (payment.simulasi ? `Setujui simulasi pembayaran ${rupiah(payment.jumlah)}? Tidak ada transfer uang.` : `Dana ${rupiah(payment.jumlah)} sudah masuk ke rekening Tamafarm?`)
      : 'Tolak bukti pembayaran ini?')) {
      save(`pembayaran/${payment.id_pembayaran}/verifikasi`, { keputusan, catatan })
    }
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Pesanan Pelanggan"
        subtitle="Kelola persetujuan, penawaran harga, pembayaran, dan informasi pengiriman."
        action={
          <button
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Perbarui Data</span>
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

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
          Halaman {page} dari {data?.last_page || 1} ({data?.total || 0} total pesanan)
        </p>
      </div>

      {/* Orders Table */}
      <Suspense fallback={<p className="mb-4 text-sm text-slate-500">Memuat pemindai QR…</p>}>
        <OrderQrScanner onOrder={setCode} />
      </Suspense>
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
              ) : ordersList.length ? (
                ordersList.map((item) => (
                  <tr key={item.kode_pesanan} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-900 font-mono">
                      {item.kode_pesanan}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {item.tanggal}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          item.status_pesanan,
                          item.status_penawaran
                        )}`}
                      >
                        {statusLabel(item.status_pesanan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status_penawaran ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                          {item.status_penawaran}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-center">
                      {rupiah(item.total)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setCode(item.kode_pesanan)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0c1929] hover:bg-[#182638] text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          <span>Kelola</span>
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

        {data?.last_page > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="text-slate-500 font-medium">
              Halaman {page} dari {data.last_page}
            </span>
            <button
              disabled={page === data.last_page}
              onClick={() => setPage(page + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>

      {/* Modal Detail & Aksi Kelola Pesanan */}
      {code && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Kelola Pesanan: {code}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status: <span className="font-semibold capitalize text-slate-800">{statusLabel(order?.status_pesanan)}</span>
                </p>
              </div>
              <button
                onClick={() => !busy && setCode(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {failure && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-600 font-medium">
                {failure}
              </div>
            )}

            {!order ? (
              <p className="py-8 text-center text-xs text-slate-500">Memuat rincian pesanan...</p>
            ) : (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* Data Pengiriman */}
                {order.data_pengiriman && (
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Data Penerima
                    </span>
                    <p className="font-bold text-slate-900">{order.data_pengiriman.nama} ({order.data_pengiriman.no_hp})</p>
                    <p className="text-slate-600">{order.data_pengiriman.alamat}, {order.data_pengiriman.negara}</p>
                    <DeliveryLocationLink shipping={order.data_pengiriman} />
                    <p className="text-slate-500 text-xs">
                      Tipe Pembeli: <strong className="capitalize">{order.data_pengiriman.tipe_pembeli}</strong>
                    </p>
                  </div>
                )}

                {/* Items Table in Modal */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Item Produk Dipesan
                  </span>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-700 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 text-center">Produk</th>
                          <th className="px-4 py-2.5 text-center">Jumlah</th>
                          <th className="px-4 py-2.5 text-center">Harga Satuan</th>
                          <th className="px-4 py-2.5 text-center">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {order.items.map((item) => (
                          <tr key={item.id_detail} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{item.nama_produk}</td>
                            <td className="px-4 py-2.5 text-center text-slate-600">{qty(item.jumlah)} {item.satuan}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{rupiah(item.harga_satuan)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">{rupiah(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 flex justify-between font-bold text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-100">
                    <span>Total Tagihan:</span>
                    <span className="text-[#dc4c3e] text-base">{rupiah(order.total)}</span>
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-200 p-5 space-y-4">
                  <h3 className="font-bold text-slate-900">Pembayaran dan bukti transfer</h3>
                  <p className="text-xs text-slate-500">{order.simulasi_pembayaran ? 'PEMBAYARAN SIMULASI — untuk uji coba, tanpa transfer uang. Periksa contoh bukti sebelum menyetujui.' : 'Periksa bukti dan dana yang masuk sebelum menyetujui pembayaran.'}</p>
                  {!order.pembayaran?.length && <p>Belum ada pembayaran.</p>}
                  {order.pembayaran?.map((payment) => (
                    <div key={payment.id_pembayaran} className="rounded-xl bg-slate-50 p-4 space-y-2">
                      <p className="font-semibold">{payment.jenis.toUpperCase()} · {rupiah(payment.jumlah)} · {payment.status_bayar === 'menunggu' && payment.ada_bukti ? 'Menunggu verifikasi' : statusLabel(payment.status_bayar)}</p>
                      <p className="text-xs text-slate-500">{payment.simulasi ? 'SIMULASI — tidak ada uang yang ditransfer' : payment.metode === 'transfer_manual' ? 'Transfer manual' : payment.metode || 'Midtrans'}</p>
                      {payment.catatan_verifikasi && <p>Catatan: {payment.catatan_verifikasi}</p>}
                      {payment.ada_bukti && <button disabled={busy} onClick={() => openProof(payment)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50">Lihat bukti transfer</button>}
                      {payment.ada_bukti && payment.status_bayar === 'menunggu' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold">Catatan verifikasi (wajib jika ditolak)
                            <textarea maxLength={2000} value={verificationNotes[payment.id_pembayaran] || ''} onChange={(e) => setVerificationNotes((notes) => ({ ...notes, [payment.id_pembayaran]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" />
                          </label>
                          <div className="flex gap-2">
                            <button disabled={busy} onClick={() => verify(payment, 'dibayar')} className="rounded-lg bg-emerald-700 px-3 py-2 text-white disabled:opacity-50">{payment.simulasi ? 'Setujui simulasi' : 'Dana masuk, setujui'}</button>
                            <button disabled={busy} onClick={() => verify(payment, 'ditolak')} className="rounded-lg border border-red-300 px-3 py-2 text-red-700 disabled:opacity-50">Tolak bukti</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {proofUrl && <div className="space-y-2"><p className="text-xs text-slate-500">Pratinjau bukti pembayaran</p><img src={proofUrl} alt="Bukti transfer pembeli" className="max-h-96 w-full rounded-xl object-contain" onError={() => { setProofUrl(''); setFailure('Bukti belum dapat ditampilkan. Tekan Lihat bukti transfer lagi.') }} /><button onClick={() => setProofUrl('')} className="text-xs underline">Tutup pratinjau</button></div>}
                </section>

                {/* Form Kirim Penawaran */}
                {['menunggu_persetujuan', 'disetujui'].includes(order.status_pesanan) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      save('penawaran', offer)
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                  >
                    <h3 className="font-bold text-slate-900 text-sm">
                      Kirim / Revisi Penawaran Transaksi
                    </h3>
                    {order.items.map((item, index) => (
                      <div key={item.id_detail}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Harga per {item.satuan}: {item.nama_produk}
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={offer.items[index]?.harga_satuan || ''}
                          onChange={(e) =>
                            setOffer((f) => ({
                              ...f,
                              items: f.items.map((row, i) =>
                                i === index ? { ...row, harga_satuan: Number(e.target.value) } : row
                              ),
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biaya Pengiriman / Ongkir (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={offer.biaya_pengiriman}
                        onChange={(e) =>
                          setOffer((f) => ({ ...f, biaya_pengiriman: Number(e.target.value) }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Catatan Penawaran (atau alasan penolakan jika ditolak)
                      </label>
                      <textarea
                        rows={2}
                        value={offer.catatan_penawaran}
                        onChange={(e) =>
                          setOffer((f) => ({ ...f, catatan_penawaran: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                      >
                        Kirim Penawaran ke Pembeli
                      </button>
                      <button
                        type="button"
                        disabled={busy || !offer.catatan_penawaran.trim()}
                        onClick={() => save('tolak', { alasan: offer.catatan_penawaran })}
                        className="rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Tolak Pesanan
                      </button>
                    </div>
                  </form>
                )}

                {/* Form Input Resi Pengiriman */}
                {order.status_penawaran === 'diterima' &&
                  order.pembayaran.some((p) => p.jenis === 'dp' && p.status_bayar === 'dibayar') &&
                  order.pengiriman?.status_pengiriman !== 'diterima' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        save('pengiriman', shipment)
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3"
                    >
                      <h3 className="font-bold text-slate-900 text-sm">
                        Input Ekspedisi & Nomor Resi
                      </h3>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Kurir / Ekspedisi</label>
                        <input
                          type="text"
                          required
                          value={shipment.kurir}
                          onChange={(e) => setShipment((s) => ({ ...s, kurir: e.target.value }))}
                          placeholder="Contoh: JNE Cargo / Ekspedisi Khusus Lobster"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Resi / Surat Jalan</label>
                        <input
                          type="text"
                          required
                          value={shipment.no_resi}
                          onChange={(e) => setShipment((s) => ({ ...s, no_resi: e.target.value }))}
                          placeholder="Contoh: TM-LOB-99210"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-xl bg-[#0c1929] hover:bg-[#182638] px-5 py-2.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
                      >
                        Simpan Pengiriman
                      </button>
                    </form>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
