const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const pkg=require('../package.json');

test('package has production start and required dependencies',()=>{
  assert.equal(pkg.scripts.start,'node server.js');
  for(const x of ['express','express-session','pg','multer','sharp','@aws-sdk/client-s3']) assert.ok(pkg.dependencies[x]);
});

test('server exposes upgraded routes',()=>{
  const s=fs.readFileSync(require('path').join(__dirname,'..','server.js'),'utf8');
  for(const x of ['/api/property-types','/api/properties/:id/media','/api/properties/:id/map','/api/ai/property-parse','/api/agents']) assert.ok(s.includes(x));
});

test('scalable mission foundation is wired',()=>{
  const s=fs.readFileSync(require('path').join(__dirname,'..','server.js'),'utf8');
  assert.ok(s.includes("ensureFoundation(pool)"));
  assert.ok(s.includes("startMissionWorker(pool)"));
  const a=fs.readFileSync(require('path').join(__dirname,'..','agents.js'),'utf8');
  for(const x of ['missions','mission_tasks','mission_events','FOR UPDATE SKIP LOCKED','requireTier(\'pro\')']) assert.ok(a.includes(x));
});
test('command center is Pro gated in UI',()=>{
  const s=fs.readFileSync(require('path').join(__dirname,'..','public','index.html'),'utf8');
  assert.ok(s.includes("me.subscription_tier==='pro'"));
  assert.ok(s.includes("/api/subscription"));
});
