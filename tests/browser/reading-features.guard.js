async(page)=>{
  const url='http://127.0.0.1:5197/Board/';
  const evidence='docs/qa/workshop-20261116/';
  const checks=[];
  const errors=[];
  const blocked=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const same=(actual,expected,message)=>assert(JSON.stringify(actual)===JSON.stringify(expected),message+': '+JSON.stringify(actual));
  const cards=()=>page.locator('.question-item');
  const card=id=>page.locator('.question-item[data-question-id="'+id+'"]');
  const order=()=>cards().evaluateAll(nodes=>nodes.map(node=>node.dataset.questionId));
  const waitOrder=expected=>page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('.question-item')].map(node=>node.dataset.questionId))===JSON.stringify(expected),expected);
  const waitLike=(id,liked)=>page.waitForFunction(({id,liked})=>document.querySelector('.question-item[data-question-id="'+id+'"] .heart-button')?.getAttribute('aria-pressed')===String(liked),{id,liked});
  const newest=['question-1','question-2','question-3','question-4','question-5','question-6'];
  const popular=['question-2','question-3','question-5','question-1','question-4','question-6'];
  page.setDefaultTimeout(8000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:\/\//,route=>{
    if(route.request().url().startsWith('http://127.0.0.1:5197/'))return route.continue();
    blocked.push(route.request().url());
    return route.abort('blockedbyclient');
  });

  for(const [width,columns] of [[320,1],[390,1],[800,2],[1200,3],[1440,3],[1920,4]]){
    errors.length=0;
    await page.setViewportSize({width,height:900});
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert(response.status()===200,'Local page failed at '+width);
    await page.waitForFunction(()=>window.__workshopFixture&&document.querySelectorAll('.question-item').length===6);
    const newestButton=page.getByRole('button',{name:'최신순',exact:true});
    const popularButton=page.getByRole('button',{name:'공감순',exact:true});
    await newestButton.click();
    await waitOrder(newest);
    assert(await newestButton.getAttribute('aria-pressed')==='true','Newest state missing at '+width);
    same(await order(),newest,'Newest order at '+width);

    const layout=await page.evaluate(()=>{
      const feed=document.querySelector('.question-feed');
      const nodes=[...feed.querySelectorAll('.question-item')];
      const rects=nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width};});
      return {columns:getComputedStyle(feed).gridTemplateColumns.split(/\s+/).length,overflow:document.documentElement.scrollWidth>innerWidth,rects};
    });
    assert(layout.columns===columns,'Expected '+columns+' columns at '+width+', got '+layout.columns);
    assert(!layout.overflow,'Page horizontal overflow at '+width);
    for(let i=1;i<Math.min(columns,layout.rects.length);i++){
      assert(Math.abs(layout.rects[i].y-layout.rects[0].y)<2,'Cards should share first row at '+width);
      assert(layout.rects[i].x>layout.rects[i-1].x,'Grid should preserve reading order at '+width);
    }

    await popularButton.click();
    await waitOrder(popular);
    assert(await popularButton.getAttribute('aria-pressed')==='true','Popular state missing at '+width);
    same(await order(),popular,'Popular order / tie newest first at '+width);
    await page.waitForFunction(()=>window.__workshopFixture.requests.some(request=>request.table==='meeting_posts'&&request.orders[0]?.column==='reaction_count'&&request.orders[0]?.ascending===false));

    if(width===1440){
      const q3like=card('question-3').locator('.heart-button');
      await q3like.click();
      await waitLike('question-3',true);
      await waitOrder(['question-3','question-2','question-5','question-1','question-4','question-6']);
      await card('question-3').locator('.question-open').click();
      const liveDialog=page.locator('.question-dialog');
      await liveDialog.waitFor({state:'visible'});
      await liveDialog.locator('.heart-button').click();
      await waitLike('question-3',false);
      await waitOrder(popular);
      assert(await liveDialog.isVisible(),'Resorting must not close the selected question');
      assert((await liveDialog.locator('.detail-question').innerText()).includes('배움과 성장'),'Selected question changed after reordering');
      await page.getByRole('button',{name:'질문 상세 닫기',exact:true}).click();
      await liveDialog.waitFor({state:'hidden'});
      checks.push({name:'Live popularity reorder and stable open question',width,status:'passed'});
    }

    await newestButton.click();
    await waitOrder(newest);
    const q1=card('question-1');
    const like=q1.locator('.heart-button');
    assert(await like.getAttribute('aria-pressed')==='false','Fixture like must start clear');
    await like.click();
    await waitLike('question-1',true);
    assert((await like.innerText()).includes('4'),'One like must increment exactly once');
    assert(await page.locator('.question-dialog[open]').count()===0,'Like must not open detail');

    const trigger=q1.locator('.question-open');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog=page.locator('.question-dialog');
    await dialog.waitFor({state:'visible'});
    assert(await dialog.evaluate(node=>node.tagName==='DIALOG'&&node.open),'Detail must use a native open dialog');
    assert(await dialog.evaluate(node=>node.contains(document.activeElement)),'Focus must enter detail');
    assert(await dialog.locator('.heart-button').getAttribute('aria-pressed')==='true','Detail must share existing like state');
    await dialog.locator('.heart-button').click();
    await waitLike('question-1',false);
    await page.waitForFunction(()=>document.querySelector('.question-dialog .heart-button')?.getAttribute('aria-pressed')==='false');
    assert((await like.innerText()).includes('3'),'Detail unlike must update card');
    const mutations=await page.evaluate(()=>window.__workshopFixture.mutations.filter(item=>item.table==='meeting_reactions'&&item.post_id==='question-1').map(item=>item.operation));
    same(mutations,['insert','delete'],'One click must cause only one mutation');
    const backgroundBlocked=await page.evaluate(()=>{
      document.querySelector('.question-composer textarea')?.focus();
      return document.querySelector('.question-dialog').contains(document.activeElement);
    });
    assert(backgroundBlocked,'Native modal did not make the background inert at '+width);
    for(let i=0;i<8;i++){
      await page.keyboard.press('Tab');
      const focus=await dialog.evaluate(node=>({inside:node.contains(document.activeElement),hasFocus:document.hasFocus(),tag:document.activeElement.tagName,classes:document.activeElement.className}));
      assert(focus.inside||(!focus.hasFocus&&focus.tag==='BODY'),'Tab reached page background at '+width+': '+JSON.stringify(focus));
    }
    await dialog.locator('.icon-button').focus();
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.matches('.question-item[data-question-id="question-1"] .question-open'));

    const detailTrigger=card('question-4').locator('.detail-button');
    await detailTrigger.click();
    await dialog.waitFor({state:'visible'});
    const completeText=await page.evaluate(()=>{
      const question=document.querySelector('.question-dialog .detail-question');
      const replies=document.querySelector('.question-dialog .detail-replies');
      const scroll=document.querySelector('.question-dialog-scroll');
      return {
        question:question.textContent===window.__workshopFixture.longQuestion,
        answer:replies.textContent.includes(window.__workshopFixture.longAnswer),
        size:parseFloat(getComputedStyle(question).fontSize),
        scrollable:scroll.scrollHeight>scroll.clientHeight,
        overflow:document.documentElement.scrollWidth>innerWidth||scroll.scrollWidth>scroll.clientWidth+1
      };
    });
    assert(completeText.question,'Full long question missing in detail at '+width);
    assert(completeText.answer,'Full CEO answer missing in detail at '+width);
    assert(completeText.size>=22,'Detail text must be larger at '+width);
    assert(completeText.scrollable,'Long detail must scroll within dialog at '+width);
    assert(!completeText.overflow,'Detail horizontal overflow at '+width);
    if(width===390||width===1440)await page.screenshot({path:evidence+'detail-'+width+'.png',fullPage:false});
    await dialog.locator('.detail-replies').scrollIntoViewIfNeeded();
    assert(await page.getByRole('button',{name:'질문 상세 닫기',exact:true}).isVisible(),'Close must remain available when scrolling long detail');
    await page.getByRole('button',{name:'질문 상세 닫기',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.matches('.question-item[data-question-id="question-4"] .detail-button'));

    await page.getByRole('button',{name:'QR 접속',exact:true}).click();
    await page.locator('.share-qr svg').waitFor({state:'visible'});
    assert(await page.locator('.share-url').getAttribute('href')===url,'QR URL regression at '+width);
    await page.keyboard.press('Escape');
    await page.locator('.share-dialog').waitFor({state:'hidden'});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:evidence+'grid-'+width+'.png',fullPage:true});
    same(errors,[],'Client JavaScript errors at '+width);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Final horizontal overflow at '+width);
    checks.push({name:'Grid, sorting, full detail, focus, like sync, QR',width,columns,status:'passed'});
  }
  same(blocked.filter(value=>!value.startsWith('https://fonts.googleapis.com/')),[],'Unexpected external network request (blocked before leaving local test)');
  return {status:'BOARD_UI_QA_PASSED',checks,unexpectedExternalRequests:0,blockedFontRequests:blocked.length};
}