import { sessionConfig,verifySessionToken } from '../../../lib/auth';
import { validate } from '../../../lib/larousse.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 const reply=(d,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 const cookie=request.cookies?.get(sessionConfig.cookieName)?.value;
 if(!process.env.SESSION_SECRET||!cookie||!await verifySessionToken(cookie,process.env.SESSION_SECRET))return reply({error:'Sesión requerida'},401);
 const url=new URL(request.url),month=url.searchParams.get('month'),branch=url.searchParams.get('branch');
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month||'')||(branch&&!/^[a-f0-9-]{36}$/.test(branch)))return reply({error:'Filtros inválidos'},400);
 try{const base=new URL(process.env.FINANCE_BI_URL);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('CONFIG');base.searchParams.set('month',month);if(branch)base.searchParams.set('branch',branch);const r=await fetch(base,{headers:{Authorization:'Bearer '+process.env.FINANCE_BI_READ_TOKEN},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('UPSTREAM');return reply(validate(await r.json(),month,branch));}catch{return reply({error:'No fue posible consultar Finance. Reintenta.'},502)}
}
