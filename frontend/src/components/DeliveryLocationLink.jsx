export default function DeliveryLocationLink({ shipping }) {
  if (shipping?.latitude == null || shipping?.longitude == null || shipping.latitude === '' || shipping.longitude === '') return null
  const latitude = Number(shipping.latitude)
  const longitude = Number(shipping.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  const query = encodeURIComponent(`${latitude},${longitude}`)
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-slate-500">Titik pengiriman: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
      <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-emerald-700 underline">
        Buka lokasi pengiriman di Maps
      </a>
    </div>
  )
}
