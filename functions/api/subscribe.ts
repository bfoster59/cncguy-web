// Cloudflare Pages Function — POST /api/subscribe
// Subscribes an email to the Kit (ConvertKit) form configured below.
// Requires KIT_API_KEY environment variable set in Cloudflare Pages settings.

interface Env {
  KIT_API_KEY: string;
}

const FORM_ID = '9369856';
const KIT_ENDPOINT = `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.KIT_API_KEY) {
    return json({ ok: false, error: 'Server not configured.' }, 500);
  }

  let email = '';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json<{ email?: string }>();
      email = (body?.email || '').trim();
    } else {
      const form = await request.formData();
      email = String(form.get('email') || '').trim();
    }
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Please enter a valid email.' }, 400);
  }

  try {
    const res = await fetch(KIT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: env.KIT_API_KEY, email }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Kit API error', res.status, text);
      return json({ ok: false, error: 'Could not subscribe right now. Try again in a moment.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Kit request failed', err);
    return json({ ok: false, error: 'Network error. Try again in a moment.' }, 502);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
