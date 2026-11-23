import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowUp, Check, CheckCircle2, CircleHelp, Maximize2,
  Clock3, Heart, Link2, MessageCircle, QrCode, RefreshCw, Send, ShieldCheck, X
} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {supabase} from './supabase.js';
import {DISCUSSION_TOPICS} from './discussion-topics.js';
// Keep curated topics intact for restoration; hide the section until re-enabled.
const SHOW_DISCUSSION_TOPICS = false;
import PreworkSection from './PreworkSection.jsx';
import {attachReactions,attachReplies,isValidQuestion,makeQuestionTitle,sortQuestions} from './workshop-utils.js';

const WORKSHOP_SLUG = import.meta.env.VITE_MEETING_SLUG || 'ceo-cl-2026';
const COMPANY_LOGO = '/Board/brand/hyundai-steel-ci.png';
const MASCOT = '/Board/brand/yonggang-mascot.png';
// Generate a working QR link for the current deployment instead of a stale redirect.
// A separate verified custom domain can later hide the GitHub Pages account in the URL.
const PUBLIC_JOIN_URL = new URL(import.meta.env.BASE_URL, window.location.origin).href;
let joinPromise = null;

// An anonymous Supabase session is a technical RLS identity, not a visible sign-in.
// Promise de-duplication prevents multiple identities on React StrictMode remounts.
function joinWorkshop() {
  if (!supabase) return Promise.reject(new Error('서버 연결 설정이 없습니다.'));
  if (!joinPromise) {
    joinPromise = (async () => {
      let {data:sessionData,error:sessionError} = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        const {error:guestError} = await supabase.auth.signInAnonymously();
        if (guestError) throw guestError;
      }
      const {data,error} = await supabase.rpc('join_public_workshop');
      if (error) throw error;
      return data;
    })().catch(err => {joinPromise = null;throw err;});
  }
  return joinPromise;
}

function timestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const elapsed = Math.max(0,Date.now() - date.getTime());
  if (elapsed < 60000) return '방금 전';
  if (elapsed < 3600000) return `${Math.floor(elapsed/60000)}분 전`;
  if (elapsed < 86400000) return `${Math.floor(elapsed/3600000)}시간 전`;
  return date.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})+' '+date.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
}

function hostRequested() {
  const url = new URL(window.location.href);
  return url.searchParams.get('host') === '1' || url.searchParams.get('mode') === 'ceo';
}

function HostDialog({onClose,onClaim,busy,error}) {
  const [code,setCode] = useState('');
  useEffect(() => {
    const onKey = event => {if(event.key === 'Escape') onClose();};
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  },[onClose]);
  return <div className="overlay" onMouseDown={event => {if(event.currentTarget===event.target)onClose();}}>
    <form className="host-dialog" role="dialog" aria-modal="true" aria-label="CEO 공식 답변 인증" onSubmit={event => {event.preventDefault();onClaim(code);}}>
      <div className="host-top"><div className="host-identity"><ShieldCheck size={21}/><h2>CEO 답변 권한</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X size={21}/></button></div>
      <p>운영자가 CEO에게 직접 전달한 인증코드를 입력하면 공식 답변을 작성할 수 있습니다.</p>
      <label htmlFor="host-code">CEO 전용 인증코드</label>
      <input id="host-code" type="password" autoComplete="off" autoFocus placeholder="인증코드 입력" value={code} onChange={event=>setCode(event.target.value)} required maxLength={80}/>
      {error&&<p className="error-message" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy||!code.trim()} type="submit">{busy?'확인 중…':'공식 답변 활성화'} <Check size={18}/></button>
      <small>참가자에게는 이 인증 과정이 필요하지 않습니다.</small>
    </form>
  </div>;
}

function ShareDialog({onClose}) {
  const [copied,setCopied]=useState(false);
  const [copyError,setCopyError]=useState(false);
  useEffect(()=>{
    const onKey=event=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[onClose]);
  async function copyLink(){
    try{await navigator.clipboard.writeText(PUBLIC_JOIN_URL);setCopied(true);setCopyError(false);}
    catch{setCopyError(true);}
  }
  return <div className="overlay" onMouseDown={event=>{if(event.currentTarget===event.target)onClose();}}>
    <section className="share-dialog" role="dialog" aria-modal="true" aria-label="워크숍 QR 접속">
      <div className="share-dialog-header"><div><span className="overline">SCAN TO JOIN</span><h2>워크숍 바로 입장</h2></div><button type="button" className="icon-button" aria-label="QR 화면 닫기" onClick={onClose}><X size={20}/></button></div>
      <p>휴대전화 카메라로 스캔하면 이름이나 참여코드 없이 접속할 수 있습니다.</p>
      <div className="share-qr" aria-label="워크숍 접속 QR코드"><QRCodeSVG value={PUBLIC_JOIN_URL} size={224} level="H" marginSize={2} title="워크숍 접속 QR코드"/></div>
      <a className="share-url" href={PUBLIC_JOIN_URL} target="_blank" rel="noreferrer noopener">{PUBLIC_JOIN_URL}</a>
      <button type="button" className="share-copy" onClick={copyLink}><Link2 size={16}/>{copied?'주소 복사 완료':'접속 주소 복사'}</button>
      {copyError&&<p className="error-message">자동 복사가 안 되면 위 주소를 길게 눌러 복사해 주세요.</p>}
      <small>이 주소는 현재 배포 사이트로 연결됩니다. GitHub Pages 주소에는 계정명이 표시될 수 있습니다.</small>
    </section>
  </div>;
}

function LikeButton({item,index,onLike,canLike,likeBusy}) {
  return <button type="button" className={`heart-button ${item.reacted?'reacted':''}`} aria-label={`질문 ${index} 공감 ${item.reacted?'취소':'하기'} (현재 ${item.reaction_count||0}명)`} aria-pressed={Boolean(item.reacted)} disabled={!canLike||likeBusy} onClick={()=>onLike(item)}>
    <Heart size={18} fill={item.reacted?'currentColor':'none'} aria-hidden="true"/>
    <span>공감</span><strong>{item.reaction_count||0}</strong>
  </button>;
}

function QuestionRow({item,index,isHost,onOpen,onLike,canLike,likeBusy}) {
  const replies=item.replies||[];
  const latest=replies.filter(reply=>reply.author_role==='ceo').at(-1);
  const question=(item.content||item.title||'').trim();
  return <article className="question-item" data-question-id={item.id}>
    <button type="button" className="question-open" aria-haspopup="dialog" aria-label={`질문 ${index} 크게 보기: ${question.slice(0,70)}`} onClick={event=>onOpen(item,index,event.currentTarget)}>
      <span className="question-meta"><span className="question-person"><span className="timeline-dot"/><span>질문 {index}</span><span className="meta-divider">·</span><span>익명 참가자</span></span><time dateTime={item.created_at}>{timestamp(item.created_at)}</time></span>
      <span className="question-content">{question}</span>
      {latest&&<span className="answer-preview"><span className="answer-heading"><CheckCircle2 size={17} aria-hidden="true"/> CEO 답변</span><span className="answer-text">{latest.content}</span></span>}
    </button>
    <div className="question-actions">
      <LikeButton item={item} index={index} onLike={onLike} canLike={canLike} likeBusy={likeBusy}/>
      <div className="response-actions">
        <button type="button" className="detail-button" aria-haspopup="dialog" aria-label={`질문 ${index} 크게 보기${replies.length?`, 답변 ${replies.length}건`:''}`} onClick={event=>onOpen(item,index,event.currentTarget)}><Maximize2 size={16} aria-hidden="true"/> 크게 보기{replies.length>0&&<span>· 답변 {replies.length}</span>}</button>
        {isHost&&<button className="answer-button" type="button" aria-haspopup="dialog" onClick={event=>onOpen(item,index,event.currentTarget,true)}><MessageCircle size={16} aria-hidden="true"/> CEO 답변 작성</button>}
      </div>
    </div>
  </article>;
}

function QuestionDialog({item,index,isHost,focusAnswer,onClose,onAnswer,onLike,canLike,canAnswer,likeBusy}) {
  const dialogRef=useRef(null);
  const headingRef=useRef(null);
  const answerRef=useRef(null);
  const backdropPress=useRef(false);
  const [answer,setAnswer]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const replies=item.replies||[];
  const question=(item.content||item.title||'').trim();

  useEffect(()=>{
    const dialog=dialogRef.current;
    const previousOverflow=document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow='hidden';
    if(focusAnswer&&answerRef.current)answerRef.current.focus();
    else headingRef.current?.focus({preventScroll:true});
    return()=>{
      document.body.style.overflow=previousOverflow;
      if(dialog.open)dialog.close();
    };
  },[focusAnswer]);

  async function submitAnswer(event){
    event.preventDefault();
    if(!canAnswer||submitting)return;
    if(answer.trim().length<2){setError('답변을 2자 이상 작성해 주세요.');answerRef.current?.focus();return;}
    setSubmitting(true);setError('');
    const ok=await onAnswer(item.id,answer.trim());
    if(ok)setAnswer('');else setError('등록에 실패했습니다. 연결 상태를 확인해 주세요.');
    setSubmitting(false);
  }

  function outside(event){
    const box=event.currentTarget.getBoundingClientRect();
    return event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);
  }

  return <dialog ref={dialogRef} className="question-dialog" aria-labelledby="question-dialog-title" onCancel={event=>{event.preventDefault();onClose();}} onPointerDown={event=>{backdropPress.current=outside(event);}} onClick={event=>{if(backdropPress.current&&outside(event))onClose();backdropPress.current=false;}}>
    <div className="question-dialog-header"><div><span className="overline">함께 나누는 질문</span><h2 id="question-dialog-title" ref={headingRef} tabIndex={-1}>질문 {index} 자세히 보기</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="질문 상세 닫기"><X size={23} aria-hidden="true"/></button></div>
    <div className="question-dialog-scroll">
      <div className="detail-meta"><span>익명 참가자</span><time dateTime={item.created_at}>{timestamp(item.created_at)}</time></div>
      <p className="detail-question">{question}</p>
      <div className="question-dialog-actions"><LikeButton item={item} index={index} onLike={onLike} canLike={canLike} likeBusy={likeBusy}/><span>답변 {replies.length}건</span></div>
      <section className="detail-replies" aria-label="질문에 대한 답변">
        <h3>답변 {replies.length}건</h3>
        {replies.length===0?<p className="detail-empty">아직 등록된 답변이 없습니다.</p>:replies.map(reply=><div className={`reply-line ${reply.author_role==='ceo'?'official':''}`} key={reply.id}><div className="reply-line-head"><span>{reply.author_role==='ceo'?'CEO 공식 답변':'참가자 의견'}</span><time dateTime={reply.created_at}>{timestamp(reply.created_at)}</time></div><p>{reply.content}</p></div>)}
        {isHost&&<form className="answer-compose" onSubmit={submitAnswer}><label htmlFor="detail-answer">CEO 답변 입력</label><textarea ref={answerRef} id="detail-answer" value={answer} onChange={event=>{setAnswer(event.target.value);if(error)setError('');}} placeholder="현장의 질문에 답변을 남겨주세요." maxLength={2000} rows={4} disabled={!canAnswer||submitting} aria-invalid={Boolean(error)} aria-describedby={error?'detail-answer-error':undefined}/><button className="primary-button small" disabled={!canAnswer||submitting} type="submit">{submitting?'등록 중…':'답변 등록'} <Send size={17} aria-hidden="true"/></button>{!canAnswer&&<p className="detail-empty">질문 접수가 종료되어 답변을 작성할 수 없습니다.</p>}{error&&<p id="detail-answer-error" role="alert" className="error-message">{error}</p>}</form>}
      </section>
    </div>
  </dialog>;
}

export default function App(){
  const [role,setRole]=useState(null);
  const [room,setRoom]=useState(null);
  const [connected,setConnected]=useState(false);
  const [questions,setQuestions]=useState([]);
  const [initialFeedSettled,setInitialFeedSettled]=useState(false);
  const discussionTopics=DISCUSSION_TOPICS;
  const [initializing,setInitializing]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [syncStatus,setSyncStatus]=useState('polling');
  const [refreshing,setRefreshing]=useState(false);
  const [input,setInput]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [composeError,setComposeError]=useState('');
  const [toast,setToast]=useState('');
  const [hostOpen,setHostOpen]=useState(hostRequested);
  const [hostBusy,setHostBusy]=useState(false);
  const [hostError,setHostError]=useState('');
  const [shareOpen,setShareOpen]=useState(false);
  const [likeBusy,setLikeBusy]=useState({});
  const [sortOrder,setSortOrder]=useState('newest');
  const [selection,setSelection]=useState(null);
  const sortOrderRef=useRef('newest');
  const detailTrigger=useRef(null);
  const likeLocks=useRef(new Set());
  const refreshId=useRef(0);
  const toastTimer=useRef();
  const ready=Boolean(connected&&room);
  const isHost=role==='ceo';
  const canAsk=Boolean(ready&&room.is_open&&!isHost);
  const sortedQuestions=useMemo(()=>sortQuestions(questions,sortOrder),[questions,sortOrder]);
  const questionNumbers=useMemo(()=>new Map(sortQuestions(questions).map((item,index)=>[item.id,questions.length-index])),[questions]);
  const selectedQuestion=selection&&(questions.find(item=>item.id===selection.item.id)||selection.item);

  function openQuestion(item,index,trigger,focusAnswer=false){
    detailTrigger.current=trigger;
    setSelection({item,index,focusAnswer});
  }

  const closeQuestion=useCallback(()=>{
    const trigger=detailTrigger.current;
    setSelection(null);
    requestAnimationFrame(()=>{
      if(trigger?.isConnected)trigger.focus({preventScroll:true});
      else document.getElementById('timeline-heading')?.focus({preventScroll:true});
    });
  },[]);

  function notify(message){setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3000);}

  const init = useCallback(async () => {
    setInitializing(true);setLoadError('');
    try{
      const member=await joinWorkshop();
      const {data:found,error}=await supabase.from('meeting_sessions').select('id,slug,is_open,title').eq('slug',WORKSHOP_SLUG).single();
      if(error)throw error;
      setRole(member.role);
      setRoom(found);
      setConnected(true);
    }catch(err){setConnected(false);setLoadError(err.message||'서버에 연결하지 못했습니다.');}
    finally{setInitializing(false);}
  },[]);
  useEffect(()=>{init();return()=>clearTimeout(toastTimer.current);},[init]);

  const refresh = useCallback(async (quiet=false) => {
    if(!room?.id||!supabase)return;
    if(!quiet)setRefreshing(true);
    const stamp=++refreshId.current;
    try{
      // Order before limiting, so older popular questions are not excluded.
      let posts=supabase.from('meeting_posts').select('id,session_id,title,content,is_anonymous,author_name,created_at,status,reaction_count').eq('session_id',room.id).eq('status','open').eq('kind','question');
      if(sortOrderRef.current==='popular')posts=posts.order('reaction_count',{ascending:false,nullsFirst:false});
      const results=await Promise.all([
        posts.order('created_at',{ascending:false}).order('id',{ascending:true}).limit(250),
        supabase.from('meeting_replies').select('id,post_id,session_id,content,created_at,author_role').eq('session_id',room.id).order('created_at',{ascending:true}).limit(2000),
        supabase.from('meeting_reactions').select('post_id').eq('session_id',room.id).limit(5000),
        supabase.from('meeting_sessions').select('is_open').eq('id',room.id).single()
      ]);
      if(results.some(result=>result.error))throw results.find(result=>result.error).error;

      if(stamp===refreshId.current){
        const next=attachReactions(attachReplies(results[0].data||[],results[1].data||[]),results[2].data||[]);
        setQuestions(next);
        setSelection(old=>{
          if(!old)return old;
          const item=next.find(question=>question.id===old.item.id);
          return item?{...old,item}:old;
        });
        setRoom(old=>({...old,is_open:results[3].data.is_open}));
        setLoadError('');
      }
    }catch(err){if(stamp===refreshId.current)setLoadError('새 질문을 가져오지 못했습니다. 다시 연결해 주세요.');console.error('Workshop feed error:',err.message);}
    finally{if(stamp===refreshId.current){setRefreshing(false);setInitialFeedSettled(true);}}
  },[room?.id]);

  function changeSort(order){
    if(order===sortOrderRef.current)return;
    sortOrderRef.current=order;
    setSortOrder(order);
    refresh();
  }

  useEffect(()=>{
    if(!ready)return;
    let timer;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(true),300);};
    refresh();
    const channel=supabase.channel(`workshop-${room.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_posts',filter:`session_id=eq.${room.id}`},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_replies',filter:`session_id=eq.${room.id}`},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_reactions',filter:`session_id=eq.${room.id}`},schedule)
      .subscribe(status=>setSyncStatus(status==='SUBSCRIBED'?'live':'polling'));
    const interval=setInterval(()=>refresh(true),12000);
    return()=>{clearTimeout(timer);clearInterval(interval);supabase.removeChannel(channel);};
  },[ready,room?.id,refresh]);

  async function toggleLike(item){
    if(!ready||likeLocks.current.has(item.id))return;
    likeLocks.current.add(item.id);
    setLikeBusy(old=>({...old,[item.id]:true}));
    const nextLiked=!item.reacted;
    try{
      const result=nextLiked
        ?await supabase.from('meeting_reactions').insert({post_id:item.id,session_id:room.id})
        :await supabase.from('meeting_reactions').delete().eq('post_id',item.id);
      if(result.error)throw result.error;
      // Keep the tapped card responsive; the next snapshot synchronizes every viewer.
      setQuestions(old=>old.map(q=>q.id===item.id?{...q,reacted:nextLiked,reaction_count:Math.max(0,(q.reaction_count||0)+(nextLiked?1:-1))}:q));
      setSelection(old=>old?.item.id===item.id?{...old,item:{...old.item,reacted:nextLiked,reaction_count:Math.max(0,(old.item.reaction_count||0)+(nextLiked?1:-1))}}:old);
      await refresh(true);
    }catch(err){
      console.error('Question reaction error:',err.message);
      notify('공감을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      await refresh(true);
    }finally{
      likeLocks.current.delete(item.id);
      setLikeBusy(old=>{const copy={...old};delete copy[item.id];return copy;});
    }
  }

  async function submitQuestion(event){
    event.preventDefault();
    if(!canAsk)return;
    const content=input.trim();
    if(!isValidQuestion(content)){setComposeError('질문을 4~3,000자로 작성해 주세요.');return;}
    setSubmitting(true);setComposeError('');
    try{
      const title=makeQuestionTitle(content);
      const {error}=await supabase.from('meeting_posts').insert({session_id:room.id,kind:'question',title,content,is_anonymous:true});
      if(error)throw error;
      setInput('');await refresh();notify('질문이 등록되었습니다.');
    }catch(err){console.error('Question write error:',err.message);setComposeError('질문 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');}
    finally{setSubmitting(false);}
  }

  async function submitAnswer(postId,content){
    if(!isHost||!ready||!room.is_open)return false;
    try{
      const {error}=await supabase.from('meeting_replies').insert({session_id:room.id,post_id:postId,content,is_anonymous:false});
      if(error)throw error;
      await refresh();notify('CEO 공식 답변을 등록했습니다.');return true;
    }catch(err){console.error('Official answer write error:',err.message);return false;}
  }

  async function claimHost(code){
    setHostBusy(true);setHostError('');
    try{
      if(!code.trim()||!ready)throw new Error('연결 후 인증코드를 입력해 주세요.');
      const {error}=await supabase.rpc('claim_ceo_cl_on_site',{p_ceo_code:code.trim().toUpperCase()});
      if(error)throw error;
      joinPromise=null;
      const member=await joinWorkshop();setRole(member.role);
      setHostOpen(false);notify('CEO 공식 답변 기능이 활성화됐습니다.');
    }catch(err){setHostError(/already claimed/i.test(err.message)?'CEO 전용코드가 이미 다른 기기에서 사용됐습니다.':'인증코드를 확인하거나 운영자에게 문의해 주세요.');}
    finally{setHostBusy(false);}
  }

  return <div className="workshop-page">
    <header className="top-header"><div className="header-content"><img src={COMPANY_LOGO} alt="현대제철 HYUNDAI STEEL"/><div className="header-right"><span className="workshop-indicator"><span className={`status-dot ${syncStatus==='live'?'live':''}`}/>{ready?'실시간 질문':'연결 확인'}</span>{isHost&&<span className="ceo-mode"><ShieldCheck size={15}/> CEO</span>}</div></div></header>
    <main className="main-column">
      <section className="workshop-heading"><div className="heading-copy"><span className="overline">CEO × CHANGE LEADER</span><h1>온라인 워크숍</h1><p>궁금한 점을 자유롭게 남겨주세요.<br/>등록된 질문은 모두에게 바로 공유됩니다.</p></div><img src={MASCOT} alt="" aria-hidden="true"/></section>
      {loadError&&<div className="connection-alert" role="alert"><CircleHelp size={18}/><span>{loadError}</span><button onClick={()=>{if(connected)refresh();else init();}}>재시도</button></div>}
      {initializing&&<div className="status-message"><RefreshCw className="spin" size={18}/> 워크숍에 연결 중입니다…</div>}
      {!initializing&&isHost&&<div className="host-banner"><ShieldCheck size={18}/> CEO 공식 답변 모드입니다. 질문을 선택해 답변할 수 있습니다.</div>}
      {!initializing&&ready&&!room.is_open&&<div className="closed-banner"><Clock3 size={19}/> 질문 접수가 종료되었습니다. 등록된 대화는 계속 볼 수 있습니다.</div>}
      {!isHost&&<form className="question-composer" onSubmit={submitQuestion} aria-label="질문 작성"><label htmlFor="new-question">질문 남기기</label><textarea id="new-question" value={input} onChange={event=>{setInput(event.target.value);if(composeError)setComposeError('');}} placeholder="궁금한 점을 입력하세요" rows={3} maxLength={3000} disabled={!canAsk||submitting}/><div className="composer-footer"><span>{composeError?<span className="error-message" role="alert">{composeError}</span>:ready&&room.is_open?'이름 없이 등록됩니다.':initializing?'연결 중…':room&&!room.is_open?'질문 접수가 종료됐습니다.':'연결 후 작성할 수 있습니다.'}</span><button className="primary-button" type="submit" disabled={!canAsk||submitting||!isValidQuestion(input)}>{submitting?'등록 중…':'질문 등록'} <ArrowUp size={18}/></button></div></form>}
      <section className="questions-section" aria-labelledby="timeline-heading">
        <div className="timeline-header">
          <div className="timeline-title"><h2 id="timeline-heading" tabIndex={-1}>질문 타임라인</h2><span className="count">{questions.length}건</span></div>
          <div className="timeline-tools">
            <div className="sort-controls" role="group" aria-label="질문 정렬">
              <button type="button" className={`sort-button ${sortOrder==='newest'?'active':''}`} aria-pressed={sortOrder==='newest'} onClick={()=>changeSort('newest')}><Clock3 size={16} aria-hidden="true"/> 최신순</button>
              <button type="button" className={`sort-button ${sortOrder==='popular'?'active':''}`} aria-pressed={sortOrder==='popular'} onClick={()=>changeSort('popular')}><Heart size={16} aria-hidden="true"/> 공감순</button>
            </div>
            <button type="button" className="refresh-button" aria-label="질문 새로고침" onClick={()=>refresh()} disabled={!ready||refreshing}><RefreshCw size={18} className={refreshing?'spin':''}/></button>
          </div>
        </div>
        <p className="feed-hint">질문 카드를 누르면 큰 글씨로 질문과 답변을 볼 수 있습니다.</p>
        <span className="sr-only" role="status">{sortOrder==='popular'?'공감 많은 순서':'최신 등록 순서'}로 질문 {questions.length}건을 표시합니다.</span>
        {questions.length===0?<div className="empty-feed"><MessageCircle size={27}/><strong>{initializing?'질문을 불러오는 중입니다.':ready?'아직 등록된 질문이 없습니다.':'워크숍 연결을 확인해 주세요.'}</strong><p>{ready&&room.is_open&&!isHost?'첫 질문을 남겨 대화를 시작해 주세요.':'질문이 등록되면 여기에 표시됩니다.'}</p></div>:<div className="question-feed">{sortedQuestions.map(item=><QuestionRow key={item.id} item={item} index={questionNumbers.get(item.id)} isHost={isHost} onOpen={openQuestion} onLike={toggleLike} canLike={ready} likeBusy={Boolean(likeBusy[item.id])}/>)}</div>}
      </section>
      <PreworkSection layoutReady={!initializing&&(!room||initialFeedSettled)}/>
      {SHOW_DISCUSSION_TOPICS&&discussionTopics.length>0&&<section className="discussion-section" aria-labelledby="discussion-heading">
        <div className="discussion-heading"><div><span className="overline">DISCUSSION TOPICS</span><h2 id="discussion-heading">상호토의 주제로 갈음</h2></div><span className="discussion-count">{discussionTopics.reduce((count,topic)=>count+topic.content.split('\n').filter(line=>line.trim().startsWith('·')).length,0)}개 주제</span></div>
        <p className="discussion-description">아래 주제는 별도 상호토의 대상으로 분류하여 일반 질문 및 공감순 정렬에서 제외했습니다.</p>
        <div className="discussion-list">{discussionTopics.map(topic=><details className="discussion-topic" key={topic.id}><summary>{topic.title.replace(/^상호토의 주제로 갈음\s*[—–:-]\s*/,'')}<span className="discussion-topic-count">{topic.content.split('\n').filter(line=>line.trim().startsWith('·')).length}개</span></summary><ul>{topic.content.split('\n').filter(line=>line.trim().startsWith('·')).map((line,index)=><li key={index}>{line.trim().slice(1).trim()}</li>)}</ul></details>)}</div>
      </section>}
    </main>
    <button type="button" className="floating-qr" aria-label="워크숍 QR 접속 코드 열기" onClick={()=>setShareOpen(true)}><QrCode size={23} aria-hidden="true"/><span>QR 접속</span></button>
    {toast&&<div role="status" className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    {hostOpen&&<HostDialog onClose={()=>setHostOpen(false)} onClaim={claimHost} busy={hostBusy} error={hostError}/>}
    {shareOpen&&<ShareDialog onClose={()=>setShareOpen(false)}/>}
    {selectedQuestion&&<QuestionDialog key={selectedQuestion.id} item={selectedQuestion} index={selection.index} isHost={isHost} focusAnswer={selection.focusAnswer} onClose={closeQuestion} onAnswer={submitAnswer} onLike={toggleLike} canLike={ready} canAnswer={Boolean(ready&&room.is_open&&isHost)} likeBusy={Boolean(likeBusy[selectedQuestion.id])}/>}
  </div>;
}
