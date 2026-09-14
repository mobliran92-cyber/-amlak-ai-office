const express=require("express");
const session=require("express-session");
const pgSession=require("connect-pg-simple")(session);
const bcrypt=require("bcryptjs");
const {Pool}=require("pg");
const path=require("path");
const app=express();
const PORT=process.env.PORT||10000;
if(!process.env.DATABASE_URL) console.warn("DATABASE_URL is not set");
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes("render.com")?{rejectUnauthorized:false}:undefined});
app.use(express.json({limit:"2mb"}));
app.use(session({
 store:new pgSession({pool,tableName:"user_sessions",createTableIfMissing:true}),
 secret:process.env.SESSION_SECRET||"CHANGE_ME_SESSION_SECRET",
 resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:1000*60*60*24*14}
}));
async function db(sql,params=[]){return (await pool.query(sql,params)).rows}
async function exec(sql,params=[]){return await pool.query(sql,params)}
async function init(){
 await exec(`CREATE TABLE IF NOT EXISTS staff(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'staff',active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS properties(id BIGSERIAL PRIMARY KEY,title TEXT,purpose TEXT,deal TEXT,city TEXT,neighborhood TEXT,address TEXT,lat DOUBLE PRECISION,lng DOUBLE PRECISION,area NUMERIC,land_area NUMERIC,price NUMERIC,rent NUMERIC,deposit NUMERIC,build_year INT,bedrooms INT,floor TEXT,floors INT,units INT,parking BOOLEAN DEFAULT FALSE,elevator BOOLEAN DEFAULT FALSE,storage BOOLEAN DEFAULT FALSE,deed BOOLEAN DEFAULT FALSE,owner TEXT,phone TEXT,features TEXT,notes TEXT,status TEXT DEFAULT 'active',assigned_to INT REFERENCES staff(id),created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS clients(id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,phone TEXT,purpose TEXT,deal TEXT,city TEXT,neighborhood TEXT,min_area NUMERIC,max_area NUMERIC,min_budget NUMERIC,max_budget NUMERIC,bedrooms INT,must_have TEXT,avoid TEXT,urgency TEXT,assigned_to INT REFERENCES staff(id),notes TEXT,created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS followups(id BIGSERIAL PRIMARY KEY,client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,title TEXT NOT NULL,due_at TIMESTAMPTZ,assigned_to INT REFERENCES staff(id),status TEXT DEFAULT 'open',notes TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE INDEX IF NOT EXISTS idx_prop_status ON properties(status); CREATE INDEX IF NOT EXISTS idx_follow_due ON followups(status,due_at);`);
 const adminEmail=process.env.ADMIN_EMAIL, adminPass=process.env.ADMIN_PASSWORD;
 if(adminEmail&&adminPass){
   const found=await db("SELECT id FROM staff WHERE email=$1",[adminEmail]);
   if(!found.length){const h=await bcrypt.hash(adminPass,12);await exec("INSERT INTO staff(name,email,password_hash,role) VALUES($1,$2,$3,'admin')",["مدیر دفتر",adminEmail,h])}
 }
}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:"AUTH_REQUIRED"});next()}
function admin(req,res,next){if(req.session.user?.role!=="admin")return res.status(403).json({error:"ADMIN_REQUIRED"});next()}
app.post("/api/login",async(req,res)=>{try{const {email,password}=req.body;const a=await db("SELECT id,name,email,password_hash,role FROM staff WHERE lower(email)=lower($1) AND active=true",[email]);if(!a[0]||!(await bcrypt.compare(password,a[0].password_hash)))return res.status(401).json({error:"ایمیل یا رمز عبور اشتباه است"});req.session.user={id:a[0].id,name:a[0].name,email:a[0].email,role:a[0].role};res.json(req.session.user)}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json(req.session.user||null));
app.get("/api/staff",auth,async(req,res)=>res.json(await db("SELECT id,name,email,role,active FROM staff ORDER BY name")));
app.post("/api/staff",auth,admin,async(req,res)=>{const {name,email,password,role="staff"}=req.body;const h=await bcrypt.hash(password,12);const r=await db("INSERT INTO staff(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role",[name,email,h,role]);res.json(r[0])});

app.get("/api/properties",auth,async(req,res)=>res.json(await db("SELECT p.*,s.name assigned_name FROM properties p LEFT JOIN staff s ON s.id=p.assigned_to ORDER BY p.updated_at DESC")));
app.post("/api/properties",auth,async(req,res)=>{const x=req.body;const r=await db(`INSERT INTO properties(title,purpose,deal,city,neighborhood,address,lat,lng,area,land_area,price,rent,deposit,build_year,bedrooms,floor,floors,units,parking,elevator,storage,deed,owner,phone,features,notes,assigned_to) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING id`,[x.title,x.purpose,x.deal,x.city,x.neighborhood,x.address,x.lat||null,x.lng||null,x.area||null,x.land_area||null,x.price||null,x.rent||null,x.deposit||null,x.build_year||null,x.bedrooms||null,x.floor,x.floors||null,x.units||null,!!x.parking,!!x.elevator,!!x.storage,!!x.deed,x.owner,x.phone,x.features,x.notes,x.assigned_to||null]);res.json(r[0])});
app.patch("/api/properties/:id",auth,async(req,res)=>{const x=req.body;await exec(`UPDATE properties SET title=$1,purpose=$2,deal=$3,city=$4,neighborhood=$5,address=$6,area=$7,land_area=$8,price=$9,rent=$10,deposit=$11,build_year=$12,bedrooms=$13,floor=$14,parking=$15,elevator=$16,storage=$17,deed=$18,owner=$19,phone=$20,features=$21,notes=$22,status=$23,updated_at=now() WHERE id=$24`,[x.title,x.purpose,x.deal,x.city,x.neighborhood,x.address,x.area||null,x.land_area||null,x.price||null,x.rent||null,x.deposit||null,x.build_year||null,x.bedrooms||null,x.floor,!!x.parking,!!x.elevator,!!x.storage,!!x.deed,x.owner,x.phone,x.features,x.notes,x.status||"active",req.params.id]);res.json({ok:true})});

app.get("/api/clients",auth,async(req,res)=>res.json(await db("SELECT c.*,s.name assigned_name FROM clients c LEFT JOIN staff s ON s.id=c.assigned_to ORDER BY c.updated_at DESC")));
app.post("/api/clients",auth,async(req,res)=>{const x=req.body;const r=await db(`INSERT INTO clients(name,phone,purpose,deal,city,neighborhood,min_area,max_area,min_budget,max_budget,bedrooms,must_have,avoid,urgency,assigned_to,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,[x.name,x.phone,x.purpose,x.deal,x.city,x.neighborhood,x.min_area||null,x.max_area||null,x.min_budget||null,x.max_budget||null,x.bedrooms||null,x.must_have,x.avoid,x.urgency,x.assigned_to||null,x.notes]);res.json(r[0])});

app.get("/api/followups",auth,async(req,res)=>res.json(await db(`SELECT f.*,c.name client_name,p.title property_title,s.name assigned_name FROM followups f LEFT JOIN clients c ON c.id=f.client_id LEFT JOIN properties p ON p.id=f.property_id LEFT JOIN staff s ON s.id=f.assigned_to ORDER BY f.due_at NULLS LAST`)));
app.post("/api/followups",auth,async(req,res)=>{const x=req.body;const r=await db("INSERT INTO followups(client_id,property_id,title,due_at,assigned_to,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[x.client_id||null,x.property_id||null,x.title,x.due_at||null,x.assigned_to||null,x.notes]);res.json(r[0])});
app.patch("/api/followups/:id",auth,async(req,res)=>{await exec("UPDATE followups SET status=$1 WHERE id=$2",[req.body.status,req.params.id]);res.json({ok:true})});

function score(c,p){let s=0,max=0,why=[];const eq=(a,b,w,l)=>{if(a){max+=w;if(b&&String(a).toLowerCase()==String(b).toLowerCase()){s+=w;why.push(l)}}};eq(c.purpose,p.purpose,25,"کاربری");eq(c.deal,p.deal,15,"نوع معامله");if(c.city){max+=10;if(p.city?.includes(c.city)){s+=10;why.push("شهر")}}if(c.neighborhood){max+=8;if(p.neighborhood?.includes(c.neighborhood)){s+=8;why.push("منطقه")}}if(c.min_area||c.max_area){max+=15;if((!c.min_area||p.area>=c.min_area)&&(!c.max_area||p.area<=c.max_area)){s+=15;why.push("متراژ")}}if(c.min_budget||c.max_budget){max+=15;const v=p.price||p.deposit||p.rent;if(v&&(!c.min_budget||v>=c.min_budget)&&(!c.max_budget||v<=c.max_budget)){s+=15;why.push("بودجه")}}if(c.bedrooms){max+=7;if(Number(p.bedrooms)>=Number(c.bedrooms)){s+=7;why.push("خواب")}}if(c.must_have){max+=5;const m=c.must_have.toLowerCase().split(/[،, ]+/).filter(Boolean),f=(p.features||"").toLowerCase(),hit=m.filter(v=>f.includes(v)).length;if(hit){s+=5*hit/m.length;why.push("امکانات")}}return {score:max?Math.round(s/max*100):0,why}}
app.get("/api/match/:clientId",auth,async(req,res)=>{const c=(await db("SELECT * FROM clients WHERE id=$1",[req.params.clientId]))[0];if(!c)return res.status(404).json({error:"not found"});const p=await db("SELECT * FROM properties WHERE status='active'");res.json(p.map(x=>({...x,...score(c,x)})).sort((a,b)=>b.score-a.score).slice(0,30))});
app.get("/api/search",auth,async(req,res)=>{const s=(req.query.q||"").trim();if(!s)return res.json([]);const l="%"+s+"%";res.json(await db(`SELECT id,title name,city,neighborhood,phone,'ملک' type FROM properties WHERE title ILIKE $1 OR city ILIKE $1 OR neighborhood ILIKE $1 OR address ILIKE $1 OR owner ILIKE $1 OR features ILIKE $1 UNION ALL SELECT id,name,city,neighborhood,phone,'مشتری' FROM clients WHERE name ILIKE $1 OR phone ILIKE $1 OR city ILIKE $1 OR neighborhood ILIKE $1 OR must_have ILIKE $1 LIMIT 50`,[l]))});
app.get("/api/dashboard",auth,async(req,res)=>{const [p,c,f,t]=await Promise.all([db("SELECT count(*) n FROM properties WHERE status='active'"),db("SELECT count(*) n FROM clients"),db("SELECT count(*) n FROM followups WHERE status='open'"),db("SELECT count(*) n FROM followups WHERE status='open' AND due_at::date=CURRENT_DATE")]);res.json({properties:+p[0].n,clients:+c[0].n,openFollowups:+f[0].n,todayFollowups:+t[0].n})});

app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
init().then(()=>app.listen(PORT,"0.0.0.0")).catch(e=>{console.error(e);process.exit(1)});
