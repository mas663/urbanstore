import { cleanAiText } from './format.js';

/* Laporan Analisis Penjualan (PDF) — untuk admin / atasan.
   Isi: sampul, ringkasan angka (KPI), grafik batang, tabel stok, lalu analisis & rekomendasi AI.
   jsPDF dimuat saat dibutuhkan supaya bundle halaman admin tetap ringan. */

const SECTION_TITLES = ['RINGKASAN PERFORMA', 'INSIGHT UTAMA', 'STRATEGI PROMO', 'REKOMENDASI BUNDLING', 'PRIORITAS RESTOCK', 'LANGKAH MINGGU INI'];

const C = {
  ink: [11, 11, 12],
  paper: [255, 255, 255],
  mute: [110, 109, 104],
  line: [226, 225, 220],
  soft: [243, 242, 238],
  track: [236, 235, 230],
  lemon: [217, 242, 74],
  danger: [196, 39, 29],
};

const rp = (n) => 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
const num = (n) => Number(n || 0).toLocaleString('id-ID');

// Font bawaan PDF (Helvetica) hanya mendukung karakter Latin dasar → ganti/buang yang lain
function safe(text) {
  return String(text ?? '')
    .replace(/→|⟶|➜/g, '->').replace(/←/g, '<-').replace(/≤/g, '<=').replace(/≥/g, '>=')
    .replace(/[‐-‒]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF–—‘’“”…•]/g, '')
    .replace(/[ \t]+(?=[.,!?](\s|$))/g, '');
}

export async function downloadSalesReportPdf({ metrics: m, aiText = '', aiModel = '', adminName = '' }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 16, CW = W - M * 2;
  const BOTTOM = H - 20;
  let y = 0;

  const now = new Date();
  const stamp = now.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const font = (style = 'normal', size = 10, color = C.ink) => doc.setFont('helvetica', style).setFontSize(size).setTextColor(...color);
  const fill = (color) => doc.setFillColor(...color);
  const stroke = (color, w = 0.2) => doc.setDrawColor(...color).setLineWidth(w);
  const text = (t, x, yy, opts) => doc.text(safe(t), x, yy, opts);
  const fit = (t, maxW) => { let s = safe(t); while (s.length > 1 && doc.getTextWidth(s) > maxW) s = s.slice(0, -2); return s === safe(t) ? s : s.trimEnd() + '…'; };

  const newPage = () => {
    doc.addPage();
    // Kepala halaman lanjutan: strip tipis + identitas
    fill(C.ink); doc.rect(0, 0, W, 12, 'F');
    fill(C.lemon); doc.rect(M, 4.5, 3, 3, 'F');
    font('bold', 8, C.paper); text('URBANSTORE', M + 5, 7.3);
    font('normal', 8, [190, 190, 185]); text('Laporan Analisis Penjualan', W - M, 7.3, { align: 'right' });
    y = 24;
  };
  const ensure = (h) => { if (y + h > BOTTOM) newPage(); };

  const sectionTitle = (label, sub) => {
    ensure(16);
    fill(C.lemon); doc.rect(M, y - 3.6, 3.2, 3.2, 'F');
    font('bold', 9, C.ink); doc.setCharSpace(0.6); text(label.toUpperCase(), M + 5.5, y - 0.8); doc.setCharSpace(0);
    if (sub) { font('normal', 8, C.mute); text(sub, W - M, y - 0.8, { align: 'right' }); }
    stroke(C.ink, 0.4); doc.line(M, y + 1.6, W - M, y + 1.6);
    y += 8;
  };

  /* ── 1. SAMPUL ─────────────────────────────────────────── */
  fill(C.ink); doc.rect(0, 0, W, 74, 'F');
  fill(C.lemon); doc.rect(M, 15, 4, 4, 'F');
  font('bold', 12, C.paper); doc.setCharSpace(0.4); text('URBANSTORE', M + 6.5, 18.6); doc.setCharSpace(0);
  font('bold', 7.5, C.lemon); text('LAPORAN INTERNAL', W - M, 18.6, { align: 'right' });
  font('bold', 26, C.paper); text('Laporan Analisis', M, 40); text('Penjualan & Strategi', M, 51);
  font('normal', 9, [200, 200, 195]);
  text(`Dibuat ${stamp}${adminName ? `  ·  oleh ${adminName}` : ''}`, M, 62);
  text(`Data: seluruh pesanan di database UrbanStore${aiModel ? `  ·  Analisis AI: ${aiModel}` : ''}`, M, 67);
  y = 88;

  /* ── 2. RINGKASAN ANGKA ─────────────────────────────────── */
  sectionTitle('Ringkasan angka', `30 hari terakhir: ${num(m.last30Days?.orders)} pesanan · ${rp(m.last30Days?.confirmedRevenue)}`);
  const kpis = [
    ['Omzet terkonfirmasi', rp(m.revenue.confirmed), `${num(m.orders.confirmed)} pesanan lunas`],
    ['Rata-rata nilai order', rp(m.revenue.avgOrderValue), 'dari pesanan lunas'],
    ['Pesanan aktif', num(m.orders.total), `${num(m.orders.cancelled)} batal / kedaluwarsa`],
    ['Menunggu pembayaran', rp(m.revenue.pending), `${num(m.orders.awaitingPayment)} belum bayar · ${num(m.orders.awaitingVerification)} verifikasi`],
  ];
  const kw = (CW - 6 * 1.5) / 4 + 1.5;
  const kgap = (CW - kw * 4) / 3;
  kpis.forEach(([label, value, note], i) => {
    const x = M + i * (kw + kgap);
    fill(i === 0 ? C.ink : C.soft); doc.rect(x, y, kw, 30, 'F');
    font('bold', 6.3, i === 0 ? C.lemon : C.mute); doc.setCharSpace(0.15); text(label.toUpperCase(), x + 4, y + 7); doc.setCharSpace(0);
    font('bold', 14, i === 0 ? C.paper : C.ink); text(fit(value, kw - 8), x + 4, y + 17);
    font('normal', 7, i === 0 ? [190, 190, 185] : C.mute);
    doc.splitTextToSize(safe(note), kw - 8).slice(0, 2).forEach((l, j) => text(l, x + 4, y + 23 + j * 3.4));
  });
  y += 40;

  /* ── 3. GRAFIK ──────────────────────────────────────────── */
  const bars = (x, top, w, title, rows, labelKey, valueKey, fmt) => {
    font('bold', 8, C.ink); text(title, x, top);
    let yy = top + 6;
    const list = (rows || []).slice(0, 5);
    if (!list.length) { font('normal', 8, C.mute); text('Belum ada data.', x, yy + 2); return yy + 8; }
    const max = Math.max(...list.map((r) => Number(r[valueKey]) || 0), 1);
    const labelW = w * 0.44, valW = 18, barW = w - labelW - valW - 2;
    list.forEach((r, i) => {
      font(i === 0 ? 'bold' : 'normal', 8, C.ink); text(fit(r[labelKey], labelW - 5), x, yy + 2.8);
      fill(C.track); doc.rect(x + labelW, yy, barW, 4, 'F');
      fill(i === 0 ? C.ink : [90, 90, 88]); doc.rect(x + labelW, yy, Math.max(1.2, (Number(r[valueKey]) / max) * barW), 4, 'F');
      if (i === 0) { fill(C.lemon); doc.rect(x + labelW, yy, 1.2, 4, 'F'); }
      font('normal', 7.5, C.mute); text(fmt(r[valueKey]), x + w, yy + 3, { align: 'right' });
      yy += 7.5;
    });
    return yy;
  };
  sectionTitle('Performa produk');
  const colW = (CW - 10) / 2;
  const top1 = y;
  const end1 = bars(M, top1, colW, 'Produk terlaris (jumlah terjual)', m.topProducts, 'name', 'qty', (v) => `${num(v)} pcs`);
  const end2 = bars(M + colW + 10, top1, colW, 'Penjualan per kategori', m.byCategory, 'category', 'revenue', rp);
  y = Math.max(end1, end2) + 6;
  ensure(50);
  const top2 = y;
  const end3 = bars(M, top2, colW, 'Ukuran paling laku', m.bySize, 'size', 'qty', (v) => `${num(v)} pcs`);
  const end4 = bars(M + colW + 10, top2, colW, 'Warna paling laku', m.byColor, 'color', 'qty', (v) => `${num(v)} pcs`);
  y = Math.max(end3, end4) + 8;

  /* ── 4. TABEL STOK ──────────────────────────────────────── */
  const table = (title, cols, rows, empty) => {
    ensure(22);
    font('bold', 8, C.ink); text(title, M, y); y += 3;
    fill(C.soft); doc.rect(M, y, CW, 7, 'F');
    font('bold', 7, C.mute);
    let x = M + 3;
    cols.forEach((c) => {
      doc.setCharSpace(c.align === 'right' ? 0 : 0.3); // jarak huruf merusak perataan kanan
      text(c.label.toUpperCase(), c.align === 'right' ? x + c.w - 6 : x, y + 4.7, c.align === 'right' ? { align: 'right' } : undefined);
      x += c.w;
    });
    doc.setCharSpace(0);
    y += 7;
    if (!rows.length) { font('normal', 8, C.mute); text(empty, M + 3, y + 5); y += 10; return; }
    rows.forEach((r) => {
      ensure(7);
      let cx = M + 3;
      cols.forEach((c) => {
        const v = c.get(r);
        font(c.bold ? 'bold' : 'normal', 8, c.color ? c.color(r) : C.ink);
        text(c.align === 'right' ? v : fit(v, c.w - 4), c.align === 'right' ? cx + c.w - 6 : cx, y + 4.8, c.align === 'right' ? { align: 'right' } : undefined);
        cx += c.w;
      });
      stroke(C.line); doc.line(M, y + 7, W - M, y + 7);
      y += 7;
    });
    y += 6;
  };
  sectionTitle('Stok & katalog', `${num(m.catalog?.activeProducts)} produk aktif · rata-rata harga ${rp(m.catalog?.avgPrice)}`);
  table('Varian stok menipis (3 pcs atau kurang)', [
    { label: 'Produk', w: CW * 0.5, get: (r) => r.name, bold: true },
    { label: 'Warna', w: CW * 0.2, get: (r) => r.color },
    { label: 'Ukuran', w: CW * 0.15, get: (r) => r.size },
    { label: 'Stok', w: CW * 0.15, align: 'right', get: (r) => (r.stock === 0 ? 'Habis' : `${r.stock} pcs`), color: (r) => (r.stock === 0 ? C.danger : C.ink) },
  ], m.lowStock || [], 'Aman — semua varian di atas 3 pcs.');
  table('Produk belum terjual', [
    { label: 'Produk', w: CW * 0.7, get: (r) => r.name },
    { label: 'Total stok', w: CW * 0.3, align: 'right', get: (r) => `${num(r.stock)} pcs` },
  ], m.noSales || [], 'Semua produk aktif sudah pernah terjual.');

  /* ── 5. ANALISIS & REKOMENDASI AI ───────────────────────── */
  ensure(70); // lanjut di halaman yang sama bila masih cukup ruang
  y += 4;
  sectionTitle('Analisis & rekomendasi AI', aiModel ? `Model: ${aiModel}` : '');
  const lines = cleanAiText(aiText).split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    fill(C.soft); doc.rect(M, y, CW, 22, 'F');
    font('bold', 9, C.ink); text('Analisis AI belum dibuat.', M + 5, y + 9);
    font('normal', 8.5, C.mute); text('Klik "Generate Analisis AI" di halaman Analisis Penjualan, lalu unduh ulang laporan ini.', M + 5, y + 15);
    y += 30;
  } else {
    for (const raw of lines) {
      const title = SECTION_TITLES.find((t) => raw.toUpperCase().replace(/[:.]$/, '') === t);
      if (title) {
        ensure(18);
        y += 3;
        font('bold', 10.5, C.ink); text(title.charAt(0) + title.slice(1).toLowerCase(), M, y);
        fill(C.lemon); doc.rect(M, y + 1.8, 14, 1.1, 'F');
        y += 8;
        continue;
      }
      const numbered = raw.match(/^(\d+)[.)]\s+(.*)$/);
      const bullet = raw.match(/^[-•]\s+(.*)$/);
      const indent = numbered || bullet ? 7 : 0;
      font('normal', 9.5, C.ink);
      const wrapped = doc.splitTextToSize(safe(numbered ? numbered[2] : bullet ? bullet[1] : raw), CW - indent);
      ensure(wrapped.length * 5 + 2);
      if (numbered) { font('bold', 9.5, C.ink); text(`${numbered[1]}.`, M, y); font('normal', 9.5, C.ink); }
      if (bullet) { fill(C.ink); doc.rect(M + 1, y - 2, 1.4, 1.4, 'F'); }
      wrapped.forEach((l, i) => text(l, M + indent, y + i * 5));
      y += wrapped.length * 5 + 2.6;
    }
  }
  ensure(16);
  y += 4;
  font('italic', 7.5, C.mute);
  doc.splitTextToSize(safe('Catatan: angka dihitung langsung dari database (agregat). Data pribadi pelanggan tidak disertakan dalam laporan maupun dikirim ke AI. Rekomendasi AI bersifat saran — keputusan tetap di tangan pengelola toko.'), CW)
    .forEach((l, i) => text(l, M, y + i * 4));

  /* ── Footer & nomor halaman ─────────────────────────────── */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    stroke(C.line); doc.line(M, H - 12, W - M, H - 12);
    font('normal', 7, C.mute);
    text('UrbanStore · Laporan Analisis Penjualan · Untuk penggunaan internal', M, H - 7.5);
    text(`Halaman ${p} dari ${pages}`, W - M, H - 7.5, { align: 'right' });
  }

  const ymd = now.toISOString().slice(0, 10);
  doc.save(`Laporan-Penjualan-UrbanStore-${ymd}.pdf`);
}
