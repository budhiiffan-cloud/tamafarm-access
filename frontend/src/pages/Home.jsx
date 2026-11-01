import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { rupiah, getGambarUrl } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

export default function Home() {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const toast = useToast()
  const { data: rawProduk } = useFetch('/produk')
  const { hash } = useLocation()
  const produkList = rawProduk || []

  const [showAllLobster, setShowAllLobster] = useState(false)
  const [showAllKemitraan, setShowAllKemitraan] = useState(false)

  // Smooth scroll saat ada anchor hash (#produk atau #tentang)
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [hash])

  // Pisahkan produk lobster hidup (per kg) dan paket kemitraan (per paket)
  const allLobsterProducts = useMemo(() => {
    const items = produkList.filter(
      (p) => p.satuan === 'kg' || p.kategori?.nama_kategori?.toLowerCase().includes('lobster')
    )
    if (items.length > 0) return items
    return [
      { id_produk: 1, nama_produk: 'Lobster Air Tawar Small', ukuran: '30–50 gr', harga: 120000, satuan: 'kg', gambar_url: null, stok: 50 },
      { id_produk: 2, nama_produk: 'Lobster Air Tawar Medium', ukuran: '50–80 gr', harga: 150000, satuan: 'kg', gambar_url: null, stok: 35 },
      { id_produk: 3, nama_produk: 'Lobster Air Tawar Large', ukuran: '80–120 gr', harga: 185000, satuan: 'kg', gambar_url: null, stok: 20 },
    ]
  }, [produkList])

  const allKemitraanProducts = useMemo(() => {
    const items = produkList.filter(
      (p) => p.satuan === 'paket' || p.kategori?.nama_kategori?.toLowerCase().includes('kemitraan')
    )
    if (items.length > 0) return items
    return [
      { id_produk: 7, nama_produk: 'Paket Pemula Budidaya', ukuran: '100 ekor bibit/paket', harga: 750000, satuan: 'paket', gambar_url: null, stok: 10 },
      { id_produk: 8, nama_produk: 'Paket Farmer Mandiri', ukuran: '500 ekor bibit/paket', harga: 3250000, satuan: 'paket', gambar_url: null, stok: 5 },
    ]
  }, [produkList])

  const LOBSTER_LIMIT = 6
  const displayedLobsters = showAllLobster ? allLobsterProducts : allLobsterProducts.slice(0, LOBSTER_LIMIT)
  const remainingLobsters = allLobsterProducts.length - LOBSTER_LIMIT

  const KEMITRAAN_LIMIT = 4
  const displayedKemitraan = showAllKemitraan ? allKemitraanProducts : allKemitraanProducts.slice(0, KEMITRAAN_LIMIT)
  const remainingKemitraan = allKemitraanProducts.length - KEMITRAAN_LIMIT

  const consultationLink = user
    ? user.role === 'admin' || user.role === 'pemilik'
      ? '/panel/konsultasi'
      : '/konsultasi'
    : '/login?from=/konsultasi'

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-16">
      {/* ========================================================= */}
      {/* HERO SECTION                                             */}
      {/* ========================================================= */}
      <section className="rounded-3xl bg-[#0c1929] text-white p-7 sm:p-10 lg:p-12 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.18] tracking-tight text-white">
              Lobster Berkualitas<br />
              untuk Kebutuhan Anda
            </h1>
            <p className="mt-4 max-w-md text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Produk lobster hasil budidaya dengan pilihan jenis, ukuran, harga, dan stok yang jelas.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('produk')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center justify-center rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:bg-[#b83325] active:scale-95 px-7 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
              >
                Lihat Produk
              </button>
              <Link
                to={consultationLink}
                state={!user ? { from: '/konsultasi' } : undefined}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 px-5 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 cursor-pointer"
              >
                Konsultasi
              </Link>
            </div>
          </div>

          {/* Right Column: Tempat Foto Tambak */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-[#14283c] h-60 sm:h-72 lg:h-[280px] w-full flex items-center justify-center border border-slate-700/60 shadow-inner overflow-hidden relative">
              <img
                src="/tambak.jpg"
                alt="Foto Tambak"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex'
                  }
                }}
                className="w-full h-full object-cover"
                style={{ display: 'none' }}
              />
              <div className="flex flex-col items-center justify-center text-center px-4 space-y-1.5">
                <span className="text-3xl select-none">🏞️</span>
                <span className="text-xs sm:text-sm font-bold tracking-wider text-slate-300 uppercase">
                  FOTO TAMBAK
                </span>
                <span className="text-[11px] text-slate-500">
                  Area Tambak Budidaya Tama Farm
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 1: PRODUK LOBSTER                                 */}
      {/* ========================================================= */}
      <section id="produk" className="space-y-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Produk Lobster</h2>
            <p className="mt-1 text-sm text-slate-500 font-normal">
              Pilih produk sesuai jenis, ukuran, dan minimal pembelian.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Menampilkan {displayedLobsters.length} dari {allLobsterProducts.length} produk
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {displayedLobsters.map((p) => {
            const imgUrl = getGambarUrl(p.gambar_url)
            const isHabis = p.stok !== undefined && Number(p.stok) <= 0

            return (
              <div
                key={p.id_produk}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo container */}
                  <div className="rounded-xl bg-[#e5eff2] h-44 flex items-center justify-center text-xs font-semibold tracking-wider text-slate-400 overflow-hidden relative">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={p.nama_produk}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex'
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}

                    {/* Fallback box when no photo */}
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                      style={{ display: imgUrl ? 'none' : 'flex' }}
                    >
                      <span className="text-2xl mb-1">🦞</span>
                      <span className="text-xs font-semibold text-slate-400">FOTO PRODUK</span>
                    </div>

                    {/* Hanya tampilkan badge jika stok habis (badge Tersedia dihapus sesuai permintaan) */}
                    {isHabis && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
                          Stok Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-slate-900">{p.nama_produk}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.ukuran?.startsWith('Ukuran') ? p.ukuran : `Ukuran ${p.ukuran || '100–150 gr'}`}
                    </p>
                  </div>
                </div>

                {/* Bottom row: Price & Buttons */}
                <div className="mt-5 pt-3 flex items-center justify-between border-t border-slate-50 gap-2">
                  <span className="text-base font-bold text-[#dc4c3e] shrink-0">
                    {rupiah(p.harga)}/{p.satuan || 'kg'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isHabis}
                      onClick={() => {
                        addToCart(p, 1)
                        toast(`${p.nama_produk} dimasukkan ke keranjang!`)
                      }}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isHabis
                          ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                          : 'border-slate-200 text-slate-700 hover:text-[#dc4c3e] hover:border-[#dc4c3e] hover:bg-red-50/50 active:scale-90'
                      }`}
                      title={isHabis ? 'Stok habis' : 'Tambah ke Keranjang'}
                      aria-label="Tambah ke Keranjang"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    </button>
                    <Link
                      to={`/produk/${p.id_produk}`}
                      className="rounded-lg bg-[#0c1929] hover:bg-[#182638] active:bg-[#060c14] active:scale-95 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 shadow-xs hover:shadow cursor-pointer"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tombol Tampilkan Lebih Banyak / Lebih Sedikit */}
        {allLobsterProducts.length > LOBSTER_LIMIT && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAllLobster(!showAllLobster)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              {showAllLobster ? (
                <>
                  <span>Tampilkan Lebih Sedikit</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </>
              ) : (
                <>
                  <span>Tampilkan Lebih Banyak ({remainingLobsters} produk lainnya)</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: KEMITRAAN                                      */}
      {/* ========================================================= */}
      <section id="kemitraan" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Kemitraan</h2>
            <p className="mt-1 text-sm text-slate-500 font-normal">
              Pilih produk sesuai jenis, ukuran, dan minimal pembelian.
            </p>
          </div>
          {allKemitraanProducts.length > KEMITRAAN_LIMIT && (
            <span className="text-xs font-medium text-slate-400">
              Menampilkan {displayedKemitraan.length} dari {allKemitraanProducts.length} paket
            </span>
          )}
        </div>

        {/* Cards centered neatly */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 max-w-4xl mx-auto">
          {displayedKemitraan.map((p) => {
            const imgUrl = getGambarUrl(p.gambar_url)

            return (
              <div
                key={p.id_produk}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo container */}
                  <div className="rounded-xl bg-[#e5eff2] h-44 flex items-center justify-center text-xs font-semibold tracking-wider text-slate-400 overflow-hidden relative">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={p.nama_produk}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex'
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}

                    {/* Fallback box when no photo */}
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                      style={{ display: imgUrl ? 'none' : 'flex' }}
                    >
                      <span className="text-2xl mb-1">🤝</span>
                      <span className="text-xs font-semibold text-slate-400">FOTO PRODUK</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-slate-900">{p.nama_produk}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.ukuran?.startsWith('Ukuran') ? p.ukuran : `Ukuran ${p.ukuran || '100–150 gr'}`}
                    </p>
                  </div>
                </div>

                {/* Bottom row: Price & Detail Button */}
                <div className="mt-5 pt-3 flex items-center justify-between border-t border-slate-50 gap-2">
                  <span className="text-base font-bold text-[#dc4c3e] shrink-0">
                    {rupiah(p.harga)}{p.satuan === 'paket' ? '/paket' : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(p, 1)
                        toast(`${p.nama_produk} dimasukkan ke keranjang!`)
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:text-[#dc4c3e] hover:border-[#dc4c3e] hover:bg-red-50/50 active:scale-90 transition-all cursor-pointer"
                      title="Tambah ke Keranjang"
                      aria-label="Tambah ke Keranjang"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    </button>
                    <Link
                      to={`/produk/${p.id_produk}`}
                      className="rounded-lg bg-[#0c1929] hover:bg-[#182638] active:bg-[#060c14] active:scale-95 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 shadow-xs hover:shadow cursor-pointer"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tombol Tampilkan Lebih Banyak Kemitraan */}
        {allKemitraanProducts.length > KEMITRAAN_LIMIT && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAllKemitraan(!showAllKemitraan)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              {showAllKemitraan ? (
                <>
                  <span>Tampilkan Lebih Sedikit</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </>
              ) : (
                <>
                  <span>Tampilkan Lebih Banyak ({remainingKemitraan} paket lainnya)</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: TENTANG KAMI                                    */}
      {/* ========================================================= */}
      <section id="tentang" className="space-y-6 scroll-mt-24 pt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tentang Kami</h2>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Mengenal Tama Farm dan komitmen kami dalam penyediaan lobster air tawar unggulan.
          </p>
        </div>

        {/* 3 Keunggulan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#dc4c3e] flex items-center justify-center font-bold text-lg">
              🦞
            </div>
            <h3 className="text-base font-bold text-slate-900">Budidaya Mandiri Berkualitas</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Lobster air tawar dibudidayakan langsung pada tambak terkontrol dengan monitoring kualitas air (suhu, pH, dan salinitas) yang terjaga untuk memastikan kesegaran optimal.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              ⚖️
            </div>
            <h3 className="text-base font-bold text-slate-900">Transparansi MOQ & Ukuran</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Menyediakan klasifikasi ukuran yang akurat dengan batas minimal pembelian (MOQ) transparan untuk kebutuhan eceran, pasokan restoran reguler, hingga kuantiti ekspor.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              🤝
            </div>
            <h3 className="text-base font-bold text-slate-900">Program Kemitraan Terbina</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Mendukung petani baru lewat Paket Pemula dan Paket Farmer, dilengkapi bibit sehat, pakan starter bernutrisi tinggi, dan bimbingan teknis budidaya hingga masa panen.
            </p>
          </div>
        </div>

        {/* Profil Lokasi & Hubungi Kami Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#dc4c3e] uppercase tracking-wider block">
              📍 LOKASI TAMBAK & DISTRIBUSI
            </span>
            <h4 className="text-lg font-bold text-slate-900">
              Pusat Budidaya & Distribusi Tama Farm
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              <strong>Alamat:</strong> Jl. Tik Nibung 2 No.16, RT.002/RW.08, Perak Utara, Kec. Pabean Cantian, Kota Surabaya, Jawa Timur 60165<br />
              <strong>Penanggung Jawab:</strong> Ahmad Rama Aditiya Iswanto · <strong>WhatsApp:</strong> 0857-5597-1102
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 border border-slate-200">
                🕒 Buka: Setiap Hari (08.00 - 18.00 WIB)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 border border-slate-200">
                🚚 Melayani Ambil di Tempat & Kirim Luar Kota
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              to={consultationLink}
              state={!user ? { from: '/konsultasi' } : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1929] hover:bg-[#182638] text-white active:scale-95 px-6 py-3 text-xs font-bold transition-all duration-200 shadow-md cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Chat Konsultasi</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
