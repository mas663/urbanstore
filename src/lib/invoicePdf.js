import { BANK, ORDER_STATUS } from './catalog.js';

const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const date = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STAMP = {
  menunggu_pembayaran: { text: 'BELUM LUNAS', color: [196, 39, 29] },
  menunggu_verifikasi: { text: 'BELUM LUNAS', color: [196, 39, 29] },
  lunas: { text: 'LUNAS', color: [31, 122, 61] },
  dikirim: { text: 'LUNAS', color: [31, 122, 61] },
  selesai: { text: 'LUNAS', color: [31, 122, 61] },
  dibatalkan: { text: 'DIBATALKAN', color: [120, 120, 115] },
  kedaluwarsa: { text: 'KEDALUWARSA', color: [120, 120, 115] },
};

/** Buat & unduh invoice PDF (jsPDF dimuat saat dibutuhkan supaya bundle awal tetap kecil). */
export async function downloadInvoicePdf(order) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 18;
  let y = 22;

  // Header
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(10, 10, 10);
  doc.text('URBANSTORE', M, y);
  doc.setFillColor(217, 242, 74).rect(M + 47, y - 4.2, 3, 3, 'F');
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(107, 107, 102);
  doc.text('Fashion pria & wanita untuk Gen Z', M, y + 6);
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(10, 10, 10);
  doc.text('INVOICE', W - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(`#${order.code}`, W - M, y + 6, { align: 'right' });
  doc.setTextColor(107, 107, 102).text(date(order.created_at), W - M, y + 11, { align: 'right' });

  y += 20;
  doc.setDrawColor(10, 10, 10).setLineWidth(0.6).line(M, y, W - M, y);

  // Stempel status
  const stamp = STAMP[order.status] || STAMP.menunggu_pembayaran;
  doc.setDrawColor(...stamp.color).setTextColor(...stamp.color).setLineWidth(1);
  doc.setFont('helvetica', 'bold').setFontSize(20);
  const sw = doc.getTextWidth(stamp.text) + 10;
  doc.roundedRect(W - M - sw, y + 8, sw, 13, 2, 2, 'S');
  doc.text(stamp.text, W - M - sw / 2, y + 17, { align: 'center' });

  // Ditagihkan ke
  y += 12;
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(107, 107, 102).text('DITAGIHKAN & DIKIRIM KE', M, y);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(10, 10, 10).text(order.customer_name, M, y + 6);
  doc.setFont('helvetica', 'normal').setFontSize(9.5);
  const addr = doc.splitTextToSize(
    `${order.address}, Kec. ${order.district}, ${order.city}, ${order.province} ${order.postal_code}`, 110);
  doc.text([`${order.phone} · ${order.email}`, ...addr], M, y + 11.5);
  y += 16 + addr.length * 4.5;
  doc.setFontSize(9).setTextColor(107, 107, 102).text(`Status: ${ORDER_STATUS[order.status]}`, M, y);

  // Tabel item
  y += 10;
  const cols = { item: M, qty: 130, price: 158, total: W - M };
  doc.setFillColor(244, 244, 241).rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(10, 10, 10);
  doc.text('PRODUK', cols.item + 2, y);
  doc.text('QTY', cols.qty, y, { align: 'right' });
  doc.text('HARGA', cols.price + 12, y, { align: 'right' });
  doc.text('SUBTOTAL', cols.total - 2, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal').setFontSize(9.5);
  for (const it of order.items) {
    const name = doc.splitTextToSize(it.product_name, 100);
    doc.setTextColor(10, 10, 10).text(name, cols.item + 2, y);
    doc.setFontSize(8).setTextColor(107, 107, 102).text(`${it.color} · Size ${it.size}`, cols.item + 2, y + name.length * 4.2);
    doc.setFontSize(9.5).setTextColor(10, 10, 10);
    doc.text(String(it.qty), cols.qty, y, { align: 'right' });
    doc.text(rp(it.price), cols.price + 12, y, { align: 'right' });
    doc.text(rp(it.price * it.qty), cols.total - 2, y, { align: 'right' });
    y += name.length * 4.2 + 7;
    doc.setDrawColor(228, 228, 224).setLineWidth(0.2).line(M, y - 3.5, W - M, y - 3.5);
  }

  // Total
  y += 2;
  const row = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 11 : 9.5).setTextColor(10, 10, 10);
    doc.text(label, 130, y);
    doc.text(value, W - M - 2, y, { align: 'right' });
    y += bold ? 8 : 6;
  };
  row('Subtotal', rp(order.subtotal));
  row(`Ongkir (${order.shipping_method === 'express' ? 'Express' : 'Regular'})`, rp(order.shipping_cost));
  doc.setDrawColor(10, 10, 10).setLineWidth(0.5).line(130, y - 3, W - M, y - 3);
  y += 2;
  row('TOTAL', rp(order.total), true);

  // Instruksi pembayaran
  if (['menunggu_pembayaran', 'menunggu_verifikasi'].includes(order.status)) {
    y += 6;
    doc.setFillColor(10, 10, 10).rect(M, y, W - 2 * M, 26, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(217, 242, 74).text('INSTRUKSI TRANSFER BANK', M + 6, y + 7);
    doc.setFontSize(13).setTextColor(255, 255, 255).text(`${BANK.name} · ${BANK.account}`, M + 6, y + 14);
    doc.setFont('helvetica', 'normal').setFontSize(9).text(`a.n. ${BANK.holder}`, M + 6, y + 20);
    doc.setFont('helvetica', 'bold').setFontSize(9)
      .text(`Bayar sebelum ${date(order.payment_deadline)}`, W - M - 6, y + 14, { align: 'right' });
    y += 32;
  }

  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(107, 107, 102);
  doc.text('Terima kasih sudah belanja di UrbanStore. Simpan invoice ini sebagai bukti pemesanan.', M, 285);

  doc.save(`Invoice-${order.code}.pdf`);
}
