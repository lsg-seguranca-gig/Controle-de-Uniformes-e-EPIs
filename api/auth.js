// /api/auth.js
const allowOrigin='*';
export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  if(req.method!=='POST') return res.status(405).json({ ok:false, error:'method not allowed' });

  try{
    const bodyText = typeof req.body==='string' ? req.body : JSON.stringify(req.body ?? {});
    let payload={}; try{ payload = JSON.parse(bodyText); }catch{}
    const setor = String(payload.setor||'').trim();
    const senha = String(payload.senha||'');
    if(!setor || !senha) return res.status(400).json({ ok:false, error:'missing fields' });

    const map = {
      RH: process.env.RH_PASSWORD,
      'Segurança': process.env.SEGURANCA_PASSWORD,
      admin: process.env.ADMIN_PASSWORD,
      Admin: process.env.ADMIN_PASSWORD,
    };
    const secret = (map[setor]||'').trim();
    if(!secret) return res.status(400).json({ ok:false, error:'setor inválido' });
    if(senha !== secret) return res.status(401).json({ ok:false, error:'senha inválida' });

    const token = Math.random().toString(36).slice(2)+Date.now().toString(36);
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({ ok:true, token, setor });
  }catch(e){
    console.error('[api/auth] error:', e);
    return res.status(500).json({ ok:false, error:'auth error' });
  }
}