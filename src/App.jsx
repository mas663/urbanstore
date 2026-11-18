import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Checkout from './pages/Checkout.jsx';
import Invoice from './pages/Invoice.jsx';
import { Login, MyOrders, NotFound, OrderLookup, Register } from './pages/AccountPages.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Products from './pages/admin/Products.jsx';
import ProductForm from './pages/admin/ProductForm.jsx';
import Orders from './pages/admin/Orders.jsx';
import Analysis from './pages/admin/Analysis.jsx';

export default function App() {
  return (
    <Routes>
      {/* Customer Storefront */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="koleksi" element={<Catalog />} />
        <Route path="produk/:slug" element={<ProductDetail />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pesanan/:code" element={<Invoice />} />
        <Route path="cek-pesanan" element={<OrderLookup />} />
        <Route path="login" element={<Login />} />
        <Route path="daftar" element={<Register />} />
        <Route path="akun/pesanan" element={<MyOrders />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Store Admin */}
      <Route path="admin/login" element={<Login admin />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="produk" element={<Products />} />
        <Route path="produk/baru" element={<ProductForm />} />
        <Route path="produk/:id" element={<ProductForm />} />
        <Route path="pesanan" element={<Orders />} />
        <Route path="analisis" element={<Analysis />} />
      </Route>
    </Routes>
  );
}
