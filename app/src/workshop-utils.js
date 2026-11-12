/** One field drives the full question and a short, database-required title. */
export function isValidQuestion(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const characters = Array.from(text).length;
  return characters >= 4 && characters <= 3000;
}

export function makeQuestionTitle(value) {
  return Array.from(String(value||'').trim().replace(/\s+/g,' ')).slice(0,120).join('');
}

export function attachReplies(posts,replies) {
  const grouped = new Map();
  for(const reply of replies){
    if(!grouped.has(reply.post_id))grouped.set(reply.post_id,[]);
    grouped.get(reply.post_id).push(reply);
  }
  return posts.map(post=>({...post,replies:grouped.get(post.id)||[]}));
}

/** Meeting RLS returns only this browser's reactions; totals are already aggregated on posts. */
export function attachReactions(posts,ownReactions) {
  const mine=new Set((ownReactions||[]).map(row=>row.post_id));
  return posts.map(post=>({
    ...post,
    reaction_count:Number.isSafeInteger(post.reaction_count)&&post.reaction_count>=0?post.reaction_count:0,
    reacted:mine.has(post.id)
  }));
}
