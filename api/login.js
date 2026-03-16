
// /api/login.js
import crypto from 'node:crypto';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function signJWT(payload, secret, expSec = 12 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expSec, ...payload };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const s = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${s}`;
}
export default async function handler(req, res) {
  try{
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { setor, senha } = body;
    if (!setor || !senha) return res.status(400).json({ error: 'setor e senha são obrigatórios' });
    const map = { RH: process.env.RH_PASSWORD, 'Segurança': process.env.SEGURANCA_PASSWORD, admin: process.env.ADMIN_PASSWORD };
    const expected = map[setor];
    if (!expected || String(senha) != String(expected)) return res.status(401).json({ error: 'Credenciais inválidas' });
    const secret = process.env.SECRET_SESSION_KEY;
    if (!secret) return res.status(500).json({ error: 'SECRET_SESSION_KEY não configurada' });
    const token = signJWT({ setor, role: setor === 'admin' ? 'admin' : 'user' }, secret);
    const cookie = [ `session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=43200', 'Secure' ].join('; ');
    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ ok: true, setor });
  }catch(e){ console.error('login error:', e); res.status(500).json({ error: 'login error' }); }
}
