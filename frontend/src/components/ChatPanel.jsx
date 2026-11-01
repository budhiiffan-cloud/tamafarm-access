import { useEffect, useState } from 'react'
import { Button, ErrorNote, Spinner, TextArea } from './ui'
import { api } from '../lib/api'

export default function ChatPanel({ customerId, token }) {
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let off = false
    setMessages(null)
    async function load() {
      try { const r = await api.get(`/konsultasi/${customerId}`, { headers: token ? { 'X-Chat-Token': token } : {} }); if (!off) { setMessages(r.data); setError('') } }
      catch (err) { if (!off) setError(err.message) }
    }
    load()
    const timer = setInterval(load, 15000)
    return () => { off = true; clearInterval(timer) }
  }, [customerId, token, tick])

  async function send(event) {
    event.preventDefault()
    setBusy(true)
    try { await api.post(`/konsultasi/${customerId}`, { isi_pesan: text }, { headers: token ? { 'X-Chat-Token': token } : {} }); setText(''); setTick((t) => t + 1) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-lg border border-mist bg-white p-5">
      {error && <ErrorNote message={error} />}
      <div className="max-h-[28rem] space-y-3 overflow-y-auto py-4" aria-live="polite">
        {!messages ? !error && <Spinner /> : messages.length ? messages.map((message) => (
          <div key={message.id_konsultasi} className={`max-w-[90%] rounded-md p-3 ${message.pengirim === 'admin' ? 'bg-tank text-foam' : 'ml-auto bg-sand text-tank'}`}>
            <p className="text-xs font-bold">{message.pengirim === 'admin' ? 'Admin' : 'Pembeli'}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{message.isi_pesan}</p>
            <p className="mt-2 text-xs opacity-70">{message.waktu_kirim}</p>
          </div>
        )) : <p className="text-sm text-tank/60">Belum ada pesan. Tanyakan produk, jumlah pembelian, atau pengiriman.</p>}
      </div>
      <form onSubmit={send} className="space-y-3">
        <TextArea label="Pesan" value={text} onChange={(event) => setText(event.target.value)} required maxLength={4000} />
        <div className="flex justify-between gap-3"><Button variant="ghost" type="button" onClick={() => setTick((t) => t + 1)}>Perbarui chat</Button><Button disabled={busy || !text.trim() || messages === null} type="submit">{busy ? 'Mengirim...' : 'Kirim pesan'}</Button></div>
      </form>
    </div>
  )
}
