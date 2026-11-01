import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dollar, qty, rupiah, getGambarUrl } from '../lib/format'

export function ProductImage({ produk, className = '' }) {
  const [hasError, setHasError] = useState(false)
  const imageUrl = getGambarUrl(produk?.gambar_url)

  return imageUrl && !hasError ? (
    <img
      src={imageUrl}
      alt={produk.nama_produk}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  ) : (
    <div className={`flex items-center justify-center bg-sand text-sm text-tank/50 ${className}`}>
      Belum ada foto
    </div>
  )
}

export function Price({ produk, large }) {
  const unit = produk.satuan === 'kg' ? '/ kg' : '/ paket'
  return (
    <div>
      <p className={`font-display font-extrabold ${large ? 'text-3xl' : 'text-xl'}`}>
        {rupiah(produk.harga)} <span className="text-sm font-medium text-tank/60">{unit}</span>
      </p>
      {produk.harga_usd != null && (
        <p className="text-sm text-tank/70">{dollar(produk.harga_usd)} {unit} untuk pembeli luar negeri</p>
      )}
    </div>
  )
}

export default function ProductCard({ produk }) {
  const habis = Number(produk.stok) <= 0
  return (
    <Link
      to={`/produk/${produk.id_produk}`}
      className="group flex flex-col overflow-hidden rounded-md border border-mist bg-white transition-colors hover:border-tank"
    >
      <ProductImage produk={produk} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold text-kelp">{produk.kategori?.nama_kategori}</p>
          <h3 className="font-display text-lg font-bold leading-snug group-hover:underline underline-offset-4">
            {produk.nama_produk}
          </h3>
          {produk.ukuran && <p className="text-sm text-tank/70">Ukuran {produk.ukuran}</p>}
        </div>
        <Price produk={produk} />
        <p className={`mt-auto text-sm font-semibold ${habis ? 'text-shell-dark' : 'text-tank/70'}`}>
          {habis ? 'Stok habis' : `Stok ${qty(produk.stok)} ${produk.satuan}`}
        </p>
      </div>
    </Link>
  )
}
