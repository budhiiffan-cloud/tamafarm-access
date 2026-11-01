import { useState } from 'react'
import { PageHeader } from './PanelLayout'
import { Button, ConfirmDialog, Empty, ErrorNote, Modal, Spinner, TextArea, TextField } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'

function KategoriForm({ item, onSaved, onCancel }) {
  const toast = useToast()
  const [nama, setNama] = useState(item?.nama_kategori || '')
  const [deskripsi, setDeskripsi] = useState(item?.deskripsi || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const body = { nama_kategori: nama, deskripsi: deskripsi || null }
    try {
      const res = item ? await api.put(`/kategori/${item.id_kategori}`, body) : await api.post('/kategori', body)
      toast(res.message || 'Kategori disimpan')
      onSaved()
    } catch (e2) {
      setErrors(e2.errors || {})
      toast(e2.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField label="Nama kategori" value={nama} onChange={(e) => setNama(e.target.value)} error={errors.nama_kategori?.[0]} maxLength={100} autoFocus required />
      <TextArea label="Deskripsi" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} error={errors.deskripsi?.[0]} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan kategori'}</Button>
      </div>
    </form>
  )
}

export default function Kategori() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/kategori')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const list = (data || []).filter((k) =>
    k.nama_kategori.toLowerCase().includes(q.trim().toLowerCase())
  )

  async function hapus() {
    setBusy(true)
    try {
      const res = await api.del(`/kategori/${deleting.id_kategori}`)
      toast(res.message || 'Kategori dihapus')
      setDeleting(null)
      reload()
    } catch (e) {
      toast(e.message, 'error') // contoh: "Kategori masih memiliki produk"
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Kategori Produk"
        subtitle="Kelola kelompok dan klasifikasi produk pada katalog."
        action={
          <button
            onClick={() => setEditing('baru')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0c1929] hover:bg-[#182638] active:scale-95 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Tambah Kategori</span>
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Empty title="Belum ada kategori">Tambahkan kategori pertama, misalnya Lobster Hidup.</Empty>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kategori..."
                aria-label="Cari kategori"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs"
              />
              <svg className="absolute left-3 top-2.5 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan {list.length} dari {data.length} kategori
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50/80 font-bold text-slate-700 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-center w-16">No</th>
                    <th className="px-6 py-4 text-center">Nama Kategori</th>
                    <th className="px-6 py-4 text-center">Deskripsi</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                        Tidak ada kategori yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    list.map((k, idx) => (
                      <tr key={k.id_kategori} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{k.nama_kategori}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 line-clamp-2">{k.deskripsi || '-'}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(k)}
                              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(k)}
                              className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && editing !== 'baru' ? 'Ubah kategori' : 'Tambah kategori'}>
        {editing && (
          <KategoriForm
            item={editing === 'baru' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              reload()
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus kategori?"
        message={deleting && `Kategori ${deleting.nama_kategori} akan dihapus. Kategori yang masih punya produk tidak bisa dihapus.`}
        busy={busy}
        onConfirm={hapus}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
