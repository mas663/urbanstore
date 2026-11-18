import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Checkout from './pages/Checkout.jsx';
import Invoice from './pages/Invoice.jsx';
import { Login, MyOrders, NotFound, Register } from './pages/AccountPages.jsx';
// Halaman admin dimuat terpisah (lazy) supaya bundle storefront tetap ringan untuk customer
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Products = lazy(() => import('./pages/admin/Products.jsx'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'));
const Orders = lazy(() => import('./pages/admin/Orders.jsx'));
const Analysis = lazy(() => import('./pages/admin/Analysis.jsx'));

const Loading = () => <div className="container-x py-20"><div className="skeleton h-64" /></div>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      {/* Customer Storefront */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="koleksi" element={<Catalog />} />
        <Route path="produk/:slug" element={<ProductDetail />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pesanan/:code" element={<Invoice />} />
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
    </Suspense>
  );
}
