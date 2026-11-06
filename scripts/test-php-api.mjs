import assert from 'node:assert/strict';
const base=process.env.PHP_TEST_URL??'http://127.0.0.1:8080';
const stamp=Date.now().toString(36);const users=[];let checks=0;
async function req(route,{method='GET',body,cookie,raw=false}={}){const r=await fetch(base+'/api/'+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=raw?await r.arrayBuffer():await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function ok(route,options){const r=await req(route,options);assert.equal(r.status,200,`${route}: ${JSON.stringify(r.data).slice(0,300)}`);checks++;return r;}
async function register(name){const r=await ok('auth/register',{method:'POST',body:{username:name,password:'test-password-123',displayName:name}});users.push(name);return r.cookie;}
try{
 await ok('health');const a=await register('pt_a_'+stamp),b=await register('pt_b_'+stamp);
 const ga=await ok('game',{cookie:a}),gb=await ok('game',{cookie:b});const ida=ga.data.user.id,idb=gb.data.user.id;
 assert.equal(ga.data.state.plots.length,6);assert.ok(ga.data.design);assert.ok(ga.data.content);
 await ok('game',{method:'POST',cookie:a,body:{type:'plant',index:0,crop:'carrot'}});
 await ok('game',{method:'POST',cookie:a,body:{type:'water',index:0}});
 const bad=await req('game',{method:'POST',cookie:a,body:{type:'harvest',index:0}});assert.equal(bad.status,400);checks++;
 await ok('game',{method:'POST',cookie:a,body:{type:'shop-buy',item:'carrot_seed',quantity:2}});
 const listed=await ok('game',{method:'POST',cookie:a,body:{type:'market-list',item:'carrot_seed',quantity:2,unitPrice:5}});
 const market=await ok('game',{cookie:b});const lot=market.data.market.find(x=>x.sellerId===ida);assert.ok(lot);
 await ok('game',{method:'POST',cookie:b,body:{type:'market-buy',id:lot.id}});
 const repeat=await req('game',{method:'POST',cookie:b,body:{type:'market-buy',id:lot.id}});assert.equal(repeat.status,400);checks++;
 await ok('social',{method:'POST',cookie:a,body:{type:'mail-send',username:'pt_b_'+stamp,subject:'Привет',body:'Тестовое письмо',item:'wheat_seed',quantity:1}});
 const inbox=await ok('social',{cookie:b});const mail=inbox.data.inbox.find(x=>x.subject==='Привет');assert.ok(mail);
 await ok('social',{method:'POST',cookie:b,body:{type:'mail-claim',id:mail.id}});
 const twice=await req('social',{method:'POST',cookie:b,body:{type:'mail-claim',id:mail.id}});assert.equal(twice.status,400);checks++;
 await ok('social',{method:'POST',cookie:a,body:{type:'topic-create',title:'Тестовая тема',body:'Проверяем форум PHP-версии',category:'Помощь'}});
 await ok('social',{method:'POST',cookie:b,body:{type:'chat-send',body:'Привет из PHP'}});
 await ok('people',{method:'POST',cookie:a,body:{type:'like',id:idb}});
 await ok('people',{method:'POST',cookie:a,body:{type:'friend',id:idb}});
 const friends=await ok('social',{cookie:b});const friendship=friends.data.friends.find(x=>x.requesterId===ida);assert.ok(friendship);
 await ok('social',{method:'POST',cookie:b,body:{type:'friend-respond',id:friendship.id,accept:true}});
 await ok('people?id='+idb,{cookie:a});await ok('rating',{cookie:a});
 const adminLogin=await ok('auth/login',{method:'POST',body:{username:process.env.PHP_TEST_ADMIN_USER??'admin',password:process.env.PHP_TEST_ADMIN_PASSWORD??'PHP-test-admin-2026!'}});const admin=adminLogin.cookie;
 await ok('admin?section=dashboard',{cookie:admin});
 await ok('admin',{method:'POST',cookie:admin,body:{type:'user-resources',id:ida,coins:10000,gems:30,level:5,energy:50,maxEnergy:50}});
 await ok('coop',{method:'POST',cookie:a,body:{type:'create',name:'Тест '+stamp,tag:'T'+stamp.slice(-3),description:'Проверка',icon:'leaf'}});
 await ok('coop',{method:'POST',cookie:a,body:{type:'donate',amount:100}});
 await ok('coop',{cookie:a});
 await ok('workers',{method:'POST',cookie:a,body:{type:'hire',kind:'gardener',hours:8}});
 await ok('workers',{cookie:a});await ok('workers',{method:'POST',cookie:a,body:{type:'toggle',kind:'gardener'}});
 await ok('game',{method:'POST',cookie:a,body:{type:'profile-update',displayName:'PHP Фермер',bio:'Тест',frame:'leaf',profile:{city:'Москва',mood:'Тест'}}});
 await ok('admin',{method:'POST',cookie:admin,body:{type:'news-create',title:'PHP тест',body:'Новость из PHP API',tag:'Тест'}});
 await ok('admin',{method:'POST',cookie:admin,body:{type:'bonus-save',kind:'xp',multiplier:2,hours:1,title:'Тестовый бонус'}});
 await ok('admin?section=design',{cookie:admin});await ok('admin?section=balance',{cookie:admin});
 const nextZip=await ok('export?type=next',{cookie:admin,raw:true});const phpZip=await ok('export?type=php',{cookie:admin,raw:true});assert.ok(nextZip.data.byteLength>100000);assert.ok(phpZip.data.byteLength>100000);assert.equal(Buffer.from(nextZip.data).subarray(0,2).toString(),'PK');
 const denied=await req('export?type=php',{cookie:a});assert.equal(denied.status,403);checks++;
 console.log(`PHP API smoke: ${checks} checks passed`);
}finally{
 try{const login=await req('auth/login',{method:'POST',body:{username:process.env.PHP_TEST_ADMIN_USER??'admin',password:process.env.PHP_TEST_ADMIN_PASSWORD??'PHP-test-admin-2026!'}});if(login.cookie){const list=await req('admin?section=users&q=pt_&filter=all',{cookie:login.cookie});for(const u of list.data.users??[])if(users.includes(u.username))await req('admin',{method:'POST',cookie:login.cookie,body:{type:'user-delete',id:u.id}});}}catch{}
}
