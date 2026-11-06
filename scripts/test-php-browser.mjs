import { chromium } from 'playwright';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PHP_TEST_URL??'http://127.0.0.1:8080';
const username='pb_'+Date.now().toString(36);const password='test-password-123';
const adminName=process.env.PHP_TEST_ADMIN_USER??'admin';const adminPassword=process.env.PHP_TEST_ADMIN_PASSWORD??'PHP-test-admin-2026!';
async function api(route,body){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());return r;}
await mkdir('.checks',{recursive:true});
const reg=await api('auth/register',{username,password,displayName:'Canvas тест'});const token=reg.headers.get('set-cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const out={};let adminCookie;
try{
 for(const [name,viewport,mobile] of [['php-desktop',{width:1440,height:900},false],['php-mobile',{width:390,height:844},true]]){
  const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});await ctx.addCookies([{name:'quiet_farm_session',value:token,domain:new URL(base).hostname,path:'/',httpOnly:true,sameSite:'Lax'}]);await ctx.addInitScript(()=>sessionStorage.setItem('valley:splash','1'));const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.farm-map-redesign');await page.waitForSelector('canvas.farm-canvas');await page.waitForTimeout(1200);
  out[name]=await page.evaluate(()=>{const c=document.querySelector('canvas.farm-canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let colored=0;for(let i=0;i<d.length;i+=400)if(d[i+3]>0&&d[i]+d[i+1]+d[i+2]>30)colored++;return {canvas:[c.width,c.height],colored,mapWidth:document.querySelector('.farm-map-redesign').getBoundingClientRect().width,viewport:innerWidth,dock:document.querySelector('.map-dock').scrollWidth};});assert.ok(out[name].colored>1000,'Canvas must contain rendered graphics');assert.equal(out[name].mapWidth,out[name].viewport);assert.deepEqual(errors,[]);out[name].errors=errors;await page.screenshot({path:`.checks/${name}.png`});await ctx.close();
 }
 const login=await api('auth/login',{username:adminName,password:adminPassword});adminCookie=login.headers.get('set-cookie').split(';')[0];const adminToken=adminCookie.split('=')[1];const ctx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});await ctx.addCookies([{name:'quiet_farm_session',value:adminToken,domain:new URL(base).hostname,path:'/',httpOnly:true,sameSite:'Lax'}]);const page=await ctx.newPage();await page.goto(base+'/admin#export',{waitUntil:'networkidle'});await page.waitForSelector('.adm-export-grid');await page.screenshot({path:'.checks/php-admin-export.png'});out.downloads={};
 for(const [label,file] of [['Скачать Next.js','next'],['Скачать PHP-версию','php']]){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:label}).click()]);await download.saveAs('.checks/'+file+'.zip');out.downloads[file]=(await stat('.checks/'+file+'.zip')).size;assert.ok(out.downloads[file]>100000);}
 await writeFile('.checks/php-browser.json',JSON.stringify(out,null,2));console.log('PHP browser checks passed',JSON.stringify(out));
}finally{
 await browser.close();
 if(adminCookie){const r=await fetch(base+'/api/admin?section=users&q='+username,{headers:{Cookie:adminCookie}});const data=await r.json();for(const u of data.users??[])if(u.username===username)await fetch(base+'/api/admin',{method:'POST',headers:{'Content-Type':'application/json',Cookie:adminCookie},body:JSON.stringify({type:'user-delete',id:u.id})});}
}
