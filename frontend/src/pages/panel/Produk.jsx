import { useState, useRef } from 'react'
import { PageHeader } from './PanelLayout'
import { ProductImage } from '../../components/ProductCard'
import { Button, ConfirmDialog, Empty, ErrorNote, Modal, Select, Spinner, TextArea, TextField } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { qty, rupiah, getGambarUrl } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const FIELDS = ['id_kategori', 'nama_produk', 'satuan', 'deskripsi', 'ukuran', 'harga', 'harga_usd', 'stok', 'moq_restoran', 'moq_luar_negeri']

const initial = (item) =>
  Object.fromEntries(FIELDS.map((k) => [k, item ? (item[k] ?? '') : k === 'satuan' ? 'kg' : '']))

function ProdukForm({ item, kategori, onSaved, onCancel }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [f, setF] = useState(() => initial(item))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(() => getGambarUrl(item?.gambar_url) || null)
  const [hapusFoto, setHapusFoto] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isKg = f.satuan === 'kg'
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const err = (k) => errors[k]?.[0]

  function pickFile(e) {
    const picked = e.target.files?.[0]
    if (!picked) return

    // Validasi batas ukuran file di browser (maksimal 10 MB)
    if (picked.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, gambar: ['Ukuran foto maksimal 10 MB.'] }))
      toast('Ukuran foto terlalu besar (maksimal 10 MB)', 'error')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setErrors((prev) => {
      const copy = { ...prev }
      delete copy.gambar
      return copy
    })
    setFile(picked)
    setHapusFoto(false)
    setPreview(URL.createObjectURL(picked))
  }

  function buangFoto() {
    setFile(null)
    setPreview(null)
    setHapusFoto(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const fd = new FormData()
    const keys = ['id_kategori', 'nama_produk', 'satuan', 'deskripsi', 'ukuran', 'harga', 'stok']
    if (isKg) keys.push('harga_usd', 'moq_restoran', 'moq_luar_negeri')
    keys.forEach((k) => fd.append(k, f[k] ?? ''))

    if (hapusFoto) {
      fd.append('hapus_foto', '1')
    } else if (file) {
      fd.append('gambar', file)
    }

    try {
      let res
      if (item) {
        fd.append('_method', 'PUT')
        res = await api.postForm(`/produk/${item.id_produk}`, fd)
      } else {
        res = await api.postForm('/produk', fd)
      }
      toast(res.message || 'Produk disimpan')
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Kategori" value={f.id_kategori} onChange={set('id_kategori')} error={err('id_kategori')} required>
          <option value="">Pilih kategori</option>
          {kategori.map((k) => (
            <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>
          ))}
        </Select>
        <Select label="Satuan" value={f.satuan} onChange={set('satuan')} error={err('satuan')}>
          <option value="kg">Per kg (lobster hidup)</option>
          <option value="paket">Paket (kemitraan)</option>
        </Select>
      </div>

      <TextField label="Nama produk" value={f.nama_produk} onChange={set('nama_produk')} error={err('nama_produk')} maxLength={100} required />
      <TextField label="Ukuran" value={f.ukuran} onChange={set('ukuran')} error={err('ukuran')} maxLength={50} hint="Contoh: 200-300 gram per ekor" />
      <TextArea label="Deskripsi" value={f.deskripsi} onChange={set('deskripsi')} error={err('deskripsi')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Harga (Rp)" type="number" min="0" step="1" value={f.harga} onChange={set('harga')} error={err('harga')} required />
        <TextField label="Stok" type="number" min="0" step="0.01" value={f.stok} onChange={set('stok')} error={err('stok')} required />
      </div>

      {isKg && (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Harga (USD)" type="number" min="0" step="0.01" value={f.harga_usd} onChange={set('harga_usd')} error={err('harga_usd')} hint="Opsional" />
          <TextField label="Min. order restoran (kg)" type="number" min="1" step="0.01" value={f.moq_restoran} onChange={set('moq_restoran')} error={err('moq_restoran')} required />
          <TextField label="Min. order luar negeri (kg)" type="number" min="1" step="0.01" value={f.moq_luar_negeri} onChange={set('moq_luar_negeri')} error={err('moq_luar_negeri')} required />
        </div>
      )}

      <div>
        <p className="text-sm font-semibold">Foto produk</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Pratinjau foto"
                className="h-20 w-28 rounded-md object-cover border border-mist shadow-xs"
              />
              <button
                type="button"
                onClick={buangFoto}
                className="absolute -top-2 -right-2 bg-shell hover:bg-shell-dark text-white rounded-full p-1 shadow transition-colors"
                title="Hapus foto"
                aria-label="Hapus foto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-md bg-sand text-xs text-tank/50 border border-mist">
              Belum ada
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*, .jpg, .jpeg, .png, .webp"
              onChange={pickFile}
              className="text-sm text-tank file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-tank/10 hover:file:bg-tank/20 cursor-pointer"
            />
            <p className="mt-1 text-xs text-tank/60">
              Format JPG, PNG, atau WebP, maksimal 10 MB.{item && ' Kosongkan untuk mempertahankan foto lama.'}
            </p>
            {err('gambar') && <p className="mt-1 text-xs font-medium text-shell-dark">{err('gambar')}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan produk'}</Button>
      </div>
    </form>
  )
}

export default function Produk() {
  const toast = useToast()
  const produk = useFetch('/produk')
  const kategori = useFetch('/kategori')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // null | 'baru' | item
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const list = (produk.data || []).filter((p) => p.nama_produk.toLowerCase().includes(q.trim().toLowerCase()))
  const noKategori = kategori.data && kategori.data.length === 0

  async function hapus() {
    setBusy(true)
    try {
      const res = await api.del(`/produk/${deleting.id_produk}`)
      toast(res.message || 'Produk dihapus')
      setDeleting(null)
      produk.reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Produk"
        subtitle="Kelola katalog produk lobster konsumsi dan paket kemitraan tambak."
        action={
          <button
            onClick={() => setEditing('baru')}
            disabled={noKategori || !kategori.data}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0c1929] hover:bg-[#182638] active:scale-95 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Tambah Produk</span>
          </button>
        }
      />

      {noKategori && (
        <div className="mb-6"><Empty title="Buat kategori dulu">Produk harus punya kategori. Tambahkan lewat menu Kategori.</Empty></div>
      )}

      {produk.loading ? (
        <Spinner />
      ) : produk.error ? (
        <ErrorNote message={produk.error} onRetry={produk.reload} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama produk..."
                aria-label="Cari nama produk"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs"
              />
              <svg className="absolute left-3 top-2.5 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan {list.length} dari {produk.data?.length || 0} produk
            </p>
          </div>

          {list.length === 0 ? (
            <Empty title={produk.data.length ? 'Tidak ada produk yang cocok' : 'Belum ada produk'} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50/80 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 text-center">Produk</th>
                      <th className="px-6 py-4 text-center">Kategori</th>
                      <th className="px-6 py-4 text-center">Harga Satuan</th>
                      <th className="px-6 py-4 text-center">Stok</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {list.map((p) => (
                      <tr key={p.id_produk} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ProductImage produk={p} className="h-12 w-16 shrink-0 rounded-lg text-[10px] border border-slate-100 object-cover" />
                            <div>
                              <p className="font-bold text-slate-900">{p.nama_produk}</p>
                              {p.ukuran && <p className="text-xs text-slate-500 mt-0.5">{p.ukuran}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-700">
                          {p.kategori?.nama_kategori || '-'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900">
                          {rupiah(p.harga)} <span className="text-xs font-normal text-slate-500">/ {p.satuan}</span>
                        </td>
                        <td className={`px-6 py-4 text-center text-sm ${Number(p.stok) <= 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                          {Number(p.stok) <= 0 ? 'Habis' : `${qty(p.stok)} ${p.satuan}`}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(p)}
                              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(p)}
                              className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && editing !== 'baru' ? 'Ubah produk' : 'Tambah produk'} wide>
        {editing && (
          <ProdukForm
            item={editing === 'baru' ? null : editing}
            kategori={kategori.data || []}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              produk.reload()
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus produk?"
        message={deleting && `${deleting.nama_produk} akan dihapus permanen beserta fotonya.`}
        busy={busy}
        onConfirm={hapus}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
