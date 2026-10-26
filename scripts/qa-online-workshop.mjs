import {chromium} from 'playwright';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const BASE = process.env.BOARD_TEST_URL || 'http://127.0.0.1:5194/Board/';
const browser = await chromium.launch({channel:'chrome',headless:true});
const widths = [320,375,390,430,768,1440];
const reports=[];
const users=[];
await mkdir('docs/qa/workshop-20261026',{recursive:true});
try {
  for(const width of widths) {
    const page=await browser.newPage({viewport:{width,height:840},isMobile:width<=430,hasTouch:width<=430,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(BASE,{waitUntil:'networkidle',timeout:20000});
    await page.locator('.question-composer textarea:enabled').waitFor({timeout:16000});
    const data=await page.evaluate(()=>{
      const $=s=>document.querySelector(s),rect=s=>{const x=$(s)?.getBoundingClientRect();return x?{top:Math.round(x.top),height:Math.round(x.height)}:null;};
      const font=s=>{const el=$(s);return el?getComputedStyle(el).fontSize:null};
      const sid=Object.keys(localStorage).find(key=>key.endsWith('-auth-token'));
      let userId=null;try{if(sid)userId=JSON.parse(localStorage.getItem(sid)).user?.id;}catch{}
      return {userId,overflow:document.documentElement.scrollWidth>innerWidth,title:document.title,logoLoaded:$('.top-header img').naturalWidth>0,mascotLoaded:$('.workshop-heading img').naturalWidth>0,loginControls:[...document.querySelectorAll('button')].some(b=>/로그인|참여코드/.test(b.innerText)),h1:$('.workshop-heading h1').innerText,form:rect('.question-composer'),feed:rect('.questions-section'),fonts:{heading:font('.workshop-heading h1'),input:font('#new-question'),send:font('.question-composer .primary-button'),timeline:font('.timeline-header h2')},numberOfSidebarModules:document.querySelectorAll('.stats-strip,.right-rail,.filter-panel,.qr-rail').length};
    });
    if(data.userId)users.push(data.userId);
    if(width===390||width===430||width===1440)await page.screenshot({path:`docs/qa/workshop-20261026/workshop-${width}.png`,fullPage:true});
    reports.push({width,status:response.status(),...data,errors});
    await page.close();
  }
  // Separate host-only screen; no CEO claim performed.
  const host=await browser.newPage({viewport:{width:390,height:840},isMobile:true,hasTouch:true});
  await host.goto(BASE+'?host=1',{waitUntil:'networkidle'});
  await host.locator('#host-code').waitFor({timeout:10000});
  reports.push({hostDialog:true,hostCodeInputFont:await host.locator('#host-code').evaluate(el=>getComputedStyle(el).fontSize)});
  const hostId=await host.evaluate(()=>{const k=Object.keys(localStorage).find(key=>key.endsWith('-auth-token'));return k?JSON.parse(localStorage.getItem(k)).user?.id:null});
  if(hostId)users.push(hostId);
  await host.close();
}finally{await browser.close();}
await writeFile('docs/qa/workshop-20261026/qa-report.json',JSON.stringify(reports.map(({userId,...publicFields})=>publicFields),null,2));
// Remove only the fresh anonymous identities created by this QA script.
// If admin cleanup fails, retain the local UUID manifest for manual inspection.
const cleanIds=[...new Set(users)].filter(id=>/^[a-f\d-]{36}$/i.test(id));
let cleanupComplete=cleanIds.length===0;
if(cleanIds.length){
  const tempDir=mkdtempSync(join(tmpdir(),'workshop-qa-cleanup-'));
  const sqlFile=join(tempDir,'cleanup.sql');
  try{
    const values=cleanIds.map(id=>`'${id}'::uuid`).join(',');
    writeFileSync(sqlFile,`delete from auth.users where id in (${values}) and is_anonymous=true;`,{mode:0o600});
    execFileSync('supabase',['db','query','--linked','--file',sqlFile,'-o','json'],{stdio:'pipe',timeout:45000});
    cleanupComplete=true;
  }catch(err){await writeFile('app/.qa-user-ids.local',cleanIds.join('\n'));console.error('QA guest cleanup needs manual review:',err.message.slice(0,190));}
  finally{await rm(tempDir,{force:true,recursive:true});}
}
if(!cleanupComplete)process.exitCode=1;
console.log(JSON.stringify(reports.map(({userId,...publicFields})=>publicFields),null,2));
const failures=reports.filter(r=>r.width&&(r.status!==200||r.overflow||r.loginControls||r.numberOfSidebarModules!==0||r.errors.length||!r.logoLoaded||!r.mascotLoaded||r.fonts.input!=='16px'||(r.width<=430&&r.feed.top>500)));
if(failures.length){console.error('FAILURES',failures.map(x=>x.width));process.exitCode=1;}
