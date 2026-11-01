const KEY = 'tamafarm_guest_orders'

export function guestOrders() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(items) ? items.filter((item) => typeof item.code === 'string' && typeof item.token === 'string') : []
  } catch {
    return []
  }
}

export function rememberOrder(code, token) {
  if (!token) return
  localStorage.setItem(KEY, JSON.stringify([{ code, token }, ...guestOrders().filter((item) => item.code !== code)].slice(0, 50)))
}

export const orderHeaders = (token) => ({ headers: token ? { 'X-Order-Token': token } : {} })
export const statusLabel = (status) => (status || '').replaceAll('_', ' ')
