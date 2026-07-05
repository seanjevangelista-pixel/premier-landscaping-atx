export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const resendKey  = process.env.RESEND_API_KEY;
  const sbUrl      = process.env.SUPABASE_URL;
  const sbKey      = process.env.SUPABASE_ANON_KEY;
  // Auto-lookup client ID by domain
  let clientId = null;
  try {
    const lookup = await fetch('https://evan-enterprises-os.vercel.app/api/client-lookup?domain=premierlandscapingatx.com');
    const ldata  = await lookup.json();
    if (ldata.client?.id) clientId = ldata.client.id;
  } catch (_) {}

  const { source = 'unknown', ts, ua } = req.body || {};
  const time = ts
    ? new Date(ts).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' })
    : 'Unknown';

  const sourceLabels = {
    nav:     'Nav bar button',
    hero:    'Hero section button',
    why:     '"Why Us" section button',
    cta:     'CTA banner button',
    contact: 'Contact section',
    mobile:  'Mobile floating button',
  };

  const label = sourceLabels[source] || source;

  // 1 — Log to Supabase
  if (sbUrl && sbKey) {
    try {
      await fetch(`${sbUrl}/rest/v1/call_leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          client_id: clientId || null,
          source: label,
          tapped_at: ts || new Date().toISOString(),
        }),
      });
    } catch(_) {}
  }

  // 2 — Email both Sean and Angel
  if (resendKey) {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#1A3D2B;padding:24px 28px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">📞 Website Phone Tap</h2>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">Premier Landscaping ATX</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px">Source</td><td style="padding:8px 0;font-weight:600;color:#111">${label}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Time (CT)</td><td style="padding:8px 0;color:#111">${time}</td></tr>
          </table>
          <p style="margin-top:16px;font-size:12px;color:#9ca3af">Someone on the website tapped the call button. They may have called or may still be deciding.</p>
        </div>
      </div>`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Premier Landscaping ATX <quotes@premierlandscapingatx.com>',
          to: ['seanjevangelista@gmail.com', 'premierlandscapingatx@gmail.com'],
          subject: `📞 Phone tap — ${label}`,
          html,
        }),
      });
    } catch(_) {}
  }

  return res.status(200).json({ ok: true });
}
