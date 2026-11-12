// Local-only test double. Never contacts production data.
const room={id:'e5670c98-0000-4000-8000-e00000000001',slug:'ceo-cl-2026',title:'온라인 워크숍',is_open:true};
let liked=false;
const result=data=>({data,error:null});
export const supabase={
  auth:{getSession:async()=>result({session:{user:{id:'fixture-user'}}})},
  rpc:async()=>result({role:'participant'}),
  from(table){
    let operation='select';
    const read=()=>{
      if(table==='meeting_posts')return result([{id:'question-1',session_id:room.id,status:'open',kind:'question',title:'우리의 질문',content:'현장의 좋은 의견을 어떻게 반영할까요?',created_at:'2026-11-13T00:00:00.000Z',reaction_count:3+(liked?1:0)}]);
      if(table==='meeting_replies')return result([]);
      if(table==='meeting_reactions')return result(liked?[{post_id:'question-1'}]:[]);
      if(table==='meeting_sessions')return result(room);
      return result([]);
    };
    const query={
      select(){return query;},
      eq(){return query;},
      order(){return query;},
      limit(){return Promise.resolve(read());},
      single(){return Promise.resolve(read());},
      insert(){if(table==='meeting_reactions')liked=true;return Promise.resolve(result(null));},
      delete(){operation='delete';return query;},
      then(resolve,reject){if(table==='meeting_reactions'&&operation==='delete')liked=false;return Promise.resolve(result(null)).then(resolve,reject);}
    };
    return query;
  },
  channel(){return {on(){return this;},subscribe(callback){callback('SUBSCRIBED');return this;}};},
  removeChannel(){return Promise.resolve();}
};
