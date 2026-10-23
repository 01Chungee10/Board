import React, {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,LockKeyhole,MailCheck,ShieldCheck,UsersRound, X} from 'lucide-react';
import {supabase} from './supabase.js';

/**
 * All roles and identities are enforced by database SECURITY DEFINER RPC functions.
 * No meeting code or CEO credential is compiled into the public site.
 */
export default function EntryDialog({onClose,onEntered,session,initialInvite=''}) {
  const [tab,setTab]=useState('cl');
  const [name,setName]=useState('');
  const [invite,setInvite]=useState(initialInvite);
  const [hostSecret,setHostSecret]=useState('');
  const [email,setEmail]=useState('');
  const [sent,setSent]=useState(false);
  const [hostMethod,setHostMethod]=useState('on-site');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const verifiedEmail=Boolean(session?.user?.email && !session?.user?.is_anonymous);
  useEffect(()=>{
    const esc=e=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',esc);
    document.body.classList.add('dialog-open');
    return()=>{document.removeEventListener('keydown',esc);document.body.classList.remove('dialog-open');};
  },[onClose]);

  async function joinCL(e){
    e.preventDefault();setError('');setBusy(true);
    try {
      if(!supabase)throw new Error('서버 연결이 설정되지 않았습니다.');
      if(invite.trim().length<8)throw new Error('회의 참여코드를 확인해 주세요.');
      const current=session || (await supabase.auth.getSession()).data.session;
      if(!current){
        const {error:authError}=await supabase.auth.signInAnonymously();
        if(authError)throw authError;
      }
      const {error:joinError}=await supabase.rpc('join_ceo_cl_meeting',{p_code:invite.trim().toUpperCase(),p_display_name:name.trim()||'Change Leader'});
      if(joinError)throw joinError;
      onEntered();
    }catch(err){
      setError(/Invalid meeting code/i.test(err?.message||'')?'참여코드가 올바르지 않거나 유효기간이 지났습니다.':err?.message||'입장에 실패했습니다.');
    }finally{setBusy(false);}
  }

  async function mailCEO(e){
    e.preventDefault();setError('');setBusy(true);
    try{
      if(!supabase)throw new Error('서버 연결이 설정되지 않았습니다.');
      const addr=email.trim();
      if(!/^\S+@\S+\.\S+$/.test(addr))throw new Error('이메일 주소를 확인해 주세요.');
      const {error:err}=await supabase.auth.signInWithOtp({email:addr,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
      if(err)throw err;
      setSent(true);
    }catch(err){setError(err?.message||'인증 메일 전송에 실패했습니다.');}finally{setBusy(false);}
  }

  async function claimOnSite(e){
    e.preventDefault();setError('');setBusy(true);
    try{
      if(!supabase)throw new Error('서버 연결이 설정되지 않았습니다.');
      if(hostSecret.trim().length<16)throw new Error('CEO 전용 인증코드를 확인해 주세요.');
      const current=session || (await supabase.auth.getSession()).data.session;
      if(!current){
        const {error:signError}=await supabase.auth.signInAnonymously();
        if(signError)throw signError;
      }
      const {error:err}=await supabase.rpc('claim_ceo_cl_on_site',{p_ceo_code:hostSecret.trim().toUpperCase()});
      if(err)throw err;
      onEntered();
    }catch(err){
      setError(/CEO role already claimed/i.test(err?.message||'')?'이미 다른 기기에서 CEO 권한이 등록되었습니다. 운영자에게 문의하세요.':err?.message||'CEO 인증에 실패했습니다.');
    }finally{setBusy(false);}
  }

  async function claimCEO(e){
    e.preventDefault();setError('');setBusy(true);
    try{
      if(!supabase)throw new Error('서버 연결이 설정되지 않았습니다.');
      if(!hostSecret.trim())throw new Error('CEO에게 별도로 전달된 인증코드를 입력해 주세요.');
      const {error:err}=await supabase.rpc('claim_ceo_cl_host',{p_ceo_code:hostSecret.trim().toUpperCase()});
      if(err)throw err;
      onEntered();
    }catch(err){setError(/CEO role already claimed/i.test(err?.message||'')?'CEO 인증코드는 이미 다른 계정에 등록됐습니다. 운영자에게 문의하세요.':err?.message||'CEO 권한 등록에 실패했습니다.');}
    finally{setBusy(false);}
  }

  return <div className="dialog-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
    <div className="dialog login-dialog entry-dialog" role="dialog" aria-modal="true" aria-label="현대제철 CEO CL 회의 입장">
      <div className="modal-heading"><div className="modal-icon"><LockKeyhole size={22}/></div><button className="bare-icon" onClick={onClose} aria-label="닫기"><X size={20}/></button></div>
      <h2>현대제철 CEO–CL 미팅 입장</h2>
      <p className="modal-description">현장의 의견은 함께 나누고, CEO의 답변은 별도 인증을 통해 등록합니다.</p>
      <div className="entry-tabs" role="tablist" aria-label="입장 유형"><button role="tab" aria-selected={tab==='cl'} className={tab==='cl'?'selected':''} onClick={()=>{setTab('cl');setError('')}}><UsersRound size={16}/> CL 현장 참여</button><button role="tab" aria-selected={tab==='ceo'} className={tab==='ceo'?'selected':''} onClick={()=>{setTab('ceo');setError('')}}><ShieldCheck size={16}/> CEO 직접 답변</button></div>
      {tab==='cl'?<form className="auth-form" onSubmit={joinCL}>
        <label htmlFor="meeting-invite">회의 참여코드</label><input id="meeting-invite" autoComplete="off" autoCapitalize="characters" spellCheck="false" value={invite} onChange={e=>setInvite(e.target.value)} placeholder="현장 안내문 또는 초대 링크의 코드" required maxLength={80}/>
        <label htmlFor="meeting-display-name">표시 이름 (선택)</label><input id="meeting-display-name" maxLength={40} value={name} onChange={e=>setName(e.target.value)} placeholder="예: 당진 CL / 기본값: Change Leader"/>
        <p className="field-hint">입장 후 질문·공감·댓글을 실시간으로 사용할 수 있습니다. 질문은 익명 표시를 선택할 수 있지만 기록은 운영 정책에 따라 관리됩니다.</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="solid-button" type="submit" disabled={busy}>{busy?'참여 중…':'회의 참여하기'}<ArrowRight size={16}/></button>
      </form>:<div>
        {!verifiedEmail&&hostMethod==='on-site'?<form className="auth-form" onSubmit={claimOnSite}>
          <div className="onsite-notice"><ShieldCheck size={17}/><span><strong>현장 CEO 전용 · 1회용 기기 인증</strong><br/>운영자가 CEO에게 직접 전달한 코드를 CEO 본인이 입력해 주세요.</span></div>
          <label htmlFor="onsite-ceo-code">CEO 전용 인증코드</label><input id="onsite-ceo-code" type="password" autoComplete="off" required value={hostSecret} onChange={e=>setHostSecret(e.target.value)} placeholder="운영자로부터 직접 전달받은 코드"/>
          <p className="field-hint">인증된 이 기기에서 공식 CEO 답변을 작성할 수 있습니다. 로그아웃하거나 브라우저 데이터를 삭제하면 운영자의 재인증이 필요합니다.</p>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="solid-button" disabled={busy}>{busy?'CEO 권한 확인 중…':'CEO 전용으로 입장하기'}<ArrowRight size={16}/></button>
          <button type="button" className="auth-link" onClick={()=>{setError('');setHostMethod('email')}}>이메일 본인확인 방식으로 입장하기</button>
        </form>:verifiedEmail?<form className="auth-form" onSubmit={claimCEO}>
          <div className="auth-note verified-account"><MailCheck size={17}/><span>이메일 인증됨: {session.user.email}</span></div>
          <label htmlFor="host-code">CEO 전용 인증코드</label><input id="host-code" autoComplete="off" type="password" required value={hostSecret} onChange={e=>setHostSecret(e.target.value)} placeholder="CEO에게 별도로 전달된 코드"/>
          <p className="field-hint">이 코드는 최초 인증 시 한 번만 사용할 수 있습니다. CEO 답변은 공식 답변 배지로 구분되며 변경 기록은 서버에 보존됩니다.</p>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="solid-button" disabled={busy}>{busy?'인증 중…':'CEO 답변 권한 활성화'}<ArrowRight size={16}/></button>
        </form>:sent?<div className="login-sent"><CheckCircle2 size={38}/><h3>인증 메일을 보냈습니다.</h3><p>메일의 로그인 링크를 연 후 이 페이지에서 <strong>CEO 직접 답변</strong>을 선택하고 별도 인증코드를 입력해 주세요.</p><button className="outline-button" onClick={onClose}>확인</button></div>:<form className="auth-form" onSubmit={mailCEO}>
          <label htmlFor="host-email">CEO 이메일 본인확인</label><input id="host-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="CEO가 직접 확인할 수 있는 업무용 이메일"/>
          <p className="field-hint">이메일 인증 후, 행사 운영자가 CEO에게 별도로 전달한 1회용 코드를 입력하면 공식 답변 권한이 활성화됩니다.</p>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="solid-button" disabled={busy}>{busy?'메일 발송 중…':'이메일 인증 링크 받기'}<ArrowRight size={16}/></button>
          <button type="button" className="auth-link" onClick={()=>{setError('');setHostMethod('on-site')}}>현장 전용 기기 인증으로 돌아가기</button>
        </form>}
      </div>}
      <div className="auth-note"><ShieldCheck size={16}/><span>참가자코드와 CEO 인증코드는 서로 다릅니다. 공식 답변 권한은 DB에서 검증됩니다. CEO 전용 1회 코드는 운영자가 CEO에게 직접 전달해 주세요.</span></div>
    </div>
  </div>;
}
