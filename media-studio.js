const express=require('express');
const crypto=require('crypto');
const {requireTier,newId}=require('./foundation');

function createMediaRouter({pool}){
 const r=express.Router();
 const own=async(req,propertyId)=>{
   const p=(await pool.query('SELECT data FROM app_state WHERE id=1')).rows[0]?.data?.properties||[];
   const x=p.find(v=>Number(v.id)===Number(propertyId));
   if(!x)return null;
   if(req.session.user.role!=='admin'&&x.assigned_to&&Number(x.assigned_to)!==Number(req.session.user.id))return null;
   return x;
 };
 r.get('/properties/:id/media-assets',requireTier('plus'),async(req,res)=>{
   const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});
   res.json((p.media||[]).map(m=>({id:m.id,type:m.type,name:m.name,url:m.url,thumbnail:m.thumb_url,size:m.size,created_at:m.created_at,metadata:m.metadata||{}})));
 });
 r.post('/properties/:id/auto-layout',requireTier('plus'),async(req,res)=>{
   const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});
   const ids=Array.isArray(req.body?.media_ids)?req.body.media_ids.map(String):(p.media||[]).map(m=>String(m.id));
   const id=newId();
   await pool.query('INSERT INTO media_jobs(id,property_id,user_id,media_asset_ids,job_type,params,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,p.id,req.session.user.id,JSON.stringify(ids),'auto_layout',JSON.stringify({room_labels:req.body?.room_labels||true,order:req.body?.order||'ai',primary:req.body?.primary||'ai'}),'queued']);
   res.status(202).json({job_id:id,status:'queued',message:'رسانه‌ها برای چیدمان هوشمند ثبت شدند. موتور پردازش تصویر باید از طریق Media Provider متصل شود.'});
 });
 r.post('/properties/:id/tours',requireTier('plus'),async(req,res)=>{
   const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});
   const id=newId();const name=String(req.body?.name||'تور مجازی ملک');const config={media_ids:req.body?.media_ids||((p.media||[]).map(m=>m.id)),music:req.body?.music||null,transition:req.body?.transition||'smooth',captions:req.body?.captions!==false,cover:req.body?.cover||null,brand:req.body?.brand!==false};
   await pool.query('INSERT INTO virtual_tours(id,property_id,user_id,name,engine,status,config) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,p.id,req.session.user.id,name,'internal','draft',JSON.stringify(config)]);
   res.status(201).json({id,status:'draft',config,render_status:'awaiting_renderer'});
 });
 r.get('/properties/:id/tours',requireTier('plus'),async(req,res)=>{const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});const x=await pool.query('SELECT * FROM virtual_tours WHERE property_id=$1 ORDER BY created_at DESC',[p.id]);res.json(x.rows)});
 r.post('/properties/:id/design-scenarios',requireTier('plus'),async(req,res)=>{
   const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});
   const id=newId();const materials={wall_color:req.body?.wall_color||null,floor:req.body?.floor||null,cabinet:req.body?.cabinet||null,wallpaper:req.body?.wallpaper||null,lighting:req.body?.lighting||null,furniture:req.body?.furniture||null,facade:req.body?.facade||null};
   const prompt=String(req.body?.prompt||'');
   await pool.query('INSERT INTO design_scenarios(id,property_id,user_id,name,source_media_id,room_type,style,materials,prompt,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,p.id,req.session.user.id,String(req.body?.name||'سناریوی طراحی AI'),req.body?.source_media_id||null,req.body?.room_type||'interior',req.body?.style||'modern',JSON.stringify(materials),prompt,'queued']);
   res.status(202).json({id,status:'queued',scenario:{materials,prompt},note:'برای رندر فوتورئال باید Image/3D Provider مجاز متصل باشد.'});
 });
 r.get('/properties/:id/design-scenarios',requireTier('plus'),async(req,res)=>{const p=await own(req,req.params.id);if(!p)return res.status(404).json({error:'PROPERTY_NOT_FOUND'});const x=await pool.query('SELECT * FROM design_scenarios WHERE property_id=$1 ORDER BY created_at DESC',[p.id]);res.json(x.rows)});
 r.post('/jobs/:id/cancel',requireTier('plus'),async(req,res)=>{const id=String(req.params.id);const t=await pool.query("UPDATE media_jobs SET status='cancelled',finished_at=now() WHERE id=$1 AND status IN ('queued','running') RETURNING id",[id]);if(!t.rows[0])return res.status(404).json({error:'MEDIA_JOB_NOT_FOUND'});res.json({ok:true,status:'cancelled'})});
 return r;
}
module.exports={createMediaRouter};