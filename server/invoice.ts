import type { Order } from '../src/types.ts';

function esc(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderOrderInvoiceHtml(order: Order): string {
  const rows = order.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #E8DFD3;">${idx + 1}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #E8DFD3;">
          <strong>${esc(item.productName)}</strong><br/>
          <span style="font-size:12px;color:#78695F;">Colour: ${esc(item.selectedColor)}</span>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #E8DFD3;text-align:center;">${item.quantity}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #E8DFD3;text-align:right;">${inr(item.finalUnitPrice)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #E8DFD3;text-align:right;">${inr(item.finalUnitPrice * item.quantity)}</td>
      </tr>`
    )
    .join('');

  const addrHtml =
    order.fulfillmentMethod === 'pickup'
      ? '<p style="margin:4px 0;">Studio Pickup — Muneshwara Layout, Laggere, Bengaluru 560058</p>'
      : order.shippingAddress
      ? `<p style="margin:4px 0;">${esc(order.shippingAddress.recipientName)}<br/>
         ${esc(order.shippingAddress.line1)}${order.shippingAddress.line2 ? `, ${esc(order.shippingAddress.line2)}` : ''}<br/>
         ${esc(order.shippingAddress.city)}, ${esc(order.shippingAddress.state)} – ${esc(order.shippingAddress.pincode)}<br/>
         Phone: ${esc(order.shippingAddress.phone)}</p>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${esc(order.orderNumber)} – SKEIN SCENE</title>
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background:#F7F1E9; color:#55483F; margin:0; padding:32px; }
    .sheet { max-width:800px; margin:0 auto; background:#FFFFFF; border:1px solid #E5DDD2; border-radius:12px; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #E8DFD3; padding-bottom:24px; }
    .brand { font-family: Georgia, serif; font-size:28px; letter-spacing:0.06em; margin:0; }
    .muted { color:#78695F; font-size:13px; }
    table { width:100%; border-collapse:collapse; margin-top:24px; font-size:14px; }
    th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#78695F; border-bottom:2px solid #55483F; padding:10px; }
    .totals { margin-top:24px; margin-left:auto; width:300px; font-size:14px; }
    .totals-row { display:flex; justify-content:space-between; padding:6px 0; }
    .grand { border-top:2px solid #55483F; margin-top:8px; padding-top:10px; font-weight:700; font-size:16px; }
    @media print { body { background:#fff; padding:0; } .no-print { display:none; } .sheet { border:none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="brand">SKEIN SCENE</h1>
        <p class="muted" style="margin:6px 0 0;">Little Things, Lovingly Made.</p>
        <p class="muted" style="margin:4px 0 0;">Muneshwara Layout, Laggere, Bengaluru, Karnataka 560058</p>
        <p class="muted" style="margin:2px 0 0;">Phone: +91 81973 82703 · Instagram: @skein_scene</p>
      </div>
      <div style="text-align:right;">
        <h2 style="margin:0;font-family:Georgia,serif;font-size:22px;">Tax & Order Invoice</h2>
        <p class="muted" style="margin:6px 0 0;">Invoice / Order No: <strong>${esc(order.orderNumber)}</strong></p>
        <p class="muted" style="margin:2px 0 0;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        <p class="muted" style="margin:2px 0 0;">Payment Status: <strong>${esc(order.paymentStatus.toUpperCase())}</strong></p>
        ${order.razorpayPaymentId ? `<p class="muted" style="margin:2px 0 0;">Transaction Ref: ${esc(order.razorpayPaymentId)}</p>` : ''}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;gap:24px;margin-top:24px;font-size:14px;">
      <div>
        <p class="muted" style="text-transform:uppercase;font-size:11px;letter-spacing:0.06em;margin:0 0 6px;">Billed To</p>
        <p style="margin:0;font-weight:600;">${esc(order.customerName)}</p>
        <p style="margin:4px 0;">${esc(order.customerEmail)}</p>
        <p style="margin:4px 0;">${esc(order.customerPhone)}</p>
      </div>
      <div>
        <p class="muted" style="text-transform:uppercase;font-size:11px;letter-spacing:0.06em;margin:0 0 6px;">Fulfillment</p>
        ${addrHtml}
        ${order.giftWrap ? `<p style="margin:6px 0 0;font-size:12px;">Gift Wrapped${order.giftMessage ? ` — “${esc(order.giftMessage)}”` : ''}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Handmade Creation</th>
          <th style="text-align:center;width:70px;">Qty</th>
          <th style="text-align:right;width:120px;">Unit Price</th>
          <th style="text-align:right;width:120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${inr(order.subtotal)}</span></div>
      ${order.discountAmount > 0 ? `<div class="totals-row"><span>Coupon (${esc(order.couponCode)})</span><span>-${inr(order.discountAmount)}</span></div>` : ''}
      <div class="totals-row"><span>Shipping (${order.fulfillmentMethod === 'pickup' ? 'Studio Pickup' : 'Standard'})</span><span>${order.shippingFee === 0 ? 'Free' : inr(order.shippingFee)}</span></div>
      ${order.taxAmount > 0 ? `<div class="totals-row"><span>Taxes</span><span>${inr(order.taxAmount)}</span></div>` : ''}
      <div class="totals-row grand"><span>Total Paid</span><span>${inr(order.totalAmount)}</span></div>
    </div>

    <div style="margin-top:36px;padding-top:16px;border-top:1px solid #E8DFD3;display:flex;justify-content:space-between;align-items:center;">
      <p class="muted" style="margin:0;">Thank you for supporting handmade craft at Skein Scene, Bengaluru.</p>
      <button class="no-print" onclick="window.print()" style="background:#55483F;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px;">Print / Save PDF</button>
    </div>
  </div>
</body>
</html>`;
}
