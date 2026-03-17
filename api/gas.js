// /api/gas.js
// Vercel Edge/Node function

const allowOrigin = '*';

// ---------- Utils ----------
const fold = (v) =>
  (v ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function same(a, b) {
  return fold(a) === fold(b);
}

// token muito simples (HMAC caseiro). Se quiser JWT depois, eu troco.
function makeToken(setor, ts = Date.now()) {
  const secret = process.env.SECRET_SESSION_KEY || '';
  const base = `${fold(setor)}.${ts}.${secret}`;
  // hash "pobre", suficiente pro caso; posso trocar para crypto real se quiser
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `${Buffer.from(`${fold(setor)}.${ts}`).toString('base64')}.${h.toString(16)}`;
}
function checkToken(token) {
  try {
    const [b64, sig] = (token || '').split('.');
    if (!b64 || !sig) return false;
    const raw = Buffer.from(b64, 'base64').toString('utf8'); // fold(setor).ts
    const [sectFold, tsStr] = raw.split('.');
    const ts = Number(tsStr);
    if (!sectFold || !Number.isFinite(ts)) return false;

    const secret = process.env.SECRET_SESSION_KEY || '';
    const base = `${sectFold}.${ts}.${secret}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
    const expected = h.toString(16);
    // expiração opcional: 24h
    const isFresh = Date.now() - ts < 24 * 60 * 60 * 1000;
    return sig === expected && isFresh;
  } catch {
    return false;
  }
}

function getEnvPasswordForSetor(setor) {
  // mapeia nomes de env a partir do setor informado
  // Ex.: "Segurança" -> SEGURANCA_PASSWORD
  const m = {
    'seguranca': process.env.SEGURANCA_PASSWORD,
    'segurança': process.env.SEGURANCA_PASSWORD, // redundância por segurança
    'rh': process.env.RH_PASSWORD,
    'adm': process.env.ADM_PASSWORD,
  };

  const keyFold = fold(setor);
  if (m[keyFold]) return m[keyFold];

  // fallback: qualquer outro setor -> tenta NOMESEMTIL_PASSWORD
  // Ex.: "Cozinha" -> COZINHA_PASSWORD
  const dynamicKey = `${fold(setor).replace(/[^a-z0-9]/g, '').toUpperCase()}_PASSWORD`;
  return process.env[dynamicKey];
}

// ---------- Handler ----------
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-gateway-key');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);

  const GAS =
    (process.env.GAS_ENDPOINT && process.env.GAS_ENDPOINT.trim()) ||
    (process.env.GAS_WEBAPP_URL && process.env.GAS_WEBAPP_URL.trim()) ||
    '';

  // --- Rotas tratadas localmente: login e ping ---
  const { method } = req;
  const q = req.query || {};
  const action = (q.action || q.a || '').toString();

  if (action === 'login') {
    try {
      const setor = (q.setor || q.sector || '').toString();
      const senha = (q.senha || q.password || '').toString();

      if (!setor || !senha) {
        return res.status(400).json({ ok: false, message: 'Informe setor e senha.' });
      }

      const envPass = getEnvPasswordForSetor(setor);
      if (!envPass) {
        return res.status(403).json({ ok: false, message: `Setor não permitido: ${setor}` });
      }

      if (senha !== envPass) {
        return res.status(401).json({ ok: false, message: 'Setor/senha inválidos.' });
      }

      const token = makeToken(setor);
      return res.status(200).json({ ok: true, setor, token });
    } catch (e) {
      console.error('[api/gas login] error:', e);
      return res.status(500).json({ ok: false, message: 'Falha no login' });
    }
  }

  if (action === 'ping') {
    const token = (q.token || '').toString();
    const ok = checkToken(token);
    return res.status(ok ? 200 : 401).json({ ok });
  }

  // --- Demais ações: proxy transparente para o GAS (como já fazia) ---
  if (!GAS) {
    return res.status(500).json({ ok: false, error: 'Defina GAS_ENDPOINT (ou GAS_WEBAPP_URL) na Vercel.' });
  }

  try {
    const params = new URLSearchParams(q);
    // injeta key do gateway, se existir e não vier no query
    const key = (process.env.APP_GATEWAY_KEY || '').trim();
    if (key && !params.has('key')) params.set('key', key);

    const url = `${GAS}?${params.toString()}`;

    const fwd = {};
    const auth = req.headers['authorization'];
    if (auth) fwd['authorization'] = auth;
    const xk = req.headers['x-app-gateway-key'];
    if (xk) fwd['x-app-gateway-key'] = xk;

    let upstream;
    if (method === 'GET') {
      upstream = await fetch(url, { redirect: 'follow', headers: fwd });
    } else if (method === 'POST') {
      const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', ...fwd },
        body: bodyText,
        redirect: 'follow',
      });
    } else {
      return res.status(405).json({ ok: false, error: `Método não suportado: ${method}` });
    }

    const text = await upstream.text();
    try {
      const json = JSON.parse(text);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (method === 'GET') res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
      return res.status(upstream.ok ? upstream.status : 502).send(json);
    } catch {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(502).send(text);
    }
  } catch (e) {
    console.error('[api/gas] proxy error:', e);
    return res.status(502).json({ ok: false, error: 'Falha ao contatar GAS', detail: String(e) });
  }
}
