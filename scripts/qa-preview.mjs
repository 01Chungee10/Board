import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-extensions']});
const errors=[];
try{
  const desktop=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  desktop.on('pageerror',err=>errors.push('desktop:'+err.message));
  await desktop.goto('http://127.0.0.1:5189/Board/',{waitUntil:'networkidle'});
  await desktop.locator('.post-card').first().waitFor();
  const counts=await desktop.locator('.post-card').count();
  await desktop.screenshot({path:'docs/qa/desktop.png',fullPage:true});
  await desktop.getByRole('tab',{name:'CEO에게 질문',exact:true}).click();
  const questions=await desktop.locator('.post-card').count();
  await desktop.getByRole('tab',{name:'전체 이야기'}).click();
  await desktop.locator('.post-card').first().click();
  const answerVisible=await desktop.locator('.ceo-reply').count()>0;
  await desktop.keyboard.press('Escape');
  await desktop.getByRole('button',{name:'구성원 입장'}).click();
  await desktop.locator('#login-email').fill('example@company.com');
  await desktop.getByRole('button',{name:/인증 링크 받기/}).click();
  const errorVisible=await desktop.getByText('회의용 보안 데이터베이스 연결 준비 후 인증을 이용할 수 있습니다.').isVisible();
  await desktop.keyboard.press('Escape');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  mobile.on('pageerror',err=>errors.push('mobile:'+err.message));
  await mobile.goto('http://127.0.0.1:5189/Board/',{waitUntil:'networkidle'});
  await mobile.screenshot({path:'docs/qa/mobile.png',fullPage:true});
  const horizontalOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  console.log(JSON.stringify({desktopCards:counts,questionFilterCards:questions,answerVisible,loginDisabledWithoutBackend:errorVisible,mobileHorizontalOverflow:horizontalOverflow,errors,desktopTitle:await desktop.title(),imageLoaded:await desktop.locator('.hero-illustration img').evaluate(x=>x.complete&&x.naturalWidth>0)},null,2));
}finally{await browser.close();}
