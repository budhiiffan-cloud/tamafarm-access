import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function WebsiteAccess({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/website-access')
      .then(() => { if (active) setUnlocked(true) })
      .catch((e) => { if (active) setError(e.message) })
    const lock = () => {
      if (active) {
        setUnlocked(false)
        setError('Website belum diaktifkan. Isi WEBSITE_ACCESS_PASSWORD di backend/.env dengan password dari pemilik proyek.')
      }
    }
    window.addEventListener('website:locked', lock)
    return () => {
      active = false
      window.removeEventListener('website:locked', lock)
    }
  }, [])

  if (unlocked) return children

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold text-emerald-700">TAMAFARM</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{error ? 'Website belum dapat dibuka' : 'Memeriksa aktivasi…'}</h1>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  )
}
