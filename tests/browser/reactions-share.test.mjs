import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=5197;
const url='http://127.0.0.1:'+port+'/Board/';
const dev=spawn(process.execPath,['./node_modules/vite/bin/vite.js','--config','tests/mock-vite.config.mjs','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
async function ready(){
  for(let i=0;i<70;i++){
    try{const res=await fetch(url);if(res.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('Local-only test Vite server did not start');
}
try{
  await ready();
  await mkdir('docs/qa/workshop-20261113',{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    const card=page.locator('.question-item');
    await card.waitFor({timeout:10000});
    const like=card.locator('.heart-button');
    await like.waitFor({state:'visible'});
    assert.equal(await like.getAttribute('aria-pressed'),'false');
    assert.match(await like.innerText(),/공감\s*3/);
    await like.click();
    await page.waitForFunction(()=>document.querySelector('.heart-button')?.getAttribute('aria-pressed')==='true');
    assert.match(await like.innerText(),/공감\s*4/);
    await like.click();
    await page.waitForFunction(()=>document.querySelector('.heart-button')?.getAttribute('aria-pressed')==='false');
    assert.match(await like.innerText(),/공감\s*3/);
    await page.getByRole('button',{name:'QR 접속'}).click();
    await page.locator('.share-qr svg').waitFor();
    assert.equal(await page.locator('.share-url').getAttribute('href'),url);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,'horizontal overflow at '+width+'px');
    assert.deepEqual(errors,[],'client JS errors at '+width+'px');
    await page.screenshot({path:'docs/qa/workshop-20261113/reactions-qr-'+width+'.png',fullPage:true});
    console.log('PASS '+width+'px: reaction toggle 3→4→3, QR link, no JS errors/overflow');
    await page.close();
  }
} finally {
  if(browser)await browser.close();
  dev.kill('SIGTERM');
}
