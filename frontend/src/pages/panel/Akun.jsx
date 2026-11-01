import { useState } from 'react'
import { PageHeader } from './PanelLayout'
import { Button, ConfirmDialog, Empty, ErrorNote, Modal, Spinner, TextField } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'

function AkunForm({ item, onSaved, onCancel }) {
  const toast = useToast()
  const [f, setF] = useState({ nama: item?.nama || '', username: item?.username || '', password: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = item ? await api.put(`/admin/${item.id_user}`, f) : await api.post('/admin', f)
      toast(res.message || 'Akun disimpan')
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
      <TextField label="Nama" value={f.nama} onChange={set('nama')} error={errors.nama?.[0]} maxLength={100} autoFocus required />
      <TextField label="Username" value={f.username} onChange={set('username')} error={errors.username?.[0]} minLength={4} maxLength={30} hint="4 sampai 30 karakter: huruf, angka, strip, atau garis bawah" autoComplete="off" required />
      <TextField
        label="Password"
        type="password"
        value={f.password}
        onChange={set('password')}
        error={errors.password?.[0]}
        minLength={6}
        hint={item ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'}
        autoComplete="new-password"
        required={!item}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan akun'}</Button>
      </div>
    </form>
  )
}

export default function Akun() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/admin')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const list = (data || []).filter(
    (u) =>
      u.nama.toLowerCase().includes(q.trim().toLowerCase()) ||
      u.username.toLowerCase().includes(q.trim().toLowerCase())
  )

  async function hapus() {
    setBusy(true)
    try {
      const res = await api.del(`/admin/${deleting.id_user}`)
      toast(res.message || 'Akun dihapus')
      setDeleting(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Akun Admin & Staf"
        subtitle="Kelola akun pengguna yang berwenang mengelola produk, pesanan, dan penawaran."
        action={
          <button
            onClick={() => setEditing('baru')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0c1929] hover:bg-[#182638] active:scale-95 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Tambah Admin</span>
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Empty title="Belum ada akun admin">Buat akun untuk orang yang akan mengelola produk dan kategori.</Empty>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau username..."
                aria-label="Cari admin"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs"
              />
              <svg className="absolute left-3 top-2.5 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan {list.length} dari {data.length} akun
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50/80 font-bold text-slate-700 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-center w-16">No</th>
                    <th className="px-6 py-4 text-center">Nama Lengkap</th>
                    <th className="px-6 py-4 text-center">Username</th>
                    <th className="px-6 py-4 text-center">Peran / Hak Akses</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        Tidak ada akun admin yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    list.map((u, idx) => (
                      <tr key={u.id_user} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
                              {u.nama?.slice(0, 2) || 'AD'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.nama}</p>
                              <p className="text-xs text-slate-400">ID: #{u.id_user}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                          @{u.username}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-700">
                          Admin
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(u)}
                              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(u)}
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && editing !== 'baru' ? 'Ubah akun admin' : 'Tambah akun admin'}>
        {editing && (
          <AkunForm
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
        title="Hapus akun admin?"
        message={deleting && `Akun ${deleting.username} akan dihapus dan langsung keluar dari semua perangkat.`}
        busy={busy}
        onConfirm={hapus}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
