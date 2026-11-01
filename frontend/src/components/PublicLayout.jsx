import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function PublicLayout() {
  const { user, logout } = useAuth()
  const { totalItemsCount } = useCart()

  // Jika admin atau pemilik login, langsung alihkan ke panel admin
  if (user?.role === 'admin' || user?.role === 'pemilik') {
    return <Navigate to="/panel/dashboard" replace />
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('beranda')
  const location = useLocation()
  const navigate = useNavigate()

  // Track active section automatically during smooth scroll
  useEffect(() => {
    if (location.pathname === '/konsultasi') {
      setActiveNav('konsultasi')
      return
    }
    if (location.pathname === '/keranjang') {
      setActiveNav('keranjang')
      return
    }
    if (location.pathname === '/pesanan') {
      setActiveNav('pesanan')
      return
    }
    if (location.pathname !== '/') {
      setActiveNav('')
      return
    }

    const handleScroll = () => {
      const scrollPos = window.scrollY + 160
      const produkEl = document.getElementById('produk')
      const tentangEl = document.getElementById('tentang')

      if (tentangEl && scrollPos >= tentangEl.offsetTop) {
        setActiveNav('tentang')
      } else if (produkEl && scrollPos >= produkEl.offsetTop) {
        setActiveNav('produk')
      } else {
        setActiveNav('beranda')
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  const goToSection = (sectionId) => {
    setMobileMenuOpen(false)
    if (!sectionId) {
      if (location.pathname !== '/') {
        navigate('/')
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`)
    } else {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const navButtonClass = (section) => {
    const isActive = activeNav === section
    return `text-sm transition-all duration-200 cursor-pointer active:scale-95 select-none ${
      isActive
        ? 'text-white font-semibold'
        : 'text-slate-300 hover:text-white'
    }`
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8fb] antialiased text-slate-800">
      {/* Navbar matching exact mockup */}
      <header className="bg-[#0c1929] text-white sticky top-0 z-50 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => goToSection(null)}
            className="text-xl font-extrabold tracking-wider text-white hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            TAMA FARM
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <button
              type="button"
              onClick={() => goToSection(null)}
              className={navButtonClass('beranda')}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => goToSection('produk')}
              className={navButtonClass('produk')}
            >
              Produk
            </button>
            <button
              type="button"
              onClick={() => goToSection('tentang')}
              className={navButtonClass('tentang')}
            >
              Tentang Kami
            </button>
            <Link
              to={user ? (user.role === 'admin' || user.role === 'pemilik' ? '/panel/konsultasi' : '/konsultasi') : '/login?from=/konsultasi'}
              state={!user ? { from: '/konsultasi' } : undefined}
              className={navButtonClass('konsultasi')}
            >
              Konsultasi
            </Link>
            <Link
              to="/pesanan"
              className={navButtonClass('pesanan')}
            >
              Pesanan Saya
            </Link>
          </nav>

          {/* Right Action: Keranjang then Login */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/keranjang"
              className="inline-flex items-center gap-2 justify-center rounded-lg bg-[#dc4c3e] hover:bg-[#c93f31] active:bg-[#b83325] active:scale-95 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer relative"
              title="Lihat Keranjang Belanja"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>Keranjang</span>
              {totalItemsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-[#dc4c3e] text-[11px] font-extrabold px-1.5 shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* Login / User Info on the right of Keranjang */}
            {!user ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 justify-center rounded-lg border border-slate-600 bg-[#142436] hover:bg-slate-700 hover:border-slate-400 active:bg-slate-800 active:scale-95 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Login
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">
                  Hi, <span className="font-semibold text-white">{user.nama}</span>
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-slate-700/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-400 hover:bg-slate-800 active:scale-95 transition-all duration-200 cursor-pointer"
                  title="Keluar dari akun"
                >
                  Keluar
                </button>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/keranjang"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#dc4c3e] px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>Keranjang</span>
              {totalItemsCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-[#dc4c3e] text-[10px] font-bold px-1">
                  {totalItemsCount}
                </span>
              )}
            </Link>
            {!user ? (
              <Link
                to="/login"
                className="rounded-lg border border-slate-600 bg-[#142436] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 active:scale-95 transition-all"
              >
                Login
              </Link>
            ) : (
              <button
                onClick={logout}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-red-400 active:scale-95 transition-all"
              >
                Keluar
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-300 hover:bg-[#182638] hover:text-white active:scale-95 transition-all"
              aria-label="Toggle Menu"
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0c1929] px-6 py-4 space-y-2">
            <button
              type="button"
              onClick={() => goToSection(null)}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => goToSection('produk')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Produk
            </button>
            <button
              type="button"
              onClick={() => goToSection('tentang')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Tentang Kami
            </button>
            <Link
              to={user ? (user.role === 'admin' || user.role === 'pemilik' ? '/panel/konsultasi' : '/konsultasi') : '/login?from=/konsultasi'}
              state={!user ? { from: '/konsultasi' } : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Konsultasi
            </Link>
            <Link
              to="/pesanan"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Pesanan Saya
            </Link>
            {user ? (
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">{user.nama}</span>
                <button onClick={logout} className="text-[#f87171] font-semibold cursor-pointer">Keluar</button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-slate-200 hover:text-white"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer matching exact mockup */}
      <footer className="mt-auto border-t border-slate-800 bg-[#0c1929] text-white">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xl font-extrabold tracking-wider text-white">TAMA FARM</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed font-normal">
                Pusat budidaya dan pembibitan lobster air tawar terpercaya. Menyediakan produk lobster konsumsi, bibit indukan unggul, dan paket kemitraan budidaya bergaransi.
              </p>
            </div>

            {/* Col 2: Navigasi Cepat */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Navigasi</h4>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li>
                  <button onClick={() => goToSection(null)} className="hover:text-white transition-colors cursor-pointer">
                    Beranda
                  </button>
                </li>
                <li>
                  <button onClick={() => goToSection('produk')} className="hover:text-white transition-colors cursor-pointer">
                    Katalog Produk
                  </button>
                </li>
                <li>
                  <button onClick={() => goToSection('tentang')} className="hover:text-white transition-colors cursor-pointer">
                    Tentang Tama Farm
                  </button>
                </li>
                <li>
                  <Link to="/keranjang" className="hover:text-white transition-colors">
                    Keranjang Belanja
                  </Link>
                </li>
                <li>
                  <Link to="/konsultasi" className="hover:text-white transition-colors">
                    Konsultasi Budidaya
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Hubungi & Lokasi */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Kontak & Lokasi</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Jl. Tik Nibung 2 No.16, Perak Utara, Kec. Pabean Cantian, Kota Surabaya<br />
                <span className="block mt-2">WhatsApp: +62 857-5597-1102</span>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-normal">
            <p>© {new Date().getFullYear()} TAMA FARM. Seluruh hak cipta dilindungi undang-undang.</p>
            <div className="flex items-center gap-4">
              <span>Sistem Budidaya Terstandarisasi</span>
              <span>·</span>
              <span>Kualitas Terjamin</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
