import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const CART_STORAGE_KEY = 'tamafarm_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage disabled/error
    }
  }, [items])

  const addToCart = (product, quantity = 1) => {
    const qtyToAdd = Math.max(1, Number(quantity) || 1)
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id_produk === product.id_produk)
      if (idx >= 0) {
        const copy = [...prev]
        const maxStok = Number(product.stok) || 9999
        const newQty = copy[idx].jumlah + qtyToAdd
        copy[idx] = {
          ...copy[idx],
          jumlah: Math.min(newQty, maxStok),
        }
        return copy
      }
      return [
        ...prev,
        {
          id_produk: product.id_produk,
          nama_produk: product.nama_produk,
          satuan: product.satuan || 'kg',
          ukuran: product.ukuran || '',
          harga: Number(product.harga) || 0,
          gambar_url: product.gambar_url || null,
          stok: Number(product.stok) || 0,
          moq_restoran: Number(product.moq_restoran) || 1,
          moq_luar_negeri: Number(product.moq_luar_negeri) || 1,
          jumlah: qtyToAdd,
        },
      ]
    })
  }

  const updateQuantity = (id_produk, newQty) => {
    const q = Number(newQty)
    if (q <= 0) {
      removeFromCart(id_produk)
      return
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id_produk === id_produk) {
          const maxStok = i.stok || 9999
          return { ...i, jumlah: Math.min(q, maxStok) }
        }
        return i
      })
    )
  }

  const removeFromCart = (id_produk) => {
    setItems((prev) => prev.filter((i) => i.id_produk !== id_produk))
  }

  const clearCart = () => {
    setItems([])
  }

  const totalCount = items.reduce((sum, i) => sum + (Number(i.jumlah) || 1), 0)
  const totalItemsCount = items.length
  const totalPrice = items.reduce((sum, i) => sum + (Number(i.harga) || 0) * (Number(i.jumlah) || 1), 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalCount,
        totalItemsCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)

