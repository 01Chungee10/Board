import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';

const meetingCode=JSON.parse(readFileSync(homedir()+'/.config/ceo-cl-board-deploy/venue-access.json','utf8')).cl_code;
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-extensions']});
const root=process.env.CEO_CL_URL || 'http://127.0.0.1:5191/Board/';
const findings={};
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',err=>errors.push('desktop:'+err.message));
  await page.goto(root+'?join='+encodeURIComponent(meetingCode),{waitUntil:'networkidle'});
  await page.locator('#meeting-invite').waitFor({timeout:8000});
  findings.tokenPrefilled=(await page.locator('#meeting-invite').inputValue()).length>0;
  findings.secretRemovedFromAddress=!page.url().includes('join=');
  findings.noDemoBeforeEntry=(await page.locator('.post-card').count()===0);
  await page.locator('#meeting-display-name').fill('QA 브라우저');
  await page.getByRole('dialog').getByRole('button',{name:'회의 참여하기'}).click();
  await page.locator('.post-card').first().waitFor({timeout:15000});
  findings.realPostsShown=(await page.locator('.post-card').count())>0;
  findings.demoNoticeHidden=(await page.locator('.preview-banner').count())===0;
  await page.screenshot({path:'docs/qa/live-joined-desktop.png',fullPage:true});
  await page.locator('.post-card').first().click();
  findings.replySection=(await page.getByText('함께 나눈 이야기').count())>0;
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'QR로 참여하기'}).click();
  findings.qrRendered=(await page.locator('.qr-frame svg').count())>0;
  await page.keyboard.press('Escape');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  mobile.on('pageerror',err=>errors.push('mobile:'+err.message));
  await mobile.goto(root,{waitUntil:'networkidle'});
  findings.mobileNoOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
  await mobile.screenshot({path:'docs/qa/live-mobile-landing.png',fullPage:true});
  findings.mobileEntryShown=(await mobile.getByRole('button',{name:'회의 입장'}).count())>0;
  findings.errors=errors;
}catch(err){findings.failure=err.message;findings.errors=errors;}
finally{await browser.close();}
console.log(JSON.stringify(findings,null,2));
if(findings.failure||errors.length||findings.realPostsShown===false)process.exitCode=1;
