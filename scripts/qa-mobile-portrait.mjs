import { chromium } from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.BOARD_TEST_URL || 'http://127.0.0.1:5192/Board/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const widths=[320,360,375,390,430,480,640];
const report=[];
await mkdir('docs/qa/mobile-portrait',{recursive:true});
try {
  for (const width of widths) {
    const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(base,{waitUntil:'networkidle'});
    const data=await page.evaluate(()=>{
      const sels=['.site-header','.hero','.preview-banner','.stats-strip','.section-top','.filter-panel','.feed-list','.right-rail','.mobile-action-bar','.site-footer'];
      const rect=s=>{const el=document.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top),height:Math.round(r.height),visible:getComputedStyle(el).display!=='none'};};
      const font=s=>{const el=document.querySelector(s);return el?Number.parseFloat(getComputedStyle(el).fontSize):null;};
      const tappable=[...document.querySelectorAll('button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.top<innerHeight;}).map(el=>({text:el.getAttribute('aria-label')||el.textContent.trim().slice(0,20),height:Math.round(el.getBoundingClientRect().height),width:Math.round(el.getBoundingClientRect().width)}));
      return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth,scrollHeight:document.documentElement.scrollHeight,rects:Object.fromEntries(sels.map(s=>[s,rect(s)])),fonts:{title:font('.hero h1'),heroText:font('.hero-description'),feedHeading:font('.section-top h2'),filter:font('.tab'),search:font('.search-field input'),emptyText:font('.empty-state p'),action:font('.mobile-action-bar button')},actionCount:document.querySelectorAll('.mobile-action-bar button').length,smallTapTargets:tappable.filter(el=>el.height<44).slice(0,10)};
    });
    if([375,390,430].includes(width)){
      await page.screenshot({path:`docs/qa/mobile-portrait/after-${width}.png`,fullPage:true});
      await page.screenshot({path:`docs/qa/mobile-portrait/after-${width}-viewport.png`,fullPage:false});
    }
    // Verify entry overlay text size and visible input across mobile widths.
    await page.locator('.mobile-action-bar button').click();
    await page.locator('#meeting-invite').waitFor({timeout:8000});
    data.entryInputFont=await page.locator('#meeting-invite').evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize));
    data.entryHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    data.publicStatus=response?.status();data.errors=errors;
    report.push({width,...data});
    await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
const failed=report.filter(x=>x.horizontalOverflow||x.entryHorizontalOverflow||x.publicStatus!==200||x.errors.length||x.entryInputFont<16||x.rects['.feed-list'].top>640||x.fonts.action<16);
if(failed.length){console.error('QA FAILED for widths',failed.map(x=>x.width));process.exitCode=1;}
