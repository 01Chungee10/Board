import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const widths=[375,390,430];const report=[];
try{
 for (const width of widths){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5193/Board/',{waitUntil:'networkidle'});
  await p.locator('.post-card').first().waitFor();
  const cards=await p.locator('.post-card').count();
  const fonts=await p.evaluate(()=>Object.fromEntries(['.post-card h3','.post-excerpt','.post-time','.type-tag','.card-author','.stat .stat-label-mobile','.tab','.mobile-action-bar button'].map(selector=>{const el=document.querySelector(selector);return [selector,el?getComputedStyle(el).fontSize:null]})));
  await p.screenshot({path:`docs/qa/mobile-portrait/cards-${width}.png`,fullPage:true});
  await p.locator('.post-card').first().click();
  const thread={titleFont:await p.locator('.thread-title').evaluate(e=>getComputedStyle(e).fontSize),contentFont:await p.locator('.thread-content').evaluate(e=>getComputedStyle(e).fontSize),replyFont:await p.locator('.reply-text').first().evaluate(e=>getComputedStyle(e).fontSize),horizontalOverflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  await p.screenshot({path:`docs/qa/mobile-portrait/thread-${width}.png`,fullPage:false});
  await p.keyboard.press('Escape');
  await p.locator('.mobile-action-bar button').click();
  const entry=await p.locator('#meeting-invite').evaluate(el=>({font:getComputedStyle(el).fontSize,visible:el.getBoundingClientRect().height>0}));
  await p.keyboard.press('Escape');
  report.push({width,cards,fonts,thread,entry,errors});await p.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
const issues=report.filter(x=>x.cards!==3||x.thread.horizontalOverflow||x.errors.length||parseFloat(x.fonts['.post-card h3'])<18||parseFloat(x.thread.contentFont)<16);
if(issues.length)process.exitCode=1;
