import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'

export default function Konsultasi() {
  const [page, setPage] = useState(1)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [busy, setBusy] = useState(false)
  const chatEndRef = useRef(null)

  const loadThreads = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get(`/pengelolaan/konsultasi?page=${page}`)
      const items = res?.data?.data?.data || res?.data?.data || res?.data || []
      const threadList = Array.isArray(items) ? items : []
      setThreads(threadList)
      setError(null)

      // Pertahankan percakapan yang sedang dibuka atau pilih yang pertama
      setSelected((prev) => {
        if (!prev && threadList.length > 0) {
          return threadList[0]
        }
        if (prev) {
          const updated = threadList.find((t) => t.id_pelanggan === prev.id_pelanggan)
          return updated || prev
        }
        return prev
      })
    } catch (err) {
      if (!silent) setError(err.message || 'Gagal memuat percakapan.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadMessages = async (id) => {
    if (!id) return
    try {
      const res = await api.get(`/konsultasi/${id}`)
      const list = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []))
      if (Array.isArray(list)) {
        setMessages((prev) => {
          // Hanya perbarui jika data berbeda agar tidak memicu flicker/scroll berulang
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev
          return list
        })
      }
    } catch {
      //
    }
  }

  // Muat pertama kali
  useEffect(() => {
    loadThreads(false)
  }, [page])

  // Muat pesan saat memilih thread lain
  useEffect(() => {
    if (selected?.id_pelanggan) {
      loadMessages(selected.id_pelanggan)
    }
  }, [selected?.id_pelanggan])

  // Polling thread list dan riwayat chat secara hening di latar belakang (tanpa efek kedip/loading)
  useEffect(() => {
    const timer = setInterval(() => {
      loadThreads(true)
      if (selected?.id_pelanggan) {
        loadMessages(selected.id_pelanggan)
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [selected?.id_pelanggan, page])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendReply = async (e) => {
    e.preventDefault()
    const text = replyText.trim()
    if (!text || busy || !selected?.id_pelanggan) return
    setBusy(true)
    setReplyText('')

    setMessages((prev) => [
      ...prev,
      { id_konsultasi: Date.now(), pengirim: 'admin', isi_pesan: text },
    ])

    try {
      await api.post(`/konsultasi/${selected.id_pelanggan}`, {
        isi_pesan: text,
        pengirim: 'admin',
      })
      await loadMessages(selected.id_pelanggan)
      loadThreads(true)
    } catch (err) {
      console.error('Gagal membalas pesan:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Pusat Konsultasi & Chat
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Layanan tanya jawab langsung antara calon pembeli / pelanggan dan Admin Tama Farm.
          </p>
        </div>
        <button
          onClick={() => loadThreads(false)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
        >
          Perbarui Percakapan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Threads list */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Daftar Percakapan Masuk
          </h2>

          {loading ? (
            <p className="py-8 text-center text-xs text-slate-400">Memuat percakapan...</p>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : threads.length ? (
            <div className="space-y-2">
              {threads.map((thread) => {
                const isCurrent = selected?.id_pelanggan === thread.id_pelanggan
                return (
                  <button
                    key={thread.id_pelanggan}
                    onClick={() => setSelected(thread)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-slate-800 bg-slate-50 shadow-xs'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-slate-900 text-sm">{thread.nama}</span>
                      <span className="text-[11px] text-slate-400">
                        {thread.waktu_kirim ? String(thread.waktu_kirim).slice(11, 16) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {thread.pengirim === 'admin' ? (
                        <span className="text-slate-400 font-medium">Anda: </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Pelanggan: </span>
                      )}
                      {thread.isi_pesan}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada pesan masuk.</p>
          )}
        </div>

        {/* Right: Active Chat Window */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col h-[560px]">
          {selected ? (
            <>
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selected.nama}</h3>
                  <span className="text-xs text-slate-400">Pelanggan / Calon Pembeli</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  Online
                </span>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1">
                {messages.map((m, i) => {
                  const isAdmin = m.pengirim === 'admin'
                  return (
                    <div
                      key={m.id_konsultasi || i}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs sm:text-sm max-w-[80%] leading-relaxed ${
                          isAdmin
                            ? 'bg-[#fdeee7] text-slate-800 rounded-tr-sm ml-auto'
                            : 'bg-[#ecf3f4] text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        {m.isi_pesan}
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={sendReply} className="pt-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ketik balasan admin..."
                  disabled={busy}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !replyText.trim()}
                  className="rounded-xl bg-[#dc4c3e] hover:bg-[#c93f31] px-6 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Kirim
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Pilih percakapan dari daftar di sebelah kiri untuk melihat pesan.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
