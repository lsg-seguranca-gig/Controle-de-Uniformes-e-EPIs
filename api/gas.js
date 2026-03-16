// /api/gas.js
const allowOrigin='*';
export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin',allowOrigin);
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-app-gateway-key');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin',allowOrigin);

  const GAS=(process.env.GAS_ENDPOINT?.trim())||(process.env.GAS_WEBAPP_URL?.trim())||'';
  if(!GAS){return res.status(500).json({ok:false,error:'Defina GAS_ENDPOINT (ou GAS_WEBAPP_URL) na Vercel.'});}

  try{
    const {method,query}=req;
    const params=new URLSearchParams(query);

    // Injeção automática da key (se seu GAS exigir)
    const key=process.env.APP_GATEWAY_KEY?.trim();
    if(key && !params.has('key')) params.set('key',key);

    const url=`${GAS}?${params.toString()}`;

    // Encaminhar headers úteis (opcional)
    const fwd={};
    const auth=req.headers['authorization']; if(auth) fwd['authorization']=auth;
    const xk=req.headers['x-app-gateway-key']; if(xk) fwd['x-app-gateway-key']=xk;

    let up;
    if(method==='GET'){
      up=await fetch(url,{redirect:'follow',headers:fwd});
    } else if(method==='POST'){
      const bodyText=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});
      up=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain',...fwd},body:bodyText,redirect:'follow'});
    } else {
      return res.status(405).json({ok:false,error:`Método não suportado: ${method}`});
    }

    const text=await up.text();
    try{
      const json=JSON.parse(text);
      res.setHeader('Content-Type','application/json; charset=utf-8');
      if(method==='GET') res.setHeader('Cache-Control','s-maxage=15, stale-while-revalidate=60');
      return res.status(up.ok?up.status:502).send(json);
    }catch{
      res.setHeader('Content-Type','text/plain; charset=utf-8');
      return res.status(502).send(text);
    }
  }catch(e){
    console.error('[api/gas] error:',e);
    return res.status(502).json({ok:false,error:'Falha ao contatar GAS',detail:String(e)});
  }
}