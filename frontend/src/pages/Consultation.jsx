import { useState, useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Consultation() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} state={{ from: location.pathname }} replace />
  }

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const chatEndRef = useRef(null)

  // Otomatis sambungkan sesi chat ke admin saat halaman dibuka
  useEffect(() => {
    let active = true

    // Dapatkan token/id dari localStorage jika ada
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem('tamafarm_guest_chat'))
    } catch {
      saved = null
    }

    const initChat = async () => {
      try {
        const res = await api.post('/konsultasi/mulai', {})
        if (active) {
          const sessionData = res.data?.data || res.data || res
          setSession(sessionData)
          localStorage.setItem('tamafarm_guest_chat', JSON.stringify(sessionData))
          await loadMessages(sessionData.id_pelanggan, sessionData.token_konsultasi)
        }
      } catch (err) {
        if (active) {
          if (saved?.id_pelanggan) {
            setSession(saved)
            loadMessages(saved.id_pelanggan, saved.token_konsultasi)
          } else {
            setErrorMsg('Tidak dapat menghubungkan percakapan ke server. Silakan coba lagi.')
          }
        }
      }
    }

    initChat()

    return () => {
      active = false
    }
  }, [user])

  const loadMessages = async (customerId, token) => {
    if (!customerId) return
    try {
      const res = await api.get(`/konsultasi/${customerId}`, {
        headers: token ? { 'X-Chat-Token': token } : {},
      })
      const list = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []))

      if (Array.isArray(list)) {
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev
          return list
        })
      }
    } catch (err) {
      //
    }
  }

  // Polling pesan otomatis setiap 2 detik agar balasan admin langsung muncul di layar pelanggan
  useEffect(() => {
    if (!session?.id_pelanggan) return
    const timer = setInterval(() => {
      loadMessages(session.id_pelanggan, session.token_konsultasi)
    }, 2000)
    return () => clearInterval(timer)
  }, [session])

  // Scroll otomatis ke pesan terbawah
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (messageText) => {
    const textToSend = (messageText || text).trim()
    if (!textToSend || busy) return

    setBusy(true)
    setText('')
    setErrorMsg('')

    let currentSession = session
    if (!currentSession?.id_pelanggan) {
      try {
        const res = await api.post('/konsultasi/mulai', {})
        currentSession = res.data?.data || res.data || res
        setSession(currentSession)
      } catch (err) {
        setErrorMsg('Gagal menyambungkan sesi chat ke admin.')
        setBusy(false)
        return
      }
    }

    // Tampilkan pesan pengguna di UI secara langsung
    const tempUserMsg = {
      id_konsultasi: Date.now(),
      pengirim: 'pelanggan',
      isi_pesan: textToSend,
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      await api.post(
        `/konsultasi/${currentSession.id_pelanggan}`,
        { isi_pesan: textToSend, pengirim: 'pelanggan' },
        { headers: currentSession.token_konsultasi ? { 'X-Chat-Token': currentSession.token_konsultasi } : {} }
      )
      await loadMessages(currentSession.id_pelanggan, currentSession.token_konsultasi)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim pesan ke admin.')
    } finally {
      setBusy(false)
    }
  }

  const handleQuickTopic = (topic) => {
    if (topic === 'MOQ Produk') {
      sendMessage('Berapa minimal pembelian (MOQ) produk lobster?')
    } else if (topic === 'Ketersediaan Stok') {
      sendMessage('Bagaimana ketersediaan stok lobster air tawar hari ini?')
    } else if (topic === 'Estimasi Ongkir') {
      sendMessage('Berapa estimasi ongkir pengiriman lobster hidup?')
    } else if (topic === 'Status Pesanan') {
      sendMessage('Bagaimana cara mengecek status pesanan saya?')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Konsultasi
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Tanyakan stok, ukuran, MOQ, ongkir, atau pesanan kepada admin.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Main Two Columns matching Image 2 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chat Window */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] lg:col-span-8 flex flex-col h-[560px]">
          {/* Card Header */}
          <div className="mb-4 pb-3 border-b border-slate-50">
            <h2 className="text-base font-bold text-slate-900">Admin TAMA FARM</h2>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {!messages.some((m) => m.pengirim === 'admin' && m.isi_pesan?.includes('Selamat datang')) && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl px-5 py-3.5 text-sm leading-relaxed max-w-[85%] sm:max-w-[75%] bg-[#ecf3f4] text-slate-800 rounded-tl-sm">
                  Halo! Selamat datang di layanan konsultasi Tama Farm. Ada yang bisa kami bantu seputar budidaya atau pemesanan lobster?
                </div>
              </div>
            )}
            {messages.map((msg, index) => {
              const isAdmin = msg.pengirim === 'admin'
              return (
                <div
                  key={msg.id_konsultasi || index}
                  className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed max-w-[85%] sm:max-w-[75%] ${
                      isAdmin
                        ? 'bg-[#ecf3f4] text-slate-800 rounded-tl-sm'
                        : 'bg-[#fdeee7] text-slate-800 rounded-tr-sm ml-auto'
                    }`}
                  >
                    {msg.isi_pesan}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="mt-4 pt-3 flex gap-3 items-center"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={busy}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-colors"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-7 py-3 text-sm font-semibold text-white transition-colors shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Mengirim...' : 'Kirim'}
            </button>
          </form>
        </div>

        {/* Right Column: Informasi Cepat */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] lg:col-span-4">
          <h2 className="text-base font-bold text-slate-900 mb-6">Informasi Cepat</h2>

          <div className="space-y-6">
            {[
              'MOQ Produk',
              'Ketersediaan Stok',
              'Estimasi Ongkir',
              'Status Pesanan',
            ].map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleQuickTopic(topic)}
                className="w-full text-left py-1 text-sm font-semibold text-slate-800 hover:text-[#dc4c3e] transition-colors cursor-pointer group flex items-center justify-between"
              >
                <span>{topic}</span>
                <span className="text-slate-300 group-hover:text-[#dc4c3e] text-xs transition-colors">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
