const nodemailer = require('nodemailer');

// Set up transporter if credentials exist in .env
let transporter = null;
const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_EMAIL = process.env.SMTP_FROM || '"Vrinda Wellness" <care@vrindawellness.in>';

const inr = n => '₹' + Number(n).toLocaleString('en-IN');

async function sendOrderConfirmation(order) {
  const customerEmail = order.customer?.email;
  if (!customerEmail) return;

  const itemsHtml = order.items.map(it => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${it.name}</strong><br/>
        <small style="color:#777;">${it.brand || ''} ${it.pack ? '· ' + it.pack : ''}</small>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align:center;">${it.qty}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align:right;">${inr(it.price * it.qty)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #FAF7F2; border-radius: 16px;">
      <div style="background: #1B4332; padding: 20px; border-radius: 12px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; color: #C5A55A;">Vrinda Wellness</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #E8F5E9;">Licensed Pharmacy · Mumbai</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 12px; margin-top: 16px; border: 1px solid rgba(0,0,0,0.06);">
        <h2 style="color: #153628; margin-top: 0;">Order Confirmed!</h2>
        <p style="color: #555; font-size: 14px;">Hello ${order.customer.name}, thank you for your order. We are preparing your medicine and wellness package for dispatch.</p>

        <div style="background: #F0F7F4; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
          <strong>Order Number:</strong> <span style="color: #1B4332; font-weight: bold;">${order.orderNumber}</span><br/>
          <strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}<br/>
          <strong>Delivery To:</strong> ${order.address.line1}, ${order.address.city || 'Mumbai'} — ${order.address.pincode}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px;">
          <thead>
            <tr style="background: #F8F9FA; text-align: left;">
              <th style="padding: 8px 10px;">Item</th>
              <th style="padding: 8px 10px; text-align:center;">Qty</th>
              <th style="padding: 8px 10px; text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px 10px; text-align:right;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px 10px; text-align:right;">${inr(order.subtotal)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 8px 10px; text-align:right;"><strong>Delivery Fee:</strong></td>
              <td style="padding: 8px 10px; text-align:right;">${order.deliveryFee === 0 ? 'FREE' : inr(order.deliveryFee)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 10px; text-align:right; font-size: 16px; color:#1B4332;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align:right; font-size: 16px; color:#1B4332;"><strong>${inr(order.total)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5000/track.html?orderNumber=${order.orderNumber}" style="display: inline-block; background: #1B4332; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Track Your Order</a>
        </div>
      </div>

      <p style="font-size: 11px; color: #888; text-align: center; margin-top: 20px;">
        Questions? Contact us at +91 99673 78987 or care@vrindawellness.in
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Order Confirmed: ${order.orderNumber} — Vrinda Wellness`,
        html,
      });
      console.log(`✉️ Order confirmation email sent to ${customerEmail}`);
    } catch (err) {
      console.error('❌ Failed to send email via SMTP:', err.message);
    }
  } else {
    console.log(`📧 [Email Simulation] Order confirmation email prepared for ${customerEmail} (Order #${order.orderNumber})`);
  }
}

async function sendOrderStatusUpdate(order, newStatus) {
  const customerEmail = order.customer?.email;
  if (!customerEmail) return;

  const statusMap = {
    confirmed: 'Confirmed & Being Packed',
    packed: 'Packed & Ready for Dispatch',
    shipped: 'Out for Delivery in Mumbai',
    delivered: 'Delivered Successfully',
    cancelled: 'Cancelled',
  };

  const statusTitle = statusMap[newStatus] || newStatus;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #FAF7F2; border-radius: 16px;">
      <div style="background: #1B4332; padding: 20px; border-radius: 12px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; color: #C5A55A;">Vrinda Wellness</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 12px; margin-top: 16px; border: 1px solid rgba(0,0,0,0.06);">
        <h2 style="color: #153628; margin-top: 0;">Order Status Update</h2>
        <p style="font-size: 14px; color: #444;">Hello ${order.customer.name}, your order <strong>${order.orderNumber}</strong> has been updated to:</p>
        <div style="background: #F0F7F4; border-left: 4px solid #1B4332; padding: 12px 16px; margin: 16px 0; font-size: 16px; font-weight: bold; color: #1B4332;">
          ${statusTitle}
        </div>
        <p style="font-size: 13px; color: #666;">You can track real-time progress anytime using your order number.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5000/track.html?orderNumber=${order.orderNumber}" style="display: inline-block; background: #1B4332; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Track Order Live</a>
        </div>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Order Update: ${order.orderNumber} is ${statusTitle} — Vrinda Wellness`,
        html,
      });
      console.log(`✉️ Status update email sent to ${customerEmail}`);
    } catch (err) {
      console.error('❌ Failed to send status email:', err.message);
    }
  } else {
    console.log(`📧 [Email Simulation] Order status update email prepared for ${customerEmail} (Status: ${newStatus})`);
  }
}

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
};
