import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowRight, BellRing, Check, CheckCircle2, ChevronDown, ChevronLeft, CircleHelp,
  Clock3, Flame, Heart, Lightbulb, LockKeyhole, LogIn, LogOut, Maximize2, MessageCircle,
  MessageSquareQuote, Mic2, MoreHorizontal, Plus, QrCode, RefreshCw, Search, Send,
  ShieldCheck, Sparkles, UsersRound, X
} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {supabase} from './supabase.js';
import {CATEGORIES,CATEGORY_LABELS,MEETING_SLUG,createPreviewData} from './data.js';
import {applyFilters,displayName,isStaff,relativeTime,replyBadge,validPost} from './utils.js';

const BRAND = '/Board/brand/';

function IconLabel({icon:Icon,children}) {return <span className="icon-label"><Icon size={15} strokeWidth={1.8}/>{children}</span>;}
function getStatusText(online,preview) {return preview ? '화면 미리보기' : online ? '실시간 연결 중' : '연결 확인 중';}
function dateDisplay(v) {return v?new Date(v).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';}

function Dialog({children,onClose,className=''}) {
  useEffect(()=>{const esc=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',esc);document.body.classList.add('dialog-open');return()=>{document.removeEventListener('keydown',esc);document.body.classList.remove('dialog-open');};},[onClose]);
  return <div className="dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`dialog ${className}`} role="dialog" aria-modal="true">{children}</div></div>;
}

function LoginDialog({onClose,onSuccess}) {
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');setBusy(true);try{
    if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('올바른 이메일 주소를 입력해 주세요.');
    if(!supabase)throw new Error('회의용 보안 데이터베이스 연결 준비 후 인증을 이용할 수 있습니다.');
    const {error:authError}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.href.split('#')[0]}});
    if(authError) throw authError;
    setSent(true);onSuccess?.();
  }catch(err){setError(err.message||'로그인 메일을 보낼 수 없습니다.');}finally{setBusy(false);}};
  return <Dialog onClose={onClose} className="login-dialog">
    <div className="modal-heading"><div className="modal-icon"><LockKeyhole size={22}/></div><button className="bare-icon" onClick={onClose} aria-label="닫기"><X size={20}/></button></div>
    {sent?<div className="login-sent"><CheckCircle2 size={42}/><h2>인증 메일을 확인해 주세요.</h2><p>초대된 계정으로 로그인 링크를 전송했습니다. 메일의 링크를 열면 이 화면으로 돌아옵니다.</p><button className="solid-button" onClick={onClose}>확인</button></div>:
    <><h2>회의 공간 입장</h2><p className="modal-description">CEO–CL 미팅은 초대된 구성원만 참여할 수 있습니다. 등록된 업무용 이메일로 인증 링크를 받으세요.</p><form onSubmit={submit} className="auth-form"><label htmlFor="login-email">초대받은 이메일</label><input id="login-email" autoComplete="email" type="email" required placeholder="name@company.com" value={email} onChange={e=>setEmail(e.target.value)} /><p className="field-hint">등록된 이메일만 입장할 수 있습니다. 개인용 이메일은 사용할 수 없습니다.</p>{error&&<p className="form-error">{error}</p>}<button className="solid-button" type="submit" disabled={busy}>{busy?'전송 중…':'인증 링크 받기'}<ArrowRight size={16}/></button></form><div className="auth-note"><ShieldCheck size={17}/><span>접근 권한은 서버에서 검증합니다. 닉네임으로 CEO 권한을 설정할 수 없습니다.</span></div></>}
  </Dialog>;
}

function QRDialog({onClose}) {const url=window.location.origin+window.location.pathname;return <Dialog onClose={onClose} className="qr-dialog"><div className="modal-bar"><h2>모바일로 참여하기</h2><button className="bare-icon" onClick={onClose} aria-label="닫기"><X size={19}/></button></div><div className="qr-body"><div className="qr-frame"><QRCodeSVG value={url} size={220} fgColor="#002D62" bgColor="#ffffff" level="M" /></div><p>스마트폰 카메라로 QR 코드를 스캔하세요.</p><span className="qr-url">{url}</span></div></Dialog>;}

function ComposeDialog({onClose,onSubmit,submitting,preview,onNeedLogin}) {
  const [kind,setKind]=useState('question'),[title,setTitle]=useState(''),[content,setContent]=useState(''),[anonymous,setAnonymous]=useState(true),[error,setError]=useState('');
  const submit=async e=>{e.preventDefault();if(preview){onNeedLogin();return;}if(!validPost(title,content)){setError('제목은 4~120자, 본문은 10~3,000자로 작성해 주세요.');return;}const okay=await onSubmit({kind,title:title.trim(),content:content.trim(),is_anonymous:anonymous});if(okay)onClose();else setError('등록하지 못했습니다. 잠시 후 다시 시도해 주세요.');};
  return <Dialog onClose={onClose} className="compose-dialog"><div className="modal-bar"><div><span className="eyebrow">NEW CONVERSATION</span><h2>이야기 남기기</h2></div><button className="bare-icon" onClick={onClose} aria-label="닫기"><X size={21}/></button></div><form onSubmit={submit}><div className="compose-body"><p className="compose-intro">작은 질문 하나가 의미 있는 변화의 출발점이 됩니다.</p><label>이야기 유형</label><div className="kind-picker">{CATEGORIES.slice(1).map(c=><button type="button" key={c.id} className={kind===c.id?'kind-choice selected':'kind-choice'} onClick={()=>setKind(c.id)}>{c.label}</button>)}</div><label htmlFor="compose-title">제목</label><input id="compose-title" autoFocus required maxLength="120" placeholder="함께 이야기하고 싶은 주제를 적어주세요" value={title} onChange={e=>setTitle(e.target.value)} /><div className="counter">{title.length} / 120</div><label htmlFor="compose-content">내용</label><textarea id="compose-content" required rows="6" maxLength="3000" placeholder="어떤 경험이나 고민에서 출발한 이야기인가요? 구체적으로 적어주세요." value={content} onChange={e=>setContent(e.target.value)} /><div className="counter">{content.length} / 3,000</div><label className="anon-switch"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/><span className="switch-track"/><span><strong>다른 참가자에게 익명으로 표시</strong><small>참가자는 작성자를 볼 수 없지만, 운영 정책에 따라 관리자는 작성자를 확인할 수 있습니다.</small></span></label>{error&&<p className="form-error">{error}</p>}{preview&&<div className="compose-preview-note"><LockKeyhole size={17}/> 실제 작성은 초대 계정으로 입장한 후 가능합니다.</div>}</div><div className="compose-footer"><button type="button" className="outline-button" onClick={onClose}>취소</button><button type="submit" className="solid-button" disabled={submitting}>{submitting?'등록 중…':preview?'입장하고 작성하기':'이야기 등록'}<Send size={16}/></button></div></form></Dialog>;
}

function ReplyCard({reply}) {const isCeo=reply.author_role==='ceo',isModerator=reply.author_role==='moderator';return <div className={`reply-card ${isCeo?'ceo-reply':''}`}><div className="reply-heading"><div className={isCeo?'reply-avatar ceo-avatar':'reply-avatar'}>{isCeo?<Mic2 size={17}/>:isModerator?<ShieldCheck size={16}/>:<UsersRound size={16}/>}</div><div className="reply-person"><div className="reply-name">{isCeo?'CEO':isModerator?'운영진':reply.is_anonymous?'익명 CL':(reply.author_name||'Change Leader')}{isCeo&&<span className="verified"><Check size={11}/>{replyBadge(reply.author_role)}</span>}</div><div className="reply-when">{dateDisplay(reply.created_at)}</div></div></div><p className="reply-text">{reply.content||reply.body}</p></div>}

function ThreadDialog({post,onClose,preview,member,onAddReply,onLike,onHide,onNeedLogin,busy}) {
  const [reply,setReply]=useState(''),[anonymous,setAnonymous]=useState(true),[error,setError]=useState('');
  const answered=(post.replies||[]).some(r=>r.author_role==='ceo');
  const add=async e=>{e.preventDefault();if(preview){onNeedLogin();return;}if(reply.trim().length<2||reply.length>2000){setError('댓글을 2~2,000자로 작성해 주세요.');return;}const ok=await onAddReply(post.id,reply.trim(),anonymous);if(ok){setReply('');setError('');}else setError('댓글을 등록하지 못했습니다.');};
  return <Dialog onClose={onClose} className="thread-dialog"><div className="modal-bar"><div><span className="eyebrow">OPEN CONVERSATION</span><h2>질문과 답변</h2></div><button className="bare-icon" onClick={onClose} aria-label="닫기"><X size={21}/></button></div><div className="thread-body"><div className="thread-labels"><span className="type-tag">{CATEGORY_LABELS[post.kind]||'이야기'}</span>{answered&&<span className="answered-tag"><CheckCircle2 size={13}/> CEO 답변 완료</span>}</div><h3 className="thread-title">{post.title}</h3><div className="thread-author"><span className="mini-avatar"><UsersRound size={15}/></span>{displayName(post)}<span className="separator">·</span>{dateDisplay(post.created_at)}</div><p className="thread-content">{post.content}</p><div className="thread-actions"><button className={`heart-button ${post.reacted?'reacted':''}`} onClick={()=>preview?onNeedLogin():onLike(post)} disabled={busy}><Heart size={17} fill={post.reacted?'currentColor':'none'}/> 공감 {post.reaction_count||0}</button>{member?.role==='moderator'&&!preview&&<button className="text-button danger" onClick={()=>{if(window.confirm('해당 게시글을 숨기시겠습니까? (데이터는 삭제되지 않습니다)'))onHide(post.id);}}>게시글 숨기기</button>}</div><div className="thread-divider"/><div className="thread-replies-title"><MessageSquareQuote size={18}/><h4>함께 나눈 이야기</h4><span>{(post.replies||[]).length}</span></div>{post.replies?.length?<div className="replies">{post.replies.map(reply=><ReplyCard key={reply.id} reply={reply}/>)}</div>:<div className="no-replies"><MessageCircle size={24}/><p>아직 답변이 없습니다. 첫 이야기를 남겨 보세요.</p></div>}<form className="reply-form" onSubmit={add}><label htmlFor="reply-field">{member?.role==='ceo'?'CEO 답변 작성':'의견 더하기'}</label><textarea id="reply-field" rows={3} placeholder={preview?'미리보기에서는 작성이 제한됩니다.':'존중하는 마음으로 의견을 남겨 주세요.'} value={reply} maxLength={2000} onChange={e=>setReply(e.target.value)}/><div className="reply-form-bottom"><label className="check-label"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} disabled={member?.role==='ceo'}/> 익명으로 표시</label>{error&&<span className="form-error">{error}</span>}<button className="solid-button small" type="submit" disabled={busy}>{preview?'로그인 후 작성':'의견 남기기'}<Send size={15}/></button></div></form></div></Dialog>;
}

function PostCard({post,onSelect,onLike,preview,onNeedLogin}) {
  const answered=(post.replies||[]).some(x=>x.author_role==='ceo');
  return <article className="post-card" onClick={()=>onSelect(post)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onSelect(post)}}} role="button" tabIndex={0} aria-label={`${post.title} 보기`}><div className="card-head"><div className="card-tags"><span className={`type-tag type-${post.kind}`}>{post.kind==='question'?<CircleHelp size={13}/>:post.kind==='idea'?<Lightbulb size={13}/>:<MessageCircle size={13}/>} {CATEGORY_LABELS[post.kind]||'이야기'}</span>{answered&&<span className="answered-tag"><CheckCircle2 size={13}/> CEO 답변</span>}</div><time className="post-time">{relativeTime(post.created_at)}</time></div><h3>{post.title}</h3><p className="post-excerpt">{post.content}</p><div className="card-bottom"><div className="card-author"><span className="mini-avatar"><UsersRound size={14}/></span><span>{displayName(post)}</span></div><div className="card-metrics"><button className={`metric ${post.reacted?'reacted':''}`} onClick={e=>{e.stopPropagation();preview?onNeedLogin():onLike(post)}} aria-label="공감" title="공감"><Heart size={17} fill={post.reacted?'currentColor':'none'}/><span>{post.reaction_count||0}</span></button><span className="metric"><MessageCircle size={17}/>{post.replies?.length||0}</span><span className="view-more">자세히 <ArrowRight size={14}/></span></div></div></article>;
}

function App() {
  const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[member,setMember]=useState(null),[meeting,setMeeting]=useState(null);
  const [posts,setPosts]=useState(createPreviewData),[loading,setLoading]=useState(false),[syncing,setSyncing]=useState(false),[realtime,setRealtime]=useState(false),[dbIssue,setDbIssue]=useState('');
  const [category,setCategory]=useState('all'),[view,setView]=useState('all'),[sort,setSort]=useState('latest'),[search,setSearch]=useState('');
  const [composeOpen,setComposeOpen]=useState(false),[qrOpen,setQrOpen]=useState(false),[loginOpen,setLoginOpen]=useState(false),[detailId,setDetailId]=useState(null),[busy,setBusy]=useState(false),[toast,setToast]=useState(''),[screenMode,setScreenMode]=useState(false);
  const refreshTimer=useRef(null);
  const preview=!member || !meeting;
  const showToast=msg=>setToast(msg);
  useEffect(()=>{const timer=toast&&setTimeout(()=>setToast(''),3600);return()=>clearTimeout(timer);},[toast]);

  useEffect(()=>{
    let alive=true;
    if(!supabase){setAuthReady(true);setDbIssue('setup');return;}
    supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setAuthReady(true);}}).catch(()=>{if(alive)setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>{if(alive){setSession(newSession);setAuthReady(true);}});
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    let active=true;
    if(!session?.user?.id){setMember(null);setMeeting(null);setPosts(createPreviewData());return;}
    (async()=>{setLoading(true);setDbIssue('');
      try{
        const {data:me,error:mErr}=await supabase.from('meeting_members').select('user_id,display_name,role,is_active').eq('user_id',session.user.id).maybeSingle();
        if(mErr)throw mErr;
        if(!active)return;
        if(!me?.is_active){setMember(null);setMeeting(null);setDbIssue('access');return;}
        setMember(me);
        const {data:room,error:roomErr}=await supabase.from('meeting_sessions').select('id,slug,title,is_open,starts_at').eq('slug',MEETING_SLUG).maybeSingle();
        if(roomErr)throw roomErr;
        if(!active)return;
        if(!room){setMeeting(null);setDbIssue('setup');return;}
        setMeeting(room);
      }catch(err){if(active){setDbIssue('setup');setMember(null);setMeeting(null);console.error('Meeting setup:',err?.message||err);}}finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[session?.user?.id]);

  const refresh=useCallback(async (quiet=false)=>{
    if(!member||!meeting)return;
    if(!quiet)setLoading(true);else setSyncing(true);
    try{
      const [p,r,v]=await Promise.all([
        supabase.from('meeting_posts').select('id,session_id,kind,title,content,author_name,is_anonymous,created_at,status,reaction_count').eq('session_id',meeting.id).neq('status','hidden').order('created_at',{ascending:false}).limit(300),
        supabase.from('meeting_replies').select('id,post_id,session_id,content,author_name,is_anonymous,author_role,created_at').eq('session_id',meeting.id).order('created_at',{ascending:true}).limit(1500),
        supabase.from('meeting_reactions').select('post_id,user_id').eq('session_id',meeting.id).eq('user_id',session.user.id).limit(5000)
      ]);
      if(p.error||r.error||v.error)throw(p.error||r.error||v.error);
      const replyBy={},mine=new Set();
      (r.data||[]).forEach(x=>(replyBy[x.post_id]??=[]).push(x));
      (v.data||[]).forEach(x=>mine.add(x.post_id));
      setPosts((p.data||[]).map(x=>({...x,replies:replyBy[x.id]||[],reacted:mine.has(x.id)})));
      setDbIssue('');
    }catch(err){setDbIssue('data');console.error('Meeting refresh:',err?.message||err);}finally{if(!quiet)setLoading(false);setSyncing(false);}
  },[member?.user_id,meeting?.id,session?.user?.id]);

  useEffect(()=>{
    if(!meeting||!member){setRealtime(false);return;}
    refresh();
    const trigger=()=>{if(refreshTimer.current)clearTimeout(refreshTimer.current);refreshTimer.current=setTimeout(()=>refresh(true),360);};
    const channel=supabase.channel(`meeting-${meeting.id}-${session.user.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_posts',filter:`session_id=eq.${meeting.id}`},trigger)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_replies',filter:`session_id=eq.${meeting.id}`},trigger)
      .on('postgres_changes',{event:'*',schema:'public',table:'meeting_reactions',filter:`session_id=eq.${meeting.id}`},trigger)
      .subscribe(status=>setRealtime(status==='SUBSCRIBED'));
    const poll=setInterval(()=>refresh(true),15000);
    return()=>{clearInterval(poll);if(refreshTimer.current)clearTimeout(refreshTimer.current);supabase.removeChannel(channel);};
  },[meeting?.id,member?.user_id,refresh]);

  const createPost=async payload=>{
    if(preview||!meeting?.is_open)return false;
    setBusy(true);
    try{const {error}=await supabase.from('meeting_posts').insert([{session_id:meeting.id,...payload,author_name:member.display_name||'Change Leader'}]);if(error)throw error;await refresh(true);showToast('새로운 이야기가 등록되었습니다.');return true;}
    catch(err){console.error(err);showToast('등록 오류: 회의 운영진에게 문의해 주세요.');return false;}finally{setBusy(false);}
  };
  const addReply=async(postId,content,is_anonymous)=>{
    if(preview)return false;
    setBusy(true);
    try{const {error}=await supabase.from('meeting_replies').insert([{session_id:meeting.id,post_id:postId,content,is_anonymous:member.role==='ceo'?false:is_anonymous}]);if(error)throw error;await refresh(true);showToast('의견이 등록되었습니다.');return true;}
    catch(err){console.error(err);showToast('의견 등록에 실패했습니다.');return false;}finally{setBusy(false);}
  };
  const like=async post=>{
    if(preview){setLoginOpen(true);return;}
    try{const response=post.reacted?await supabase.from('meeting_reactions').delete().eq('post_id',post.id).eq('user_id',session.user.id):await supabase.from('meeting_reactions').insert([{post_id:post.id,session_id:meeting.id}]);if(response.error)throw response.error;await refresh(true);}
    catch(err){console.error(err);showToast('공감 상태를 변경하지 못했습니다.');}
  };
  const hide=async id=>{
    if(member?.role!=='moderator')return;
    const {error}=await supabase.from('meeting_posts').update({status:'hidden'}).eq('id',id);
    if(error){showToast('숨기기 처리에 실패했습니다.');return;}
    setDetailId(null);await refresh(true);showToast('게시글을 숨겼습니다.');
  };
  const signOut=async()=>{if(supabase)await supabase.auth.signOut();setSession(null);setMember(null);setMeeting(null);setPosts(createPreviewData());setDetailId(null);showToast('로그아웃했습니다.');};
  const previewGate=()=>{setComposeOpen(false);setDetailId(null);setLoginOpen(true);};

  const filtered=useMemo(()=>applyFilters(posts,{category,sort,search,view}),[posts,category,sort,search,view]);
  const answeredCount=posts.filter(p=>(p.replies||[]).some(x=>x.author_role==='ceo')).length;
  const voiceCount=posts.filter(p=>p.kind==='voice').length;
  const currentPost=posts.find(p=>p.id===detailId);
  const meetingOpen=preview||meeting?.is_open;

  return <div className={`app-shell ${screenMode?'projector-mode':''}`}>
    <div className="topline"/>
    <header className="site-header"><div className="header-inner"><div className="identity"><img className="corporate-logo" src={`${BRAND}hyundai-steel-ci.png`} alt="현대제철 HYUNDAI STEEL"/><div className="identity-separator"/><div className="brand-program"><span>PEOPLE & CULTURE</span><strong>CEO × CL DIALOGUE</strong></div></div><nav className="site-actions" aria-label="사이트 메뉴"><span className={`connection-pill ${realtime?'connected':''}`}><span className="connection-dot"/>{getStatusText(realtime,preview)}</span><button className="header-icon-button" onClick={()=>setQrOpen(true)} title="QR 코드"><QrCode size={19}/><span>모바일 참여</span></button>{member?<button className="header-icon-button" onClick={signOut}><LogOut size={18}/><span>나가기</span></button>:<button className="header-login" onClick={()=>setLoginOpen(true)}><LogIn size={16}/> 구성원 입장</button>}</nav></div></header>

    <main className="page-wrap">
      <section className="hero"><div className="hero-copy"><div className="hero-kicker"><span className="hero-live-dot"/>HYUNDAI STEEL · OPEN CONVERSATION</div><h1>현대제철 <span>CEO–CL</span><br/>온라인 미팅</h1><p className="hero-description">우리의 질문이 변화를 만들고,<br className="mobile-only"/> 진솔한 대화가 내일을 움직입니다.</p><div className="hero-buttons"><button className="hero-primary" onClick={()=>meetingOpen?setComposeOpen(true):showToast('현재 질문 접수 시간이 아닙니다.')}><Plus size={19}/> 질문 · 의견 남기기 <ArrowRight size={17}/></button><button className="hero-secondary" onClick={()=>setQrOpen(true)}><QrCode size={19}/> QR로 참여하기</button></div></div><div className="hero-illustration" aria-hidden="true"><span className="hero-glow"/><img src={`${BRAND}yonggang-mascot.png`} alt=""/><div className="hero-speech"><MessageSquareQuote size={17}/><span>마음껏 이야기해요!</span></div></div><span className="hero-decoration decoration-1"/><span className="hero-decoration decoration-2"/></section>

      {preview&&<div className="preview-banner"><div className="preview-left"><span className="preview-icon"><LockKeyhole size={17}/></span><div><strong>디자인 미리보기 · 아래 글과 답변은 모두 가상의 예시입니다.</strong><span>{dbIssue==='setup'?'현재 회의 데이터베이스 설정 또는 연결을 확인해야 합니다.':'실제 게시글은 초대된 구성원으로 인증한 후에만 표시됩니다.'}</span></div></div><button onClick={()=>setLoginOpen(true)}>초대 계정으로 입장 <ArrowRight size={15}/></button></div>}
      {!preview&&dbIssue==='data'&&<div className="warning-banner"><BellRing size={17}/> 서버 연결이 원활하지 않습니다. 최신 게시글이 잠시 표시되지 않을 수 있습니다. <button onClick={()=>refresh()}>다시 연결</button></div>}
      {!preview&&!meeting?.is_open&&<div className="warning-banner"><Clock3 size={17}/> 현재 질문 접수가 종료되었습니다. 기존 질문과 답변은 열람할 수 있습니다.</div>}

      <section className="stats-strip" aria-label="미팅 현황"><div className="stats-intro"><span className="stats-label">CONVERSATION AT A GLANCE</span><strong>한눈에 보는 우리 대화</strong></div><div className="stats-items"><div className="stat"><div className="stat-icon"><MessageCircle size={19}/></div><div><strong>{posts.length}<small>건</small></strong><span>등록된 이야기</span></div></div><div className="stat"><div className="stat-icon"><Mic2 size={20}/></div><div><strong>{answeredCount}<small>건</small></strong><span>CEO 답변</span></div></div><div className="stat"><div className="stat-icon"><Heart size={20}/></div><div><strong>{posts.reduce((sum,p)=>sum+(p.reaction_count||0),0)}<small>회</small></strong><span>서로의 공감</span></div></div><div className="stat last"><div className="stat-icon"><UsersRound size={20}/></div><div><strong>{voiceCount}<small>건</small></strong><span>현장의 목소리</span></div></div></div></section>

      <div className="workspace-grid"><section className="feed-area"><div className="section-top"><div><span className="section-overline">LIVE TIMELINE</span><h2>함께 나누는 이야기<span className="count-bubble">{filtered.length}</span></h2><p>등록된 질문과 의견이 시간순으로 공유됩니다.</p></div><div className="section-controls"><button className="quiet-button" onClick={()=>preview?showToast('미리보기 데이터를 표시 중입니다.'):refresh(true)} title="최신 새로고침"><RefreshCw size={17} className={syncing?'spin':''}/></button><button className="quiet-button desktop-only" onClick={()=>setScreenMode(!screenMode)} title="스크린 표시 모드"><Maximize2 size={17}/></button><select aria-label="정렬 방식" className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}><option value="latest">최신순</option><option value="popular">공감순</option></select></div></div>
      <div className="filter-panel"><div className="tab-list" role="tablist" aria-label="이야기 유형">{CATEGORIES.map(c=><button key={c.id} role="tab" aria-selected={category===c.id} className={`tab ${category===c.id?'active':''}`} onClick={()=>setCategory(c.id)}>{c.label}</button>)}</div><div className="filter-second"><div className="search-field"><Search size={18}/><input aria-label="질문 검색" placeholder="질문·키워드 검색" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')} aria-label="검색 지우기"><X size={14}/></button>}</div><div className="answer-filter"><select value={view} onChange={e=>setView(e.target.value)} aria-label="답변 상태"><option value="all">모든 상태</option><option value="answered">CEO 답변 완료</option><option value="unanswered">CEO 답변 대기</option></select><ChevronDown size={15}/></div></div></div>

      <div className="feed-list" aria-live="polite">{loading&&!posts.length?<div className="load-state"><RefreshCw className="spin"/> 질문을 불러오는 중입니다.</div>:filtered.length?filtered.map(post=><PostCard key={post.id} post={post} onSelect={p=>setDetailId(p.id)} onLike={like} preview={preview} onNeedLogin={previewGate}/>):<div className="empty-state"><div className="empty-icon"><MessageCircle size={27}/></div><h3>조건에 맞는 이야기가 없습니다.</h3><p>다른 검색어로 찾아보거나 첫 이야기를 남겨주세요.</p><button className="solid-button small" onClick={()=>setComposeOpen(true)}><Plus size={15}/> 이야기 남기기</button></div>}</div>
      <div className="feed-end"><span className="feed-end-line"/><span><Flame size={15}/> 오늘의 대화가 내일의 변화로</span><span className="feed-end-line"/></div></section>

      <aside className="right-rail"><div className="guide-card"><div className="guide-heading"><span className="guide-icon"><Sparkles size={21}/></span><div><span className="sidebar-overline">A CONVERSATION THAT MATTERS</span><h3>우리, 이렇게 이야기해요</h3></div></div><div className="guide-steps"><div><span>01</span><p><strong>편안하게 질문해요</strong><small>사소한 궁금증도 괜찮습니다.</small></p></div><div><span>02</span><p><strong>서로의 관점을 존중해요</strong><small>다른 의견에도 열린 마음으로.</small></p></div><div><span>03</span><p><strong>함께 실천을 고민해요</strong><small>한 번의 대화를 실제 변화로.</small></p></div></div><div className="guide-message"><MessageSquareQuote size={16}/><span>좋은 질문이 좋은 변화를 만듭니다.</span></div></div>
      <div className="yonggang-card"><div className="sidebar-overline">MEET YONGGANG-I</div><h3>용강이도 듣고 있어요!</h3><p>모든 질문에 귀 기울이는<br/>따뜻한 소통의 공간</p><div className="mascot-frame"><img src={`${BRAND}yonggang-mascot.png`} alt="현대제철 문화 캐릭터 용강이"/></div><div className="mini-sparkle a">✦</div><div className="mini-sparkle b">✧</div></div>
      <div className="sidebar-privacy"><ShieldCheck size={18}/><div><strong>안전한 대화를 위한 약속</strong><p>참가자 화면에서 익명 질문의 이름은 가려집니다. 다만 운영상 필요한 경우 관리자는 작성자를 확인할 수 있습니다.</p></div></div>
      <button className="qr-rail" onClick={()=>setQrOpen(true)}><span className="qr-rail-icon"><QrCode size={21}/></span><span><strong>모바일에서 이어서 대화하기</strong><small>QR 코드로 간편하게 접속</small></span><ArrowRight size={18}/></button></aside></div>
    </main>
    <footer className="site-footer"><div><img src={`${BRAND}hyundai-steel-ci.png`} alt="현대제철"/><div><span>현대제철 CEO–CL 온라인 미팅</span><small>서로를 존중하는 대화, 함께 만드는 변화</small></div></div><span>INTERNAL CONVERSATION SPACE · 임직원 전용</span></footer>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="닫기"><X size={16}/></button></div>}
    {composeOpen&&<ComposeDialog onClose={()=>setComposeOpen(false)} onSubmit={createPost} submitting={busy} preview={preview} onNeedLogin={previewGate}/>}
    {detailId&&currentPost&&<ThreadDialog key={detailId} post={currentPost} onClose={()=>setDetailId(null)} member={member} preview={preview} onAddReply={addReply} onLike={like} onHide={hide} onNeedLogin={previewGate} busy={busy}/>}
    {loginOpen&&<LoginDialog onClose={()=>setLoginOpen(false)} onSuccess={()=>showToast('인증 메일이 전송되었습니다.')}/>}
    {qrOpen&&<QRDialog onClose={()=>setQrOpen(false)}/>}
  </div>;
}
export default App;
