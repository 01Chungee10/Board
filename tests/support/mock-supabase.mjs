// Local-only fixtures, resolved solely by tests/mock-vite.config.mjs.
// This module never connects to Supabase or any other network service.
const room={id:'e5670c98-0000-4000-8000-e00000000001',slug:'ceo-cl-2026',title:'온라인 워크숍',is_open:true};
const result=data=>({data,error:null});
const question=(id,date,count,content)=>({id,session_id:room.id,status:'open',kind:'question',is_anonymous:true,author_name:null,title:content.slice(0,120),content,created_at:date,reaction_count:count});
const longQuestion=Array.from({length:18},(_,i)=>`${i+1}. 현장의 다양한 의견을 듣고 실행한 결과를 구성원에게 공유할 수 있을까요? 여러 부서가 함께 협력할 때 필요한 지원과 구체적인 실행 계획을 자세히 알고 싶습니다.`).join('\n')+'\n상세 보기 끝 확인 문장';
const longAnswer=Array.from({length:12},(_,i)=>`${i+1}. 질문에 대한 CEO 공식 답변입니다. 의견을 검토하고 진행 상황과 실행 결과를 지속적으로 공유하겠습니다.`).join('\n')+'\n공식 답변 끝 확인 문장';
const posts=[
  question('question-1','2026-11-16T06:00:00.000Z',3,'현장의 좋은 의견을 어떻게 반영할까요?'),
  question('question-2','2026-11-16T05:00:00.000Z',9,'부서 사이의 협업을 더욱 원활하게 만드는 방안이 궁금합니다.'),
  question('question-3','2026-11-16T04:00:00.000Z',9,'배움과 성장 기회를 더 넓히기 위한 계획이 있나요?'),
  question('question-4','2026-11-16T03:00:00.000Z',1,longQuestion),
  question('question-5','2026-11-16T02:00:00.000Z',5,'안전한 작업 환경을 만들기 위한 제안을 어떻게 전달할까요?'),
  question('question-6','2026-11-16T01:00:00.000Z',0,'짧은 질문도 자유롭게 남길 수 있을까요?')
];
const replies=[{id:'reply-1',post_id:'question-4',session_id:room.id,content:longAnswer,created_at:'2026-11-16T03:30:00.000Z',author_role:'ceo'}];
const liked=new Set();
const listeners=new Set();
const inspection={requests:[],mutations:[],longQuestion,longAnswer};
if(typeof window!=='undefined')window.__workshopFixture=inspection;

function compare(a,b,orders){
  for(const {column,ascending} of orders){
    if(a[column]===b[column])continue;
    return (a[column]>b[column]?1:-1)*(ascending?1:-1);
  }
  return 0;
}
function notifyChange(table){
  for(const listener of listeners)if(listener.table===table)listener.callback();
}
export const supabase={
  auth:{
    getSession:async()=>result({session:{user:{id:'fixture-user'}}}),
    signInAnonymously:async()=>result({session:{user:{id:'fixture-user'}}})
  },
  rpc:async name=>result({role:name==='claim_ceo_cl_on_site'?'ceo':'participant'}),
  from(table){
    let operation='select',payload,maximum=Infinity,start=0,single=false,execution;
    const filters=[],orders=[];
    const matches=row=>filters.every(filter=>filter(row));
    const read=()=>{
      const source=table==='meeting_posts'?posts:table==='meeting_replies'?replies:table==='meeting_sessions'?[room]:table==='meeting_reactions'?[...liked].map(post_id=>({post_id,session_id:room.id})):[];
      const rows=source.filter(matches).map(row=>({...row})).sort((a,b)=>compare(a,b,orders)).slice(start,start+maximum);
      return result(single?(rows[0]??null):rows);
    };
    const execute=()=>{
      if(execution)return execution;
      execution=Promise.resolve().then(()=>{
        inspection.requests.push({table,operation,orders:orders.map(item=>({...item})),limit:maximum});
        if(operation==='insert'){
          for(const row of Array.isArray(payload)?payload:[payload]){
            if(table==='meeting_reactions'&&!liked.has(row.post_id)){
              liked.add(row.post_id);
              const post=posts.find(item=>item.id===row.post_id);
              if(post)post.reaction_count++;
            }else if(table==='meeting_replies'){
              replies.push({id:'reply-'+(replies.length+1),created_at:new Date().toISOString(),author_role:'ceo',...row});
            }else if(table==='meeting_posts'){
              posts.push({id:'question-'+(posts.length+1),created_at:new Date().toISOString(),reaction_count:0,status:'open',...row});
            }
            inspection.mutations.push({table,operation,post_id:row.post_id});
          }
          notifyChange(table);
          return result(null);
        }
        if(operation==='delete'&&table==='meeting_reactions'){
          for(const post_id of [...liked]){
            if(!matches({post_id,session_id:room.id}))continue;
            liked.delete(post_id);
            const post=posts.find(item=>item.id===post_id);
            if(post)post.reaction_count=Math.max(0,post.reaction_count-1);
            inspection.mutations.push({table,operation,post_id});
          }
          notifyChange(table);
          return result(null);
        }
        return read();
      });
      return execution;
    };
    const query={
      select(){return query;},
      eq(column,value){filters.push(row=>row[column]===value);return query;},
      in(column,values){filters.push(row=>values.includes(row[column]));return query;},
      order(column,{ascending=true}={}){orders.push({column,ascending});return query;},
      limit(value){maximum=value;return query;},
      range(from,to){start=from;maximum=to-from+1;return query;},
      single(){single=true;return query;},
      maybeSingle(){single=true;return query;},
      insert(value){operation='insert';payload=value;return query;},
      delete(){operation='delete';return query;},
      then(resolve,reject){return execute().then(resolve,reject);}
    };
    return query;
  },
  channel(){
    const owned=[];
    return {
      on(_event,filter,callback){const listener={table:filter.table,callback};owned.push(listener);listeners.add(listener);return this;},
      subscribe(callback){callback('SUBSCRIBED');return this;},
      unsubscribe(){for(const listener of owned)listeners.delete(listener);}
    };
  },
  removeChannel(channel){channel.unsubscribe();return Promise.resolve();}
};
