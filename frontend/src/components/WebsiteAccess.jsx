import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { getWebsitePassword, setWebsitePassword } from '../lib/websiteAccess'

export default function WebsiteAccess({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(!!getWebsitePassword())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const stored = getWebsitePassword()
    if (stored) {
      api.get('/website-access')
        .then(() => { if (active) setUnlocked(true) })
        .catch((e) => {
          if (active) {
            setWebsitePassword('')
            setError(e.message)
          }
        })
        .finally(() => { if (active) setChecking(false) })
    }
    const lock = () => { if (active) setUnlocked(false) }
    window.addEventListener('website:locked', lock)
    return () => {
      active = false
      window.removeEventListener('website:locked', lock)
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setChecking(true)
    setError('')
    try {
      await api.get('/website-access', { headers: { 'X-Website-Password': password } })
      setWebsitePassword(password)
      setPassword('')
      setUnlocked(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  if (unlocked) return children

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold text-emerald-700">TAMAFARM</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Akses website terkunci</h1>
        <p className="mt-3 text-sm text-slate-600">Hubungi pemilik proyek untuk meminta password akses website.</p>
        <label htmlFor="website-password" className="mt-6 block text-sm font-medium text-slate-800">Password akses</label>
        <input id="website-password" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} disabled={checking}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-emerald-600" />
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={checking} className="mt-5 w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white disabled:opacity-60">
          {checking ? 'Memeriksa akses…' : 'Buka website'}
        </button>
      </form>
    </main>
  )
}
