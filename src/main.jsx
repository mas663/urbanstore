import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, CartProvider, ToastProvider } from './context/AppContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import './index.css';

function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <p className="eyebrow">UrbanStore · Setup</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Supabase belum dikonfigurasi</h1>
      <p className="mt-4 text-mute">Isi variabel berikut di file <code>.env</code> (lokal) atau Environment Variables (Vercel), lalu jalankan ulang:</p>
      <pre className="mt-4 overflow-x-auto bg-ink p-4 text-sm text-paper">{`VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...`}</pre>
      <p className="mt-4 text-sm text-mute">Panduan lengkap ada di README.md bagian "Setup Supabase".</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  supabaseConfigured ? (
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
    {/* Vercel Web Analytics: hitung kunjungan per halaman (tanpa cookie). Aktif hanya di situs Vercel. */}
    <Analytics />
  </StrictMode>
  ) : <SetupNeeded />,
);
