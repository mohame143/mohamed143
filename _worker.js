const SUPABASE_ORIGIN = 'https://zrayhyxiwukimzmcrez.supabase.co';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info, x-upsert, cache-control',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
};

function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...CORS}});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:CORS});

    if (url.pathname === '/sb-health') return json({ok:true, proxy:true, supabase:SUPABASE_ORIGIN});

    if (url.pathname === '/sb' || url.pathname.startsWith('/sb/')) {
      const path = url.pathname.slice(3) || '/';
      const upstream = SUPABASE_ORIGIN + path + url.search;
      const h = new Headers();
      for (const name of ['apikey','authorization','content-type','x-client-info','x-upsert','cache-control','accept']) {
        const value = request.headers.get(name);
        if (value) h.set(name,value);
      }
      if (!h.has('accept')) h.set('accept','application/json');
      let body;
      if (!['GET','HEAD'].includes(request.method)) body = await request.arrayBuffer();
      try {
        const r = await fetch(upstream,{method:request.method,headers:h,body,redirect:'manual'});
        const outHeaders = new Headers();
        for (const [k,v] of r.headers) {
          const lk=k.toLowerCase();
          if (!['content-length','content-encoding','transfer-encoding','connection'].includes(lk)) outHeaders.set(k,v);
        }
        for (const [k,v] of Object.entries(CORS)) outHeaders.set(k,v);
        outHeaders.set('Cache-Control','no-store');
        const bytes = await r.arrayBuffer();
        return new Response(bytes,{status:r.status,statusText:r.statusText,headers:outHeaders});
      } catch (e) {
        return json({error:'proxy_fetch_failed',message:String(e?.message||e)},502);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
