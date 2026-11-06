import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const bundle=await build({stdin:{contents:'export {applyGameAction,initialGameState,prepareGameState} from "./src/lib/game-engine"; export {setBonuses} from "./src/lib/bonus"; export {fishingCursor} from "./src/lib/game-config";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const engine=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const config=JSON.parse(await readFile('php/data/config.json','utf8'));
const now=1762420000000;const cases=[];
function state(){const s=engine.initialGameState(now);Object.assign(s,{level:10,coins:100000,gems:100,energy:100,maxEnergy:100,barnLevel:8,inventory:Object.fromEntries(Object.keys(config.ITEMS).map(k=>[k,2]))});s.plots[0]={crop:'carrot',plantedAt:now-20000,readyAt:now-1,watered:true};s.plots[1]={crop:'wheat',plantedAt:now,readyAt:now+10000,watered:false};s.ponds[0]={species:'carp',startedAt:now-50000,readyAt:now-1,fed:true};s.cages[0]={species:'catfish',startedAt:now-70000,readyAt:now-1,fed:false};s.pens[0]={animal:'chicken',startedAt:now-40000,readyAt:now-1};s.cellar.jobs=[{id:1,recipe:'cheese',readyAt:now-1}];s.cellar.nextJobId=2;s.mines.copper={depth:4,lastAt:0};s.diamond={depth:0,lastAt:0};s.job={key:'courier',startedAt:now-40000,readyAt:now-1};s.orders={day:'2025-11-06',items:[{id:'test',itemKey:'carrot',quantity:2,rewardCoins:100,rewardXp:20}],completed:[]};s.stats={harvested:20,fishCaught:20,mined:20,produced:20,earned:10000,orders:20,collected:20};s.season.base=0;s.season.premium=true;s.elysium.aether=5;return s;}
function add(action,random=[.2,.3,.4,.5,.6],bonuses=[],mutate=()=>{}){const s=state();mutate(s);cases.push({state:s,action,now,random,bonuses});}
const actions=[
 {type:'plant',index:2,crop:'carrot'},{type:'water',index:1},{type:'harvest',index:0},
 {type:'pond-start',index:1,species:'carp'},{type:'pond-feed',index:0},{type:'pond-collect',index:0},
 {type:'cage-start',index:0,species:'catfish'},{type:'cage-feed',index:0},{type:'cage-collect',index:0},
 {type:'pen-start',index:1,animal:'chicken'},{type:'pen-collect',index:0},
 {type:'cellar-start',recipe:'cheese'},{type:'cellar-collect',id:1},
 {type:'mine',mine:'copper'},{type:'diamond-mine'},{type:'fish-start'},{type:'fish-catch'},
 {type:'job-start',job:'courier'},{type:'job-finish'},{type:'shop-buy',item:'carrot_seed',quantity:3},{type:'npc-sell',item:'carrot',quantity:2},
 {type:'use-item',item:'honey_cake'},{type:'upgrade',kind:'garden'},{type:'upgrade',kind:'energy'},{type:'order-fulfill',id:'test'},
 {type:'promo-claim'},{type:'promo-buy',id:'starter'},{type:'elysium-ritual',blessing:'harvest'},{type:'elysium-ascend'},
 {type:'achievement-claim',id:'harvest10'},{type:'news-read',id:'welcome'},{type:'season-premium'},{type:'season-claim',track:'free',level:1},{type:'season-claim',track:'premium',level:10},
 {type:'plant',index:-1,crop:'carrot'},{type:'shop-buy',item:'carrot_seed',quantity:999},{type:'harvest',index:1},{type:'unknown'}
];
const bonuses=['xp','yield','speed','sell','reward','mine','energy','discount'].map((kind,id)=>({id,title:kind,kind,multiplier:2,startsAt:now-1,endsAt:now+100000,active:true}));
for(const action of actions){add(action);add(action,[.2,.3,.4,.5,.6],bonuses);}

const full=s=>{s.inventory={feed:s.barnLevel*0+9999};};
add({type:'animal-buy',animal:'golden_goose'});add({type:'animal-buy',animal:'chicken'});add({type:'animal-buy',animal:'phoenix'},[.2],[],s=>{s.gems=10;});
add({type:'animal-buy',animal:'golden_goose'},[.2],[],s=>{s.claimedPromos=['animal:golden_goose'];});
add({type:'pen-start',index:1,animal:'golden_goose'});add({type:'pen-start',index:1,animal:'golden_goose'},[.2],[],s=>{s.claimedPromos=['animal:golden_goose'];});
add({type:'pen-start',index:1,animal:'alpaca'});add({type:'plant',index:2,crop:'golden_wheat'},[.2],[],s=>{s.inventory.golden_wheat_seed=1;});
add({type:'shop-buy-gems',item:'golden_wheat_seed',quantity:2});add({type:'shop-buy-gems',item:'carrot_seed',quantity:1});add({type:'shop-buy-gems',item:'koi_fry',quantity:50});
add({type:'shop-buy',item:'golden_wheat_seed',quantity:1});add({type:'shop-buy',item:'beet_seed',quantity:1});
for(const roll of [.01,.3,.5,.62,.75,.86,.93,.999])add({type:'wheel-spin'},[roll]);
for(const roll of [.01,.3,.75])add({type:'wheel-spin'},[roll],[],s=>{s.wheel.freeDay='2025-11-06';});
add({type:'wheel-spin'},[.3],[],s=>{s.wheel.freeDay='2025-11-06';s.wheel.paidDay='2025-11-06';s.wheel.paidToday=10;});
add({type:'wheel-spin'},[.3],[],s=>{s.wheel.freeDay='2025-11-06';s.gems=1;});
add({type:'wheel-spin'},[.3],[],s=>{s.wheel.freeDay='2025-11-05';s.wheel.paidDay='2025-11-05';s.wheel.paidToday=10;});
add({type:'wheel-spin'},[.2],[],s=>{s.inventory={feed:s.barnLevel*0+10};s.barnLevel=0;});
add({type:'pvz-start'});add({type:'pvz-start'},[.2],[],s=>{s.energy=2;});
add({type:'pvz-finish',waves:3,win:false});
for(const [waves,win,ago] of [[3,false,60000],[3,false,20000],[0,false,1000],[10,true,300000],[10,false,300000],[7,true,200000],[11,false,300000],[5,false,9000000]])add({type:'pvz-finish',waves,win},[.2],[],s=>{s.pvz.startedAt=now-ago;});
add({type:'pvz-finish',waves:10,win:true},[.2],[],s=>{s.pvz.startedAt=now-300000;s.pvz.winDay='2025-11-06';});
add({type:'fish-start'},[.1,.5,.2,.9]);add({type:'fish-start'},[.99,.5,.2,.9],[],s=>{s.level=3;});
for(const at of [0,-1e9,now-300,now-5000,now+9999,'x',null])add({type:'fish-catch',at},[.2],[],s=>{s.fishing={startedAt:now-1500,expiresAt:now+10000,target:engine.fishingCursor(now-1500,1500,now-300),width:.2,period:1500,species:'carp'};});
add({type:'fish-catch',at:now-100},[.2],[],s=>{s.fishing={startedAt:now-1500,expiresAt:now+10000,target:.5,width:.2,period:1500,species:'carp'};});
add({type:'promo-claim'},[.2],[],s=>{s.claimedPromos=['animal:phoenix',...Array.from({length:25},(_,i)=>`d${i}`)];});
add({type:'fish-catch'},[.2],[],s=>{s.fishing={startedAt:now-500,expiresAt:now+10000,target:engine.fishingCursor(now-500,1000,now),width:.3,period:1000,species:'carp'};});
add({type:'npc-sell',item:'carrot',quantity:2},[.2],[],s=>{s.elysium={blessing:'fortune',until:now+1000,aether:0,lastRitual:0};});
add({type:'harvest',index:0},[.2],[],s=>{s.elysium={blessing:'harvest',until:now+1000,aether:0,lastRitual:0};});
for(const kind of ['barn','pond','pen','cage','cellar'])add({type:'upgrade',kind});
for(const s of [engine.initialGameState(now-100000),state()])cases.push({state:s,prepare:true,userId:7,now,action:{type:'news-read',id:'welcome'},random:[.2]});
for(const ago of [1000,119999,149999,150000,180000])add({type:'fish-start'},[.2,.3,.4,.5],[],s=>{s.lastCastAt=now-ago;});
add({type:'fish-start'},[.2,.3,.4,.5],[],s=>{s.lastCastAt=now-1000;s.energy=2;});
for(const lastCastAt of [undefined,now-1000,now-160000])cases.push({state:{...state(),lastCastAt,fishing:{startedAt:now-200000,expiresAt:now-188000,target:.5,width:.3,period:1500,species:'carp'}},prepare:true,userId:7,now,action:{type:'fish-start'},random:[.2,.3,.4,.5]});
const phpInput=JSON.stringify({config,cases});
const expected=cases.map(c=>{engine.setBonuses(c.bonuses??[]);try{const s=c.prepare?engine.prepareGameState(c.state,c.userId,c.now):c.state;let i=0;return engine.applyGameAction(s,c.action,c.now,()=>c.random[i++]??.5);}catch(e){return {error:e.message};}});
const run=spawnSync('php',['-d','memory_limit=1G','php/tests/engine-check.php'],{input:phpInput,maxBuffer:20*1024*1024,encoding:'utf8'});if(run.stderr) console.error(run.stderr.slice(0,4000));const stdout=run.stdout??'';if(!stdout.length) throw new Error('Empty PHP engine output: '+run.status+' '+run.signal+' '+run.error);const actual=JSON.parse(stdout);
function normalize(v){if(Array.isArray(v))return v.map(normalize);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalize(x)]));return v;}

for(let i=0;i<cases.length;i++){try{assert.deepEqual(normalize(actual[i]),normalize(expected[i]));}catch(e){console.error('Case',i,cases[i].action,'PHP',actual[i],'TS',expected[i]);throw e;}}
console.log(`PHP engine parity: ${cases.length}/${cases.length} cases passed`);
