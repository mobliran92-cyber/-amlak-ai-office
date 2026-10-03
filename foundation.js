const crypto=require('crypto');

const TIERS={FREE:'free',PRO:'pro',OFFICE:'office',ENTERPRISE:'enterprise'};
const TIER_RANK={free:0,pro:1,office:2,enterprise:3};

async function ensureFoundation(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS subscriptions(
    user_id BIGINT PRIMARY KEY,
    tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    provider TEXT,
    external_id TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS missions(
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    command TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS mission_tasks(
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES mission_tasks(id) ON DELETE SET NULL,
    task_key TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    priority INTEGER NOT NULL DEFAULT 50,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    output JSONB,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    locked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(mission_id,task_key)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS mission_events(
    id BIGSERIAL PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES mission_tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS source_adapters(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_missions_user_created ON missions(user_id,created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status,updated_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_queue ON mission_tasks(status,priority DESC,created_at ASC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_mission ON mission_tasks(mission_id,created_at)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_events_mission ON mission_events(mission_id,created_at DESC)');
  await pool.query(`CREATE TABLE IF NOT EXISTS tools_registry(
    id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT true,
    required_tier TEXT NOT NULL DEFAULT 'pro',config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS feature_flags(
    key TEXT PRIMARY KEY,enabled BOOLEAN NOT NULL DEFAULT false,config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS approvals(
    id UUID PRIMARY KEY,user_id BIGINT NOT NULL,mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES mission_tasks(id) ON DELETE CASCADE,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,decision JSONB,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_runs(
    id UUID PRIMARY KEY,mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,task_id UUID REFERENCES mission_tasks(id) ON DELETE SET NULL,
    provider TEXT,model TEXT,request JSONB,result JSONB,status TEXT NOT NULL,latency_ms INTEGER,tokens_in INTEGER,tokens_out INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS idempotency_keys(
    key TEXT PRIMARY KEY,user_id BIGINT NOT NULL,operation TEXT NOT NULL,response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),expires_at TIMESTAMPTZ)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS outbox_events(
    id BIGSERIAL PRIMARY KEY,event_type TEXT NOT NULL,payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),processed_at TIMESTAMPTZ)`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status,created_at)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_runs_mission ON ai_runs(mission_id,created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status,available_at)');

}

function tierRank(tier){return TIER_RANK[String(tier||'free').toLowerCase()]??0;}
function hasTier(tier,required='pro'){return tierRank(tier)>=tierRank(required);}
function userTier(user){if(!user)return 'free';if(user.role==='admin')return 'enterprise';return String(user.subscription_tier||'free').toLowerCase();}
function requireTier(required='pro'){
  return (req,res,next)=>{
    const tier=userTier(req.session?.user);
    if(!hasTier(tier,required))return res.status(402).json({error:'PRO_REQUIRED',required_tier:required,current_tier:tier});
    next();
  };
}
function newId(){return crypto.randomUUID();}
function eventType(type){return String(type||'event').slice(0,80);}
module.exports={TIERS,TIER_RANK,ensureFoundation,tierRank,hasTier,userTier,requireTier,newId,eventType};
