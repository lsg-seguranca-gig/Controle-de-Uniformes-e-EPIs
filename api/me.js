
// /api/me.js
import crypto from 'node:crypto';
function verifyJWT(token, secret){
  try{
    const [h,p,s] = token.split('.');
    if(!h||!p||!s) return null;
    const data = `${h}.${p}`;
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if (sig !== s) return null;
    const payload = JSON.parse(Buffer.from(p,'base64').toString('utf8'));
    if (payload.exp && Date.now()/1000 > payload.exp) return null;
    return payload;
  }catch{ return null; }
}
export default async function handler(req,res){
  try{
    const cookie = req.headers.cookie || '';
    const m = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    if(!m) return res.status(401).json({ error: 'no session' });
    const secret = process.env.SECRET_SESSION_KEY;
    if (!secret) return res.status(500).json({ error:'SECRET_SESSION_KEY não configurada' });
    const payload = verifyJWT(m[1], secret);
    if(!payload) return res.status(401).json({ error: 'invalid session' });
    res.status(200).json({ setor: payload.setor, role: payload.role });
  }catch(e){ console.error('me error:', e); res.status(500).json({ error: 'me error' }); }
}
