const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const fs=require("fs"); const path=require("path");
const app=express(); const PORT=process.env.PORT||10000;
const DB_FILE=process.env.DATA_FILE||path.join(__dirname,"data.json");
const empty={staff:[],properties:[],clients:[],followups:[],seq:{staff:1,properties:1,clients:1,followups:1}};
function load(){try{return JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}catch{return JSON.parse(JSON.stringify(empty))}}
let store=load();
function save(){fs.writeFileSync(DB_FILE,JSON.stringify(store,null,2))}
function next(k){return store.seq[k]++}
app.use(express.json({limit:"2mb"}));
app.use(session({secret:process.env.SESSION_SECRET||"change-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:1000*60*60*24*14}}));
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:"AUTH_REQUIRED"});next()}
function admin(req,res,next){if(req.session.user?.role!=="admin")return res.status(403).json({error:"ADMIN_REQUIRED"});next()}
function init(){const email=process.env.ADMIN_EMAIL,pass=process.env.ADMIN_PASSWORD;if(email&&pass&&!store.staff.some(x=>x.email.toLowerCase()===email.toLowerCase())){store.staff.push({id:next("staff"),name:"مدیر دفتر",email,password_hash:bcrypt.hashSync(pass,12),role:"admin",active:true,created_at:new Date().toISOString()});save()}}
init();
app.post("/api/login",async(req,res)=>{const {email,password}=req.body||{};const a=store.staff.find(x=>x.active&&x.email.toLowerCase()===String(email||"").toLowerCase());if(!a||!(await bcrypt.compare(password||"",a.password_hash)))return res.status(401).json({error:"ایمیل یا رمز عبور اشتباه است"});req.session.user={id:a.id,name:a.name,email:a.email,role:a.role};res.json(req.session.user)});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true}))); app.get("/api/me",(req,res)=>res.json(req.session.user||null));
app.get("/api/staff",auth,(req,res)=>res.json(store.staff.map(({password_hash,...x})=>x).sort((a,b)=>a.name.localeCompare(b.name))));
app.post("/api/staff",auth,admin,(req,res)=>{const {name,email,password,role="staff"}=req.body;const x={id:next("staff"),name,email,password_hash:bcrypt.hashSync(password,12),role,active:true,created_at:new Date().toISOString()};store.staff.push(x);save();const {password_hash,...safe}=x;res.json(safe)});
app.get("/api/properties",auth,(req,res)=>res.json(store.properties.map(p=>({...p,assigned_name:store.staff.find(s=>s.id===p.assigned_to)?.name||null})).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))));
app.post("/api/properties",auth,(req,res)=>{const x=req.body||{},now=new Date().toISOString();const p={...x,id:next("properties"),lat:x.lat||null,lng:x.lng||null,status:x.status||"active",assigned_to:x.assigned_to||null,created_at:now,updated_at:now};store.properties.push(p);save();res.json({id:p.id})});
app.patch("/api/properties/:id",auth,(req,res)=>{const i=store.properties.findIndex(x=>x.id==req.params.id);if(i<0)return res.status(404).json({error:"not found"});store.properties[i]={...store.properties[i],...req.body,updated_at:new Date().toISOString()};save();res.json({ok:true})});
app.get("/api/clients",auth,(req,res)=>res.json(store.clients.map(c=>({...c,assigned_name:store.staff.find(s=>s.id===c.assigned_to)?.name||null})).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))));
app.post("/api/clients",auth,(req,res)=>{const x=req.body||{},now=new Date().toISOString();const c={...x,id:next("clients"),assigned_to:x.assigned_to||null,created_at:now,updated_at:now};store.clients.push(c);save();res.json({id:c.id})});
app.get("/api/followups",auth,(req,res)=>res.json(store.followups.map(f=>({...f,client_name:store.clients.find(c=>c.id==f.client_id)?.name||null,property_title:store.properties.find(p=>p.id==f.property_id)?.title||null,assigned_name:store.staff.find(s=>s.id==f.assigned_to)?.name||null})).sort((a,b)=>String(a.due_at||"").localeCompare(String(b.due_at||""))));
app.post("/api/followups",auth,(req,res)=>{const x=req.body||{},f={...x,id:next("followups"),status:"open",created_at:new Date().toISOString()};store.followups.push(f);save();res.json({id:f.id})});
app.patch("/api/followups/:id",auth,(req,res)=>{const f=store.followups.find(x=>x.id==req.params.id);if(!f)return res.status(404).json({error:"not found"});f.status=req.body.status||f.status;save();res.json({ok:true})});
function score(c,p){let s=0,max=0,why=[];const eq=(a,b,w,l)=>{if(a){max+=w;if(b&&String(a).toLowerCase()==String(b).toLowerCase()){s+=w;why.push(l)}}};eq(c.purpose,p.purpose,25,"کاربری");eq(c.deal,p.deal,15,"نوع معامله");if(c.city){max+=10;if(String(p.city||"").includes(c.city)){s+=10;why.push("شهر")}}if(c.neighborhood){max+=8;if(String(p.neighborhood||"").includes(c.neighborhood)){s+=8;why.push("منطقه")}}if(c.min_area||c.max_area){max+=15;if((!c.min_area||Number(p.area)>=Number(c.min_area))&&(!c.max_area||Number(p.area)<=Number(c.max_area))){s+=15;why.push("متراژ")}}if(c.min_budget||c.max_budget){max+=15;const v=Number(p.price||p.deposit||p.rent);if(v&&(!c.min_budget||v>=Number(c.min_budget))&&(!c.max_budget||v<=Number(c.max_budget))){s+=15;why.push("بودجه")}}if(c.bedrooms){max+=7;if(Number(p.bedrooms)>=Number(c.bedrooms)){s+=7;why.push("خواب")}}return {score:max?Math.round(s/max*100):0,why}}
app.get("/api/match/:clientId",auth,(req,res)=>{const c=store.clients.find(x=>x.id==req.params.clientId);if(!c)return res.status(404).json({error:"not found"});res.json(store.properties.filter(x=>x.status==="active").map(p=>({...p,...score(c,p)})).sort((a,b)=>b.score-a.score).slice(0,30))});
app.get("/api/search",auth,(req,res)=>{const s=String(req.query.q||"").trim().toLowerCase();if(!s)return res.json([]);const hit=v=>String(v||"").toLowerCase().includes(s);const p=store.properties.filter(x=>[x.title,x.city,x.neighborhood,x.address,x.owner,x.features].some(hit)).map(x=>({id:x.id,name:x.title,city:x.city,neighborhood:x.neighborhood,phone:x.phone,type:"ملک"}));const c=store.clients.filter(x=>[x.name,x.phone,x.city,x.neighborhood,x.must_have].some(hit)).map(x=>({id:x.id,name:x.name,city:x.city,neighborhood:x.neighborhood,phone:x.phone,type:"مشتری"}));res.json([...p,...c].slice(0,50))});
app.get("/api/dashboard",auth,(req,res)=>{const today=new Date().toISOString().slice(0,10);res.json({properties:store.properties.filter(x=>x.status==="active").length,clients:store.clients.length,openFollowups:store.followups.filter(x=>x.status==="open").length,todayFollowups:store.followups.filter(x=>x.status==="open"&&String(x.due_at||"").slice(0,10)===today).length})});
app.use(express.static(path.join(__dirname,"public"))); app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log(`Amlak AI Office running on ${PORT}`));
