export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key          = process.env.RESEND_API_KEY;
  const supabaseUrl  = process.env.SUPABASE_URL  || 'https://hzcgdnhecgewqpcnumwm.supabase.co';
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const clientId     = 'cb4b702b-7e43-4c20-8cec-a5d772bd952c'; // Premier Landscaping ATX

  if (!key) return res.status(500).json({ error: 'Email not configured' });

  const { firstName, lastName, phone, email, service, city, message } = req.body || {};
  if (!firstName || !phone || !service) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: 'Premier Landscaping ATX <quotes@premierlandscapingatx.com>',
        to: ['premierlandscapingatx@gmail.com', 'seanjevangelista@gmail.com'],
        reply_to: email || undefined,
        subject: `New Quote Request — ${service}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1A3D2B;padding:28px 32px;border-radius:8px 8px 0 0">
              <h2 style="color:#fff;margin:0;font-size:20px">New Quote Request</h2>
              <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px">Premier Landscaping ATX</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:140px">Name</td><td style="padding:8px 0;font-weight:600;color:#111">${firstName} ${lastName || ''}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Phone</td><td style="padding:8px 0;font-weight:600;color:#111"><a href="tel:${phone}" style="color:#2D6A4F">${phone}</a></td></tr>
                ${email ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0;color:#111">${email}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Service</td><td style="padding:8px 0;font-weight:600;color:#1A3D2B">${service}</td></tr>
                ${city ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Location</td><td style="padding:8px 0;color:#111">${city}</td></tr>` : ''}
              </table>
              ${message ? `<div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Project Details</p><p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${message}</p></div>` : ''}
              <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb">
                <a href="tel:${phone}" style="display:inline-block;background:#1A3D2B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Call ${firstName} Now</a>
              </div>
            </div>
          </div>
        `,
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Send failed' });

    // Save lead to Evan Enterprises dashboard
    if (supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/form_leads`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          client_id:     clientId || null,
          source:        'Premier Landscaping ATX — Quote Form',
          customer_name: `${firstName} ${lastName || ''}`.trim(),
          customer_phone: phone || null,
          customer_email: email || null,
          service:       service || null,
          city:          city || null,
          message:       message || null,
          status:        'new',
        }),
      }).catch(() => {}); // fire and forget — never block the email
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
