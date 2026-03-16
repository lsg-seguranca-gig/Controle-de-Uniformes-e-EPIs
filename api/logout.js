
// /api/logout.js
export default async function handler(req, res){
  try{
    res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
    res.status(200).json({ ok:true });
  }catch(e){ console.error('logout error:', e); res.status(500).json({ error:'logout error' }); }
}
