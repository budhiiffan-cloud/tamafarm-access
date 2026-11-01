import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { rupiah, qty, getGambarUrl } from '../lib/format'
import { rememberOrder } from '../lib/orders'

export default function Checkout() {
  const { id } = useParams() // undefined jika checkout dari keranjang
  const [searchParams] = useSearchParams()
  const initialQty = Math.max(1, Number(searchParams.get('qty') || 1))

  const { user } = useAuth()
  const { items: cartItems, clearCart, totalPrice: cartTotalPrice } = useCart()
  const isDirectCheckout = Boolean(id)

  const { data: directProduct, loading: productLoading, error: productError } = useFetch(
    isDirectCheckout ? `/produk/${id}` : null
  )

  const [form, setForm] = useState({
    nama: '',
    no_hp: '',
    alamat: '',
    negara: 'Indonesia',
    tipe_pembeli: 'perorangan',
    jumlah: String(initialQty),
    catatan: '',
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let off = false
    if (user?.role === 'pelanggan') {
      api
        .get('/pembeli/profil')
        .then((r) => {
          if (!off) {
            setForm((f) => ({
              ...f,
              nama: r.data.nama || '',
              no_hp: r.data.no_hp || '',
              alamat: r.data.alamat || '',
              negara: r.data.negara || 'Indonesia',
              tipe_pembeli: r.data.tipe_pembeli || 'perorangan',
            }))
          }
        })
        .catch(() => {})
    }
    return () => {
      off = true
    }
  }, [user])

  // Validasi item yang dicheckout
  if (!isDirectCheckout && cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Keranjang Belanja Kosong</h2>
        <p className="text-sm text-slate-500 mb-6">Pilih produk terlebih dahulu untuk melakukan checkout pesanan.</p>
        <Link
          to="/#produk"
          className="inline-flex items-center justify-center rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-6 py-2.5 text-xs font-semibold text-white shadow-xs"
        >
          Lihat Katalog Produk
        </Link>
      </div>
    )
  }

  if (isDirectCheckout && productLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">Memuat data produk...</div>
  }

  if (isDirectCheckout && (productError || !directProduct)) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-red-500">{productError || 'Produk tidak ditemukan.'}</div>
  }

  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const checkoutItems = isDirectCheckout
    ? [
        {
          id_produk: Number(directProduct.id_produk),
          nama_produk: directProduct.nama_produk,
          satuan: directProduct.satuan,
          ukuran: directProduct.ukuran,
          harga: Number(directProduct.harga),
          jumlah: Math.max(1, Number(form.jumlah || 1)),
          gambar_url: directProduct.gambar_url,
        },
      ]
    : cartItems.map((item) => ({
        ...item,
        jumlah: Number(item.jumlah || 1),
      }))

  const totalCalculated = checkoutItems.reduce((acc, curr) => acc + curr.harga * curr.jumlah, 0)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      const { jumlah, ...profile } = form
      const payloadItems = checkoutItems.map((it) => ({
        id_produk: it.id_produk,
        jumlah: it.jumlah,
      }))

      const result = await api.post('/pesanan', {
        ...profile,
        items: payloadItems,
      })

      if (!isDirectCheckout) {
        clearCart()
      }

      rememberOrder(result.data.kode_pesanan, result.data.token_akses)
      navigate(`/pesanan/${result.data.kode_pesanan}`)
    } catch (err) {
      setMessage(Object.values(err.errors || {}).flat().join(' ') || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link to="/" className="hover:text-slate-700">Beranda</Link>
        <span>/</span>
        {!isDirectCheckout ? (
          <Link to="/keranjang" className="hover:text-slate-700">Keranjang</Link>
        ) : (
          <Link to={`/produk/${id}`} className="hover:text-slate-700">{directProduct.nama_produk}</Link>
        )}
        <span>/</span>
        <span className="text-slate-800 font-semibold">Checkout Pesanan</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Formulir Pemesanan
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Lengkapi data penerima dan alamat pengiriman. Admin akan memeriksa stok dan mengirimkan penawaran transaksi resmi.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
          {message}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping Data Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            Informasi Pembeli & Pengiriman
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={form.nama}
              onChange={change('nama')}
              required
              placeholder="Contoh: Budi Santoso"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
            <input
              type="tel"
              value={form.no_hp}
              onChange={change('no_hp')}
              required
              placeholder="Contoh: 081234567890"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Pembeli</label>
              <select
                value={form.tipe_pembeli}
                onChange={change('tipe_pembeli')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-800 focus:outline-none bg-white"
              >
                <option value="perorangan">Perorangan (Konsumsi)</option>
                <option value="restoran">Restoran / Rumah Makan</option>
                <option value="luar_negeri">Luar Negeri / Ekspor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Negara Tujuan</label>
              <input
                type="text"
                value={form.negara}
                onChange={change('negara')}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap Pengiriman</label>
            <textarea
              rows={3}
              value={form.alamat}
              onChange={change('alamat')}
              required
              placeholder="Sebutkan jalan, nomor rumah, RT/RW, kelurahan, kecamatan, dan kota tujuan..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={form.catatan}
              onChange={change('catatan')}
              placeholder="Contoh: packing ekstra oksigen, kirim pagi hari, dll."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Ringkasan Pesanan ({checkoutItems.length} produk)
            </h2>
            {!isDirectCheckout && (
              <Link to="/keranjang" className="text-xs font-semibold text-[#dc4c3e] hover:underline">
                Ubah Keranjang
              </Link>
            )}
          </div>

          {/* List Item Dipesan */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-slate-100">
            {checkoutItems.map((item) => {
              const itemSubtotal = item.harga * item.jumlah
              const imgSrc = getGambarUrl(item.gambar_url)

              return (
                <div key={item.id_produk} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.nama_produk} className="h-full w-full object-cover" />
                      ) : (
                        <span>🦞</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.nama_produk}</p>
                      <p className="text-slate-500 mt-0.5">
                        {item.jumlah} {item.satuan} × {rupiah(item.harga)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">{rupiah(itemSubtotal)}</span>
                </div>
              )
            })}
          </div>

          {isDirectCheckout && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
              <label>Kuantiti yang dipesan:</label>
              <input
                type="number"
                min={1}
                value={form.jumlah}
                onChange={change('jumlah')}
                required
                className="w-20 rounded-lg border border-slate-300 px-2.5 py-1 text-center font-bold text-sm bg-white"
              />
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Subtotal Produk</span>
              <span className="font-semibold text-slate-800">{rupiah(totalCalculated)}</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya Pengiriman</span>
              <span className="text-slate-500 italic">Dihitung pada Penawaran</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Estimasi Awal</span>
              <span className="text-[#dc4c3e] text-base">{rupiah(totalCalculated)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
            💡 <strong>Alur Transaksi</strong>: Setelah pesanan diajukan, Admin akan memeriksa ketersediaan stok fisik dan mengonfirmasi ongkos kirim resmi. Anda dapat menyetujui penawaran sebelum melakukan pembayaran DP via Midtrans.
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] py-3 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Mengajukan Pesanan...' : `Ajukan Pesanan (${checkoutItems.length} Produk)`}
          </button>
        </div>
      </form>
    </div>
  )
}
