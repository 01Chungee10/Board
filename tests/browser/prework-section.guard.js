async(page)=>{
  const url='http://127.0.0.1:5198/Board/';
  const errors=[],blocked=[],checks=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const normalize=value=>value.replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
  const section=()=>page.locator('.prework-section');
  const topics=()=>section().locator('details.prework-topic');
  page.setDefaultTimeout(8000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:\/\//,route=>{
    if(route.request().url().startsWith('http://127.0.0.1:5198/'))return route.continue();
    blocked.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  const noOverflow=async(label)=>{
    const bad=await page.evaluate(()=>{
      const scope=document.querySelector('.prework-section');
      const outside=[...scope.querySelectorAll('table,details,summary,li,h2,h3,h4,button,a')].filter(node=>{
        if(!node.getClientRects().length)return false;
        const box=node.getBoundingClientRect();
        return box.width>0&&(box.left < -1 || box.right > innerWidth+1 || node.scrollWidth>node.clientWidth+2);
      }).map(node=>({tag:node.tagName,classes:node.className,text:node.textContent.trim().slice(0,70),width:node.clientWidth,scroll:node.scrollWidth}));
      return {documentOverflow:document.documentElement.scrollWidth>innerWidth+1,outside};
    });
    assert(!bad.documentOverflow&&!bad.outside.length,label+': '+JSON.stringify(bad));
  };

  for(const width of [320,390,1440]){
    errors.length=0;
    await page.setViewportSize({width,height:900});
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert(response.status()===200,'Local test page did not load');
    await page.waitForFunction(()=>window.__workshopFixture&&document.querySelectorAll('.question-item').length===6&&document.querySelectorAll('.prework-topic').length===2);
    assert(await section().getAttribute('aria-labelledby')==='prework-heading','Section needs its labelled landmark');
    assert(await section().locator('#prework-heading').innerText()==='CL → CEO 사전질문 및 현업검토의견','Document title mismatch');
    const placement=await page.evaluate(()=>{
      const general=document.querySelector('.questions-section'),prework=document.querySelector('.prework-section');
      return Boolean(general.compareDocumentPosition(prework)&Node.DOCUMENT_POSITION_FOLLOWING)&&!document.querySelector('.discussion-section');
    });
    assert(placement,'Prework must follow questions; discussion must remain hidden');
    const expected=await page.evaluate(async()=>{
      const {PREWORK_DOCUMENT}=await import('/Board/src/prework-data.js');
      return PREWORK_DOCUMENT;
    });
    assert(expected.sections.map(topic=>topic.id).join() === 'ai-dx-ax,strategy','Expected only the two approved topics in public source');
    assert(expected.sections.flatMap(s=>s.entries).length===4,'Expected four Q entries');
    const rows=await section().locator('table tbody tr').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('td,th')].map(cell=>cell.textContent.replace(/\s+/g,' ').trim())));
    assert(rows.length===2,'Overview table must have two topic mappings');
    expected.sections.forEach((topic,index)=>{
      assert(rows[index].some(cell=>cell===topic.department),'Overview department mismatch '+topic.id);
      assert(rows[index].some(cell=>cell.includes(topic.topic)),'Overview topic mismatch '+topic.id);
    });
    await topics().evaluateAll(nodes=>nodes.forEach(node=>{node.open=false;}));
    await noOverflow('Collapsed '+width);
    await section().evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));

    for(let i=0;i<expected.sections.length;i++){
      const topic=topics().nth(i),summary=topic.locator(':scope > summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(await topic.evaluate(node=>node.open),'Enter failed to expand topic '+i+' at '+width);
      const focus=await summary.evaluate(node=>{
        const style=getComputedStyle(node);
        return {active:document.activeElement===node,outlineStyle:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)};
      });
      assert(focus.active&&focus.outlineStyle!=='none'&&focus.outlineWidth>=2,'Keyboard focus not visible '+i+' at '+width);
      await page.keyboard.press('Space');
      assert(!(await topic.evaluate(node=>node.open)),'Space failed to collapse topic '+i+' at '+width);
      await page.keyboard.press('Enter');
      const body=normalize(await topic.innerText());
      assert(body.includes(expected.sections[i].department),'Missing answer department in topic '+i);
      for(const entry of expected.sections[i].entries){
        assert(body.includes(normalize(entry.heading)),'Missing question heading '+entry.id);
        for(const text of [...entry.questions,...entry.answers]){
          assert(body.includes(normalize(text)),'Missing rendered question/answer text: '+text);
        }
      }
    }
    const text=normalize(await section().innerText());
    for(const sentinel of [
      "Steel-X 기반으로 현업이 직접 AI 에이전트를 만들고 활용하는 환경 확대(Steel-X: 범용 AI·업무맞춤형 에이전트의 중심 플랫폼으로 육성)",
      "Copilot: '26.12월 수요조사 착수 → 단계적 전사 확산",
      "인도·미국 판매 네트워크 확충"
    ])assert(text.includes(normalize(sentinel)),'Literal source detail missing: '+sentinel);
    const expectedBullets=expected.tags.length+expected.sections.flatMap(t=>t.entries).reduce((n,e)=>n+e.questions.length+e.answers.length,0);
    assert(await section().locator('li').count()===expectedBullets,'Question/answer bullet list incomplete');
    assert(await section().locator('strong').count()>0,'Original bold labels not rendered');
    await noOverflow('Expanded '+width);
    const finalBullet=topics().last().locator('li').last();
    await finalBullet.scrollIntoViewIfNeeded();
    assert(await finalBullet.isVisible(),'Final answer inaccessible at '+width);
    const textStyles=await section().locator('li').evaluateAll(nodes=>nodes.map(node=>({clamp:getComputedStyle(node).webkitLineClamp,visibility:getComputedStyle(node).visibility})));
    assert(textStyles.every(style=>style.clamp==='none'&&style.visibility==='visible'),'Answer bullets are truncated/hidden');

    const qr=page.getByRole('button',{name:'워크숍 QR 접속 코드 열기',exact:true});
    const qrBox=await qr.evaluate(node=>{
      const rect=node.getBoundingClientRect();
      return {fixed:getComputedStyle(node).position==='fixed',inViewport:rect.x>=0&&rect.y>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1};
    });
    assert(qrBox.fixed&&qrBox.inViewport,'QR control must remain fixed while reading long section');
    await qr.click();
    await page.locator('.share-qr svg').waitFor({state:'visible'});
    assert(await page.locator('.share-url').getAttribute('href')===url,'QR join URL changed');
    await page.keyboard.press('Escape');
    await page.locator('.share-dialog').waitFor({state:'hidden'});

    if(width===390||width===1440){
      await topics().evaluateAll(nodes=>nodes.forEach((node,index)=>{node.open=index===0;}));
      await topics().first().evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    }
    if(width===1440){
      const navLinks=section().locator('table a[href^="#prework-"]');
      if(await navLinks.count()){
        const lastLink=navLinks.last(),target=await lastLink.getAttribute('href');
        await lastLink.focus();
        await page.keyboard.press('Enter');
        const targetNode=page.locator(target);
        assert(await targetNode.evaluate(node=>node.open),'Overview link failed to open disclosure');
        await page.waitForFunction(target=>document.querySelector(target)?.contains(document.activeElement),target,{timeout:2500});
        assert(await targetNode.evaluate(node=>node.contains(document.activeElement)),'Overview link focus did not enter chosen topic');
      }
      await topics().evaluateAll(nodes=>nodes.forEach(node=>{node.open=true;}));
      await page.evaluate(()=>{
        document.documentElement.dir='rtl';
      });
      await noOverflow('RTL expanded '+width);
      await page.evaluate(()=>{document.documentElement.dir='ltr';});
      const resize=await page.evaluate(()=>{
        const nodes=[...document.querySelectorAll('.prework-section,.prework-section *')].filter(node=>!(node instanceof SVGElement));
        const sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));
        nodes.forEach((node,index)=>{node.style.fontSize=(sizes[index]*2)+'px';});
        return nodes.length;
      });
      await noOverflow('200% text resize '+width);
      assert(resize>0,'Text resize probe did not run');
      checks.push({name:'Overview anchor focus, RTL reflow, 200% text resize',width,status:'passed'});
      for(const hash of ['#prework-section','#prework-strategy']){
        await page.goto('about:blank');
        await page.goto(url+hash,{waitUntil:'load'});
        await page.waitForFunction(()=>window.__workshopFixture&&document.querySelectorAll('.prework-topic').length===2);
        await page.waitForFunction(hash=>{
          const target=document.querySelector(hash);
          if(!target)return false;
          const rect=target.getBoundingClientRect();
          const aligned=rect.top>=-1&&rect.top<=48;
          const bottomClamped=scrollY>=document.documentElement.scrollHeight-innerHeight-1&&rect.top>=0&&rect.top<innerHeight/2;
          return (aligned||bottomClamped)&&(hash==='#prework-section'||target.open);
        },hash,{timeout:4000});
        checks.push({name:'Fresh navigation anchor scroll/open',hash,status:'passed',top:await page.locator(hash).evaluate(node=>node.getBoundingClientRect().top)});
      }
    }
    assert(errors.length===0,'JavaScript errors: '+JSON.stringify(errors));
    assert(await page.evaluate(()=>window.__workshopFixture.mutations.length===0),'Prework reading caused a data mutation');
    checks.push({name:'Two topics, full bullets, mappings, native keyboard focus, no overflow, floating QR',width,status:'passed'});
  }
  const unexpected=blocked.filter(url=>!url.startsWith('https://fonts.googleapis.com/')&&!url.startsWith('https://fonts.gstatic.com/'));
  assert(unexpected.length===0,'Unexpected external requests: '+JSON.stringify(unexpected));
  return {status:'PREWORK_UI_QA_PASSED',checks,unexpectedExternalRequests:unexpected.length,blockedFontRequests:blocked.length,notVerified:['Screen-reader speech with VoiceOver/NVDA','Actual browser zoom (200% text resizing checked instead)']};
}
