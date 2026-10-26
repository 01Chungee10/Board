import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ArrowUp, Check, CheckCircle2, ChevronDown, ChevronUp, CircleHelp,
  Clock3, LockKeyhole, MessageCircle, RefreshCw, Send, ShieldCheck, X
} from 'lucide-react';
import {supabase} from './supabase.js';
import {attachReplies,isValidQuestion,makeQuestionTitle} from './workshop-utils.js';

const WORKSHOP_SLUG = import.meta.env.VITE_MEETING_SLUG || 'ceo-cl-2026';
const COMPANY_LOGO = '/Board/brand/hyundai-steel-ci.png';
const MASCOT = '/Board/brand/yonggang-mascot.png';
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

function QuestionRow({item,index,isHost,onAnswer}) {
  const [expanded,setExpanded]=useState(false);
  const [answer,setAnswer]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const replies=item.replies||[];
  const ceoReplies=replies.filter(reply=>reply.author_role==='ceo');
  const latest=ceoReplies.length?ceoReplies[ceoReplies.length-1]:null;
  const question=(item.content||item.title||'').trim();

  async function submitAnswer(event){
    event.preventDefault();
    if(answer.trim().length<2){setError('답변을 2자 이상 작성해 주세요.');return;}
    setSubmitting(true);setError('');
    const ok=await onAnswer(item.id,answer.trim());
    if(ok){setAnswer('');setExpanded(true);}else{setError('등록에 실패했습니다. 연결 상태를 확인해 주세요.');}
    setSubmitting(false);
  }

  return <article className="question-item">
    <div className="question-meta"><div className="question-person"><span className="timeline-dot"/><span>질문 {index}</span><span className="meta-divider">·</span><span>익명 참가자</span></div><time dateTime={item.created_at}>{timestamp(item.created_at)}</time></div>
    <p className="question-content">{question}</p>
    {latest&&!expanded&&<div className="answer-preview"><div className="answer-heading"><CheckCircle2 size={17}/> CEO 답변</div><p>{latest.content}</p></div>}
    {(replies.length>0||isHost)&&<div className="question-actions">
      {replies.length>0&&<button type="button" className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>
        {expanded?'답변 접기':`답변 ${replies.length}건 보기`} {expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
      </button>}
      {isHost&&<button className="answer-button" type="button" onClick={()=>setExpanded(!expanded)}><MessageCircle size={16}/>{expanded?'닫기':'CEO 답변 작성'}</button>}
    </div>}
    {expanded&&<div className="answer-details">
      {replies.map(reply=><div className={`reply-line ${reply.author_role==='ceo'?'official':''}`} key={reply.id}><div className="reply-line-head"><span>{reply.author_role==='ceo'?'CEO 공식 답변':'참가자 의견'}</span><time>{timestamp(reply.created_at)}</time></div><p>{reply.content}</p></div>)}
      {isHost&&<form className="answer-compose" onSubmit={submitAnswer}><label htmlFor={`reply-${item.id}`}>CEO 답변 입력</label><textarea id={`reply-${item.id}`} value={answer} onChange={event=>setAnswer(event.target.value)} placeholder="현장의 질문에 답변을 남겨주세요." maxLength={2000} rows={3}/><button className="primary-button small" disabled={submitting||!answer.trim()} type="submit">{submitting?'등록 중…':'답변 등록'} <Send size={17}/></button>{error&&<p role="alert" className="error-message">{error}</p>}</form>}
    </div>}
  </article>;
}

export default function App(){
  const [role,setRole]=useState(null);
  const [room,setRoom]=useState(null);
  const [connected,setConnected]=useState(false);
  const [questions,setQuestions]=useState([]);
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
  const refreshId=useRef(0);
  const toastTimer=useRef();
  const loadLock=useRef(false);
  const ready=Boolean(connected&&room);
  const isHost=role==='ceo';
  const canAsk=Boolean(ready&&room.is_open&&!isHost);

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
    if(!room?.id||!supabase||loadLock.current)return;
    loadLock.current=true;
    if(!quiet)setRefreshing(true);
    const stamp=++refreshId.current;
    try{
      const results=await Promise.all([
        supabase.from('meeting_posts').select('id,session_id,title,content,is_anonymous,author_name,created_at,status').eq('session_id',room.id).eq('status','open').eq('kind','question').order('created_at',{ascending:false}).limit(250),
        supabase.from('meeting_replies').select('id,post_id,session_id,content,created_at,author_role').eq('session_id',room.id).order('created_at',{ascending:true}).limit(2000),
        supabase.from('meeting_sessions').select('is_open').eq('id',room.id).single()
      ]);
      if(results.some(result=>result.error))throw results.find(result=>result.error).error;

      if(stamp===refreshId.current){
        setQuestions(attachReplies(results[0].data||[],results[1].data||[]));
        setRoom(old=>({...old,is_open:results[2].data.is_open}));
        setLoadError('');
      }
    }catch(err){setLoadError('새 질문을 가져오지 못했습니다. 다시 연결해 주세요.');console.error('Workshop feed error:',err.message);}
    finally{loadLock.current=false;if(!quiet)setRefreshing(false);}
  },[room?.id]);

  useEffect(()=>{
    if(!ready)return;
    let timer;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(true),300);};
    refresh();
    const channel=supabase.channel(`workshop-${room.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_posts',filter:`session_id=eq.${room.id}`},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_replies',filter:`session_id=eq.${room.id}`},schedule)
      .subscribe(status=>setSyncStatus(status==='SUBSCRIBED'?'live':'polling'));
    const interval=setInterval(()=>refresh(true),12000);
    return()=>{clearTimeout(timer);clearInterval(interval);supabase.removeChannel(channel);};
  },[ready,room?.id,refresh]);

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
      <section className="questions-section" aria-labelledby="timeline-heading"><div className="timeline-header"><div><h2 id="timeline-heading">질문 타임라인</h2><span className="count">{questions.length}건</span></div><button type="button" className="refresh-button" aria-label="질문 새로고침" onClick={()=>refresh()} disabled={!ready||refreshing}><RefreshCw size={18} className={refreshing?'spin':''}/></button></div>
        {questions.length===0?<div className="empty-feed"><MessageCircle size={27}/><strong>{initializing?'질문을 불러오는 중입니다.':ready?'아직 등록된 질문이 없습니다.':'워크숍 연결을 확인해 주세요.'}</strong><p>{ready&&room.is_open&&!isHost?'첫 질문을 남겨 대화를 시작해 주세요.':'질문이 등록되면 여기에 표시됩니다.'}</p></div>:<div className="question-feed">{questions.map((item,index)=><QuestionRow key={item.id} item={item} index={questions.length-index} isHost={isHost} onAnswer={submitAnswer}/>)}</div>}
      </section>
    </main>
    {toast&&<div role="status" className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    {hostOpen&&<HostDialog onClose={()=>setHostOpen(false)} onClaim={claimHost} busy={hostBusy} error={hostError}/>}
  </div>;
}
