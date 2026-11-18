const parse = (json, fallback) => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

export const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.size_type
  FROM products p JOIN categories c ON c.id = p.category_id`;

export function serializeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: { id: row.category_id, name: row.category_name, slug: row.category_slug, sizeType: row.size_type },
    gender: row.gender,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    stock: row.stock,
    inStock: row.stock > 0,
    sizes: parse(row.sizes, []),
    colors: parse(row.colors, []),
    material: row.material,
    description: row.description,
    imageUrl: row.image_url,
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ORDER_STATUS_LABEL = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  lunas: 'Lunas · Diproses',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export function serializeOrder(order, items = [], payment = null) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    customer: {
      name: order.customer_name,
      phone: order.phone,
      email: order.email,
      address: order.address,
      city: order.city,
      postalCode: order.postal_code,
      notes: order.notes,
    },
    shipping: { method: order.shipping_method, cost: order.shipping_cost },
    subtotal: order.subtotal,
    total: order.total,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      imageUrl: i.image_url,
      size: i.size,
      price: i.price_at_purchase,
      qty: i.qty,
      lineTotal: i.price_at_purchase * i.qty,
    })),
    payment: payment && {
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      claimedAt: payment.claimed_at,
      verifiedAt: payment.verified_at,
    },
  };
}

export function loadOrder(db, where, value) {
  const order = db.prepare(`SELECT * FROM orders WHERE ${where} = ?`).get(value);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  const payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id);
  return { row: order, json: serializeOrder(order, items, payment) };
}
