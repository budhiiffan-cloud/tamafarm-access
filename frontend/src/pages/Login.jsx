import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Login({ defaultRegister = false }) {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Mode: 'login' | 'register' | 'forgot'
  const initialMode = defaultRegister || location.pathname === '/register' ? 'register' : 'login'
  const [mode, setMode] = useState(initialMode)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nama, setNama] = useState('')
  const [noHp, setNoHp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const searchParams = new URLSearchParams(location.search)
  const fromPath = location.state?.from || searchParams.get('from') || searchParams.get('redirect')

  const getDestination = (u) => {
    if (fromPath) {
      if (fromPath === '/konsultasi' && (u.role === 'admin' || u.role === 'pemilik')) {
        return '/panel/konsultasi'
      }
      return fromPath
    }
    return homeFor(u)
  }

  if (user) return <Navigate to={getDestination(user)} replace />

  const isFromConsultation = fromPath === '/konsultasi'

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccessMsg('')
    try {
      const u = await login(username, password)
      navigate(getDestination(u), { replace: true })
    } catch (err) {
      setError(err.message || 'Username atau password salah.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.')
      return
    }
    setBusy(true)
    setError('')
    setSuccessMsg('')
    try {
      const u = await register(nama, username, password, noHp)
      navigate(getDestination(u), { replace: true })
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan akun. Silakan periksa kembali data Anda.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.')
      return
    }
    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.')
      return
    }

    setBusy(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.post('/lupa-password', {
        username: username.trim(),
        no_hp: noHp.trim(),
        password_baru: newPassword,
      })
      setSuccessMsg(res.message || 'Kata sandi berhasil diubah! Silakan masuk dengan kata sandi baru Anda.')
      setPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setMode('login')
    } catch (err) {
      setError(err.message || 'Gagal mengatur ulang kata sandi. Periksa username dan data Anda.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white antialiased">
      {/* Left Column: Brand & Hero Graphic */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#0c1929] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        <div>
          <Link to="/" className="text-2xl font-extrabold tracking-wider text-white">
            TAMA FARM
          </Link>
          <div className="mt-16 max-w-lg">
            <span className="text-xs font-semibold tracking-wider text-[#dc4c3e] uppercase">
              Sistem Informasi Manajemen
            </span>
            <h2 className="mt-3 text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Budidaya dan Penjualan Lobster Berbasis Web
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Platform terintegrasi untuk pengelolaan data produk lobster, monitoring stok budidaya, pelayanan konsultasi, hingga pemrosesan pesanan dan transaksi online.
            </p>
          </div>
        </div>

        {/* Tambak / Lobster Graphic Card */}
        <div className="rounded-2xl bg-[#14283c] h-64 w-full max-w-lg flex items-center justify-center border border-slate-700/60 shadow-inner my-8">
          <div className="text-center px-6">
            <span className="text-4xl block mb-2">🦞</span>
            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              TAMA FARM · PUSAT BUDIDAYA LOBSTER AIR TAWAR
            </span>
            <p className="text-xs text-slate-400 mt-1">Surabaya, Jawa Timur</p>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} TAMA FARM. Hak Cipta Dilindungi.
        </div>
      </div>

      {/* Right Column: Form (Login, Register, or Forgot Password) */}
      <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-12 bg-[#f6f8fb] lg:bg-white">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-sm lg:shadow-none border border-slate-100 lg:border-none">
          <div className="lg:hidden mb-6">
            <Link to="/" className="text-xl font-extrabold tracking-wider text-slate-900">
              TAMA FARM
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {mode === 'register'
              ? 'Daftar Akun Baru'
              : mode === 'forgot'
              ? 'Lupa Kata Sandi'
              : 'Masuk ke Akun'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            {mode === 'register'
              ? 'Lengkapi data berikut untuk membuat akun pelanggan Tama Farm.'
              : mode === 'forgot'
              ? 'Masukkan username dan buat kata sandi baru untuk akun Anda.'
              : 'Silakan masukkan username dan password untuk mengakses akun Anda.'}
          </p>

          {/* Banner notifikasi jika diarahkan dari fitur Konsultasi */}
          {isFromConsultation && mode === 'login' && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2">
              <span className="text-base leading-none">💬</span>
              <span>
                <strong>Login Diperlukan:</strong> Silakan masuk atau daftar akun baru terlebih dahulu untuk melanjutkan sesi konsultasi dengan admin.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
              {successMsg}
            </div>
          )}

          {mode === 'login' && (
            /* ================= FORM LOGIN ================= */
            <form onSubmit={handleLogin} autoComplete="off" className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  name="login_username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot')
                      setError('')
                      setSuccessMsg('')
                    }}
                    className="text-xs font-semibold text-[#dc4c3e] hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="login_password"
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck="false"
                    style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-3 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-6 w-full rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:scale-95 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Memproses...' : 'Masuk'}
              </button>

              <div className="mt-6 text-center text-xs text-slate-600">
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError('')
                    setSuccessMsg('')
                  }}
                  className="font-semibold text-[#dc4c3e] hover:underline cursor-pointer"
                >
                  Daftar Sekarang
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            /* ================= FORM REGISTER ================= */
            <form onSubmit={handleRegister} autoComplete="off" className="mt-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Pilih username unik"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="text"
                    name="reg_password"
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck="false"
                    style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type="text"
                    name="reg_confirm_password"
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck="false"
                    style={{ WebkitTextSecurity: showConfirmPassword ? 'none' : 'disc' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password di atas"
                    required
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:scale-95 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Mendaftarkan...' : 'Daftar Sekarang'}
              </button>

              <div className="mt-6 text-center text-xs text-slate-600">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccessMsg('')
                  }}
                  className="font-semibold text-[#dc4c3e] hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            /* ================= FORM LUPA KATA SANDI ================= */
            <form onSubmit={handleResetPassword} autoComplete="off" className="mt-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username Akun</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. WhatsApp / HP Terdaftar <span className="text-slate-400 font-normal">(Khusus akun pelanggan)</span>
                </label>
                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Untuk admin / pemilik, kolom No. HP boleh dikosongkan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type="text"
                    name="new_pwd_input"
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck="false"
                    style={{ WebkitTextSecurity: showNewPassword ? 'none' : 'disc' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type="text"
                    name="confirm_new_pwd_input"
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck="false"
                    style={{ WebkitTextSecurity: showConfirmNewPassword ? 'none' : 'disc' }}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-2.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showConfirmNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                    tabIndex={-1}
                  >
                    {showConfirmNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] active:scale-95 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>

              <div className="mt-6 text-center text-xs text-slate-600">
                Ingat kata sandi Anda?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccessMsg('')
                  }}
                  className="font-semibold text-[#dc4c3e] hover:underline cursor-pointer"
                >
                  Kembali ke Masuk
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
              ← Kembali ke Beranda Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
