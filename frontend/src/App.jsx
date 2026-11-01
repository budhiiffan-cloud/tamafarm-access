import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import RequireRole from './components/RequireRole'
import { homeFor, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import BuyerOrders from './pages/BuyerOrders'
import BuyerOrderDetail from './pages/BuyerOrderDetail'
import Consultation from './pages/Consultation'
import Akun from './pages/panel/Akun'
import Kategori from './pages/panel/Kategori'
import PanelLayout from './pages/panel/PanelLayout'
import Produk from './pages/panel/Produk'
import Pesanan from './pages/panel/Pesanan'
import Konsultasi from './pages/panel/Konsultasi'
import Dashboard from './pages/panel/Dashboard'
import Penawaran from './pages/panel/Penawaran'
import Laporan from './pages/panel/Laporan'
import Pelanggan from './pages/panel/Pelanggan'

function PanelIndex() {
  const { user } = useAuth()
  return <Navigate to={homeFor(user)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/produk/:id" element={<ProductDetail />} />
        <Route path="/keranjang" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/pesanan" element={<BuyerOrders />} />
        <Route path="/pesanan/:code" element={<BuyerOrderDetail />} />
        <Route
          path="/konsultasi"
          element={
            <RequireRole roles={['pelanggan', 'admin', 'pemilik']}>
              <Consultation />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login defaultRegister={true} />} />

      <Route
        path="/panel"
        element={
          <RequireRole roles={['admin', 'pemilik']}>
            <PanelLayout />
          </RequireRole>
        }
      >
        <Route index element={<PanelIndex />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pelanggan" element={<RequireRole roles={['admin', 'pemilik']}><Pelanggan /></RequireRole>} />
        <Route path="produk" element={<RequireRole roles={['admin']}><Produk /></RequireRole>} />
        <Route path="kategori" element={<RequireRole roles={['admin']}><Kategori /></RequireRole>} />
        <Route path="pesanan" element={<RequireRole roles={['admin']}><Pesanan /></RequireRole>} />
        <Route path="penawaran" element={<RequireRole roles={['admin']}><Penawaran /></RequireRole>} />
        <Route path="konsultasi" element={<RequireRole roles={['admin']}><Konsultasi /></RequireRole>} />
        <Route path="laporan" element={<RequireRole roles={['admin', 'pemilik']}><Laporan /></RequireRole>} />
        <Route path="akun" element={<RequireRole roles={['pemilik']}><Akun /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
