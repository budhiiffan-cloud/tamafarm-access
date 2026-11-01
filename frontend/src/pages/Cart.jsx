import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { rupiah, qty, getGambarUrl } from '../lib/format'

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalCount } = useCart()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link to="/" className="hover:text-slate-700">Beranda</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Keranjang Belanja</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Keranjang Belanja
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Periksa dan atur jumlah produk yang ingin Anda pesan sebelum melakukan checkout.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-3xl mb-4">
            🛒
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Keranjang Belanja Masih Kosong
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Anda belum menambahkan produk lobster atau paket budidaya ke keranjang.
          </p>
          <Link
            to="/#produk"
            className="inline-flex items-center justify-center rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:bg-[#b83325] active:scale-95 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 cursor-pointer"
          >
            Mulai Belanja Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Daftar Produk di Keranjang */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs divide-y divide-slate-100">
              {items.map((item) => {
                const subtotal = item.harga * item.jumlah
                const imgSrc = getGambarUrl(item.gambar_url)

                return (
                  <div key={item.id_produk} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Foto & Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-20 w-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={item.nama_produk}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'block'
                              }
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <span style={{ display: imgSrc ? 'none' : 'block' }}>🦞</span>
                      </div>
                      <div>
                        <Link
                          to={`/produk/${item.id_produk}`}
                          className="font-bold text-slate-900 hover:text-[#dc4c3e] transition-colors text-sm sm:text-base"
                        >
                          {item.nama_produk}
                        </Link>
                        {item.ukuran && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.ukuran}</p>
                        )}
                        <p className="text-xs font-semibold text-slate-600 mt-1">
                          {rupiah(item.harga)} <span className="font-normal text-slate-400">/ {item.satuan}</span>
                        </p>
                      </div>
                    </div>

                    {/* Pengatur Kuantitas & Subtotal */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                      {/* Kontrol + - */}
                      <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id_produk, item.jumlah - 1)}
                          className="px-3 py-1 text-slate-600 hover:text-slate-900 font-bold active:scale-90 transition-all cursor-pointer"
                          title="Kurangi"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs sm:text-sm font-semibold text-slate-800 min-w-8 text-center">
                          {item.jumlah}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id_produk, item.jumlah + 1)}
                          className="px-3 py-1 text-slate-600 hover:text-slate-900 font-bold active:scale-90 transition-all cursor-pointer"
                          title="Tambah"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-28">
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 block">
                          {rupiah(subtotal)}
                        </span>
                      </div>

                      {/* Hapus dari keranjang */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id_produk)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus dari keranjang"
                        aria-label="Hapus dari keranjang"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                to="/#produk"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
              >
                ← Tambah Produk Lainnya
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
              >
                Kosongkan Keranjang
              </button>
            </div>
          </div>

          {/* Ringkasan Belanja */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 shadow-xs space-y-5 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              Ringkasan Pesanan
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Jenis Produk:</span>
                <span className="font-semibold text-slate-800">{items.length} jenis</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Kuantitas:</span>
                <span className="font-semibold text-slate-800">{qty(totalCount)} item</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base sm:text-lg font-extrabold text-slate-900">
                <span>Total Estimasi:</span>
                <span className="text-[#dc4c3e]">{rupiah(totalPrice)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                * Harga belum termasuk ongkos kirim. Admin akan memeriksa ketersediaan stok aktual dan mengirimkan rincian penawaran final.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:bg-[#b83325] active:scale-95 py-3.5 text-center text-sm font-semibold text-white shadow-xs transition-all duration-200 cursor-pointer"
            >
              Lanjut ke Checkout ({items.length})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

