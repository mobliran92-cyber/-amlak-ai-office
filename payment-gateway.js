const crypto=require('crypto');

const PROVIDERS={
  global:{id:'global',enabled:false,mode:'adapter',currency:'USD',required_env:['PAYMENT_GLOBAL_PROVIDER','PAYMENT_GLOBAL_SECRET']},
  iran:{id:'iran',enabled:false,mode:'adapter',currency:'IRR',required_env:['PAYMENT_IRAN_PROVIDER','PAYMENT_IRAN_SECRET']}
};
function listProviders(){
 return Object.values(PROVIDERS).map(p=>({...p,configured:p.required_env.every(k=>!!process.env[k])}));
}
function createPaymentRouter({pool}){
 const express=require('express');const r=express.Router();
 r.get('/providers',(req,res)=>res.json(listProviders()));
 r.post('/checkout',async(req,res)=>{
   if(!req.session?.user)return res.status(401).json({error:'AUTH_REQUIRED'});
   const tier=String(req.body?.tier||'plus').toLowerCase(),provider=String(req.body?.provider||'global').toLowerCase();
   if(!['plus','pro','office','enterprise'].includes(tier)||!PROVIDERS[provider])return res.status(400).json({error:'BILLING_INVALID'});
   if(!PROVIDERS[provider].configured)return res.status(503).json({error:'PAYMENT_PROVIDER_NOT_CONFIGURED',provider});
   return res.status(501).json({error:'PAYMENT_ADAPTER_PENDING',provider,tier});
 });
 r.post('/webhook/:provider',express.raw({type:'application/json'}),(req,res)=>{
   const provider=String(req.params.provider||'').toLowerCase();
   if(!PROVIDERS[provider])return res.status(404).json({error:'PROVIDER_NOT_FOUND'});
   // Signature verification and idempotent subscription activation are mandatory before production enablement.
   res.status(501).json({error:'WEBHOOK_ADAPTER_PENDING'});
 });
 return r;
}
module.exports={PROVIDERS,listProviders,createPaymentRouter};