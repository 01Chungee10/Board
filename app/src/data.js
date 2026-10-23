export const MEETING_SLUG = import.meta.env.VITE_MEETING_SLUG || 'ceo-cl-2026';

export const CATEGORIES = [
  { id: 'all', label: '전체 이야기' },
  { id: 'question', label: 'CEO에게 질문' },
  { id: 'idea', label: '변화 제안' },
  { id: 'voice', label: '현장의 목소리' },
];

export const CATEGORY_LABELS = {
  question: 'CEO에게 질문', idea: '변화 제안', voice: '현장의 목소리',
};

const age = m => new Date(Date.now() - m * 60_000).toISOString();

/** All preview items are explicitly fictional and never synced to the database. */
export function createPreviewData() {
  return [
    {id:'demo-01',kind:'question',author_name:'익명 CL',is_anonymous:true, title:'현장의 작은 제안이 실제 변화로 이어지려면 무엇이 필요할까요?', content:'회의에서 나온 좋은 의견이 실행까지 연결될 수 있도록 제안 이후의 진행 과정도 함께 공유되면 좋겠습니다. 어떤 방식이 효과적일까요?',created_at:age(3),status:'open', reaction_count:18, reacted:false, author_id:'preview-1', replies:[{id:'demo-reply-1',body:'의견 접수부터 검토, 실행 여부까지 과정이 보이는 것이 중요합니다. 이후 진행 단계도 공유하는 방식으로 설계해 보겠습니다. (화면 예시용 문구)',author_role:'ceo',author_name:'CEO 답변 예시', created_at:age(1)}]},
    {id:'demo-02',kind:'voice',author_name:'익명 CL',is_anonymous:true,title:'서로 다른 사업장 사이의 협업 경험을 더 쉽게 나누고 싶습니다',content:'작은 개선 경험이라도 다른 사업장과 공유할 수 있는 통로가 있으면 좋겠습니다. 우수 사례뿐 아니라 시도 과정에서 배운 점도 함께 나누고 싶습니다.',created_at:age(8),status:'open',reaction_count:12,reacted:false,author_id:'preview-2',replies:[]},
    {id:'demo-03',kind:'idea',author_name:'Change Leader',is_anonymous:false,title:'업무에서 바로 적용할 수 있는 변화 과제를 함께 발굴해요',content:'거창한 혁신보다 한 주 안에 실천할 수 있는 작은 변화부터 시작해 보는 것은 어떨까요? 부담 없이 시도하고 결과를 공유하는 문화가 필요합니다.',created_at:age(26),status:'open',reaction_count:9,reacted:false,author_id:'preview-3',replies:[]},
  ];
}
