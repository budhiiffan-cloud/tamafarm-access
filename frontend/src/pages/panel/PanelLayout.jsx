import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PanelLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const links =
    user?.role === 'pemilik'
      ? [
          ['/panel/dashboard', 'Dashboard'],
          ['/panel/pelanggan', 'Pelanggan'],
          ['/panel/laporan', 'Laporan'],
          ['/panel/akun', 'Akun Admin'],
        ]
      : [
          ['/panel/dashboard', 'Dashboard'],
          ['/panel/produk', 'Produk'],
          ['/panel/pelanggan', 'Pelanggan'],
          ['/panel/kategori', 'Kategori Produk'],
          ['/panel/pesanan', 'Pesanan'],
          ['/panel/penawaran', 'Penawaran'],
          ['/panel/konsultasi', 'Chat'],
          ['/panel/laporan', 'Laporan'],
        ]

  return (
    <div className="min-h-screen bg-[#f6f8fb] print:bg-white lg:flex antialiased selection:bg-slate-800 selection:text-white">
      {/* Mobile Topbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0c1929] px-6 py-4 lg:hidden print:hidden">
        <div>
          <h1 className="text-lg font-bold tracking-wider text-white">TAMA FARM</h1>
          <p className="text-xs text-slate-400 capitalize">{user?.role === 'pemilik' ? 'Pemilik' : 'Admin'}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg p-2 text-slate-300 hover:bg-[#182638] hover:text-white transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden print:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Layout Matching Exact Mockup */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0c1929] transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="px-6 pt-8 pb-7 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-white">TAMA FARM</h1>
            <p className="text-xs text-slate-400 mt-1 capitalize font-medium">
              {user?.role === 'pemilik' ? 'Pemilik' : 'Admin'}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#182638] hover:text-white lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto" aria-label="Menu panel">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/panel/dashboard'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#182638] text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:bg-[#132032] hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom logout section */}
        <div className="p-6 pt-3 mt-auto">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-1 py-2 text-sm font-medium text-[#f87171] hover:text-red-400 transition-colors cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-10 lg:px-12 overflow-y-auto print:p-0 print:m-0 print:overflow-visible">
        <div className="mx-auto max-w-[1360px] print:max-w-none print:w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 font-normal">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
