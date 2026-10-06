// The anon JWT is public gateway identification; the private worker token remains mandatory.
const CANONICAL_ORIGIN='https://awqfpnzqwfjrjefoktgd.supabase.co';
const PUBLIC_ANON_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cWZwbnpxd2ZqcmplZm9rdGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzY0MzQsImV4cCI6MjEwNTA1MjQzNH0.T3FFElqBw4mb6mvh_WkfS35CNAsacPimiGG2H9J2G7E";
export function workerBase(value=CANONICAL_ORIGIN){const u=new URL(value);if(u.origin!==CANONICAL_ORIGIN||!['','/'].includes(u.pathname)||u.search||u.hash||u.username||u.password)throw new Error('Worker requires the canonical PPPP origin');return CANONICAL_ORIGIN;}
export function workerHeaders(workerId,token,{json=false}={}){
 if(!workerId||!token)throw new Error('Existing local PPPP worker ID and token are required');
 const key=process.env.SUPABASE_ANON_KEY||PUBLIC_ANON_JWT;
 let role;try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString('utf8')).role;}catch{}
 if(role!=='anon')throw new Error('SUPABASE_ANON_KEY must be a public legacy anon JWT, never a secret/service-role key');
 return {apikey:key,Authorization:`Bearer ${key}`,'x-pppp-worker-id':workerId,'x-pppp-worker-token':token,...(json?{'Content-Type':'application/json'}:{})};
}
