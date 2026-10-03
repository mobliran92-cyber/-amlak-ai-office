
const express = require('express');

const AGENTS = [
  {id:'orchestrator',name:'Orchestrator',role:'مدیر ارکستر',capabilities:['route_command','plan_task','delegate','report']},
  {id:'lead-scout',name:'Lead Scout',role:'شکارچی فایل و سرنخ',capabilities:['find_public_listings','deduplicate','extract_listing_fields','build_lead_report']},
  {id:'property-intel',name:'Property Intelligence',role:'هوش ملک',capabilities:['price_analysis','property_analysis','comparison','risk_flags']},
  {id:'matching',name:'Matching Agent',role:'مچینگ',capabilities:['buyer_property_match','agent_property_match','opportunity_match']},
  {id:'crm',name:'CRM Agent',role:'مدیریت مشتری',capabilities:['followup','lead_scoring','pipeline','daily_plan']},
  {id:'content',name:'Content Studio',role:'استودیو محتوا',capabilities:['listing_copy','social_copy','reels_script','brochure_copy']},
  {id:'market',name:'Market Intelligence',role:'هوش بازار',capabilities:['market_scan','price_trends','area_report']},
  {id:'document',name:'Document Agent',role:'اسناد',capabilities:['document_extract','document_checklist','versioning','verification_queue']},
  {id:'construction',name:'Construction Agent',role:'ساخت و ساز',capabilities:['land_feasibility','cost_scenario','unit_mix','project_economics']},
  {id:'design',name:'Design Agent',role:'طراحی',capabilities:['concept','layout_brief','facade_brief','renovation_brief']},
  {id:'investment',name:'Investment Agent',role:'سرمایه‌گذاری',capabilities:['roi','scenario','liquidity','opportunity_compare']},
  {id:'qa',name:'QA / Self-Healing',role:'کنترل کیفیت',capabilities:['health_check','regression_plan','risk_report','rollback_plan']}
];

const ROUTES = [
  {agent:'lead-scout',patterns:[/فایل|آگهی|ملک.*پیدا|پیدا.*ملک|سرنخ|لید|پلاک\s*ثبتی|مالک|آدرس.*ملک/i],action:'search_public_property_sources'},
  {agent:'property-intel',patterns:[/قیمت|ارزش|تحلیل.*ملک|مقایسه|رشد|نقدشوندگی/i],action:'analyze_property'},
  {agent:'matching',patterns:[/مچ|مطابقت|مناسب.*مشتری|مشتری.*مناسب/i],action:'match'},
  {agent:'crm',patterns:[/پیگیری|مشتری|تماس|فالو.?آپ|یادآوری/i],action:'crm_task'},
  {agent:'content',patterns:[/آگهی.*بنویس|متن.*آگهی|اینستاگرام|تلگرام|کپشن|ریلز|بروشور/i],action:'create_content'},
  {agent:'market',patterns:[/بازار|منطقه|محله.*تحلیل|روند.*قیمت/i],action:'market_scan'},
  {agent:'document',patterns:[/سند|مدرک|پلاک\s*ثبتی|قرارداد|مجوز|استعلام/i],action:'document_task'},
  {agent:'construction',patterns:[/ساخت|ساختمان|طبقه|واحد|پارکینگ|هزینه.*ساخت/i],action:'construction_plan'},
  {agent:'design',patterns:[/طراحی|نما|پلان|بازسازی|دکور/i],action:'design_brief'},
  {agent:'investment',patterns:[/سرمایه.?گذاری|ROI|سود|بازده|سناریو/i],action:'investment_analysis'},
  {agent:'qa',patterns:[/تست|عیب|باگ|سلامت|کیفیت|بررسی.*سیستم/i],action:'qa_check'}
];

function now(){return new Date().toISOString();}
function jobId(){return 'job_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function parseCount(text){
  const m=String(text).match(/(?:بیست|ده|پنج|\d+)\s*(?:تا|فایل|آگهی|ملک|مورد)?/);
  if(!m)return null;
  const first=m[0].trim().split(/\s+/)[0], words={بیست:20,ده:10,پنج:5};
  const n=words[first]||Number(first);
  return Number.isFinite(n)&&n>0?Math.min(n,100):null;
}
function parseCommand(command){
  const text=String(command||'').trim();
  let route=ROUTES.find(r=>r.patterns.some(p=>p.test(text)));
  if(/فایل|آگهی|پیدا.*کن|پیدا.*بکن/i.test(text))route=ROUTES[0];
  const count=parseCount(text);
  const cities=['تهران','گرگان','مشهد','اصفهان','شیراز','تبریز','کرج','قم','رشت','ساری','بابل','آمل','نوشهر','چالوس','نور','محمودآباد','فرانکفورت','برلین'];
  const city=cities.find(x=>text.includes(x))||null;
  const m=text.match(/(?:در|توی|تو)\s+([^،,.]+?)(?:\s+(?:پیدا|بیست|ده|پنج)|$)/);
  const location=(m&&m[1]||'').trim()||null;
  const sources=[];
  if(/دیوار/i.test(text))sources.push('divar');
  if(/شیپور/i.test(text))sources.push('sheypoor');
  if(/اینستاگرام|instagram/i.test(text))sources.push('instagram');
  return {
    raw:text,agent:route?route.agent:'orchestrator',action:route?route.action:'plan_task',
    target_count:count,city,location,sources:sources.length?sources:['public_web'],
    requested_fields:{title:true,property_type:true,area:true,deal:true,price:true,city:true,neighborhood:true,address:true,owner_name:/مالک/.test(text),registration_plate:/پلاک\s*ثبتی/.test(text),phone:/تلفن|شماره|موبایل/.test(text)},
    created_at:now()
  };
}
function buildLeadScoutResult(task){
  return {
    mode:'source_adapter_required',
    message:'وظیفه به Lead Scout تحویل شد؛ برای جمع‌آوری واقعی باید منبع مجاز یا اتصال API برای هر منبع فعال باشد.',
    target_count:task.target_count||20,city:task.city,location:task.location,sources:task.sources,fields:task.requested_fields,
    source_policy:[
      'فقط داده‌های عمومی یا داده‌هایی که دفتر مجوز دسترسی به آن‌ها دارد.',
      'عدم دور زدن CAPTCHA، ورود، paywall یا محدودیت فنی منبع.',
      'مالک، آدرس و پلاک ثبتی فقط از منبع قانونی و قابل استناد؛ در غیر این صورت خالی و نیازمند تأیید.',
      'ثبت source_url، زمان مشاهده، آخرین مشاهده و hash برای حذف تکراری‌ها.'
    ],
    next_adapters:['DIVAR_API_OR_PERMITTED_FEED','SHEYPOR_API_OR_PERMITTED_FEED','META_PUBLIC_API','AUTHORIZED_PROPERTY_REGISTRY']
  };
}
function createRouter(opts){
  const router=express.Router(),pool=opts.pool,isAdmin=opts.isAdmin;
  let ready=false;
  async function ensure(){
    if(ready)return;
    await pool.query('CREATE TABLE IF NOT EXISTS agent_jobs (id TEXT PRIMARY KEY,user_id BIGINT,agent_id TEXT NOT NULL,action TEXT NOT NULL,status TEXT NOT NULL,command TEXT NOT NULL,task JSONB NOT NULL,result JSONB,error TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),started_at TIMESTAMPTZ,finished_at TIMESTAMPTZ)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_agent_jobs_created ON agent_jobs(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_agent_jobs_user ON agent_jobs(user_id,created_at DESC)');
    ready=true;
  }
  router.use(async(req,res,next)=>{try{await ensure();next();}catch(e){next(e);}});
  router.get('/',(req,res)=>res.json({agents:AGENTS,command_examples:['برو ۲۰ فایل در دخانیات پیدا کن با مشخصات ملک و منبع','برای این ملک تحلیل قیمت و سرمایه‌گذاری بده','برای مشتری‌های امروز پیگیری بساز','این سیستم را تست کن و ایرادهای مهم را گزارش بده']}));
  router.get('/jobs',async(req,res)=>{
    const params=[];let where='';
    if(!isAdmin(req)){where='WHERE user_id=$1';params.push(req.session.user.id);}
    const q='SELECT id,agent_id,action,status,command,task,result,error,created_at,started_at,finished_at FROM agent_jobs '+where+' ORDER BY created_at DESC LIMIT 100';
    const r=await pool.query(q,params);res.json(r.rows);
  });
  router.get('/jobs/:id',async(req,res)=>{
    const r=await pool.query('SELECT * FROM agent_jobs WHERE id=$1',[req.params.id]),j=r.rows[0];
    if(!j)return res.status(404).json({error:'AGENT_JOB_NOT_FOUND'});
    if(!isAdmin(req)&&Number(j.user_id)!==Number(req.session.user.id))return res.status(403).json({error:'FORBIDDEN'});
    res.json(j);
  });
  router.post('/command',async(req,res)=>{
    const command=String(req.body&&req.body.command||'').trim();
    if(!command)return res.status(400).json({error:'COMMAND_REQUIRED'});
    const task=parseCommand(command),id=jobId();
    await pool.query('INSERT INTO agent_jobs(id,user_id,agent_id,action,status,command,task) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,req.session.user.id,task.agent,task.action,'queued',command,JSON.stringify(task)]);
    const result=task.action==='search_public_property_sources'?buildLeadScoutResult(task):{mode:'planned',message:'وظیفه ساخته شد و برای اجرای ابزار تخصصی آماده است.',agent:task.agent,action:task.action,task};
    await pool.query('UPDATE agent_jobs SET status=$2,result=$3,started_at=now(),finished_at=now() WHERE id=$1',[id,'planned',JSON.stringify(result)]);
    res.status(202).json({job_id:id,status:'planned',agent:task.agent,action:task.action,result});
  });
  router.post('/jobs/:id/cancel',async(req,res)=>{
    const r=await pool.query('SELECT * FROM agent_jobs WHERE id=$1',[req.params.id]),j=r.rows[0];
    if(!j)return res.status(404).json({error:'AGENT_JOB_NOT_FOUND'});
    if(!isAdmin(req)&&Number(j.user_id)!==Number(req.session.user.id))return res.status(403).json({error:'FORBIDDEN'});
    if(['finished','failed','cancelled'].includes(j.status))return res.status(409).json({error:'JOB_ALREADY_FINAL'});
    await pool.query('UPDATE agent_jobs SET status=$2,finished_at=now() WHERE id=$1',[j.id,'cancelled']);
    res.json({ok:true,status:'cancelled'});
  });
  return router;
}
module.exports={AGENTS,parseCommand,createRouter};
