export function orderCodeFromQr(value) {
  if (typeof value !== 'string' || value.length > 100) return null
  const text = value.trim()
  return /^(?:TAMAFARM:ORDER:)?(TF-[A-Z0-9]{12})$/.exec(text)?.[1] ?? null
}
