export function relativeTime(input, now = Date.now()) {
  const diff = Math.max(0, now - new Date(input).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  if (mins < 1440) return `${Math.floor(mins / 60)}시간 전`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}일 전`;
  return new Date(input).toLocaleDateString('ko-KR');
}

export function displayName(post) {
  return post?.is_anonymous ? '익명 CL' : (post?.author_name?.trim() || 'Change Leader');
}

export function applyFilters(posts, {category = 'all', sort='latest', search='', view='all'} = {}) {
  const term = search.trim().toLocaleLowerCase('ko-KR');
  const filtered = posts.filter(post => {
    if (category !== 'all' && post.kind !== category) return false;
    if (view === 'answered' && !(post.replies||[]).some(reply => reply.author_role === 'ceo')) return false;
    if (view === 'unanswered' && (post.replies||[]).some(reply => reply.author_role === 'ceo')) return false;
    if (term && ![post.title, post.content, displayName(post)].some(v => (v||'').toLocaleLowerCase('ko-KR').includes(term))) return false;
    return post.status !== 'hidden';
  });
  return [...filtered].sort((a,b) => sort === 'popular'
    ? (b.reaction_count||0) - (a.reaction_count||0) || new Date(b.created_at) - new Date(a.created_at)
    : new Date(b.created_at) - new Date(a.created_at));
}

export function isStaff(role) {return role === 'ceo' || role === 'moderator';}
export function replyBadge(role) {return role === 'ceo' ? 'CEO 답변' : role === 'moderator' ? '운영진' : 'CL 의견';}
export function validPost(title,content) {return title.trim().length >= 4 && title.trim().length <= 120 && content.trim().length >= 10 && content.trim().length <= 3000;}
