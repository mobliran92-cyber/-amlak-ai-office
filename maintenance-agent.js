const crypto=require('crypto');
async function runMaintenance(pool){
 const id=crypto.randomUUID();const started=Date.now();const findings=[];const repairs=[];
 try{
  const db=await pool.query('SELECT 1 as ok');if(db.rows[0]?.ok===1)findings.push({check:'database',status:'ok'});
  const stale=await pool.query("SELECT count(*)::int n FROM missions WHERE status='running' AND updated_at < now()-interval '30 minutes'");
  if(stale.rows[0].n){await pool.query("UPDATE missions SET status='failed',error='STALE_MISSION_AUTO_RECOVERED',finished_at=now(),updated_at=now() WHERE status='running' AND updated_at < now()-interval '30 minutes'");repairs.push({action:'recover_stale_missions',count:stale.rows[0].n});}
  const queued=await pool.query("SELECT count(*)::int n FROM missions WHERE status='queued'");
  findings.push({check:'mission_queue',status:'ok',queued:queued.rows[0].n});
  const schema=await pool.query("SELECT to_regclass('public.missions') IS NOT NULL AS ok");
  findings.push({check:'mission_schema',status:schema.rows[0].ok?'ok':'missing'});
  return {id,status:'completed',duration_ms:Date.now()-started,findings,repairs,policy:'safe_runtime_repairs_only; code_changes_require_owner_approval'};
 }catch(e){return {id,status:'failed',duration_ms:Date.now()-started,error:String(e.message||e),findings,repairs};}
}
function startMaintenanceAgent(pool){
 let busy=false;
 setInterval(async()=>{if(busy)return;busy=true;try{const r=await runMaintenance(pool);if(r.repairs?.length)console.log('[maintenance]',JSON.stringify(r));}finally{busy=false}},300000);
}
module.exports={runMaintenance,startMaintenanceAgent};