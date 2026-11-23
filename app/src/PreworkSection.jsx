import React, {useEffect, useRef} from 'react';
import {ChevronDown} from 'lucide-react';
import {PREWORK_DOCUMENT} from './prework-data.js';
import './prework-section.css';

function InlineText({text}) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={index}>{part}</React.Fragment>
  );
}

export default function PreworkSection({layoutReady = true}) {
  const sectionRef = useRef(null);
  const topicRefs = useRef(new Map());
  const {title, category, tags, sections} = PREWORK_DOCUMENT;

  useEffect(() => {
    const revealHash = () => {
      // Initial question loading changes the position of this lower section.
      if (!layoutReady) return;
      if (window.location.hash === '#prework-section') {
        sectionRef.current?.scrollIntoView({block: 'start', behavior: 'instant'});
        return;
      }
      const topic = sections.find(item => window.location.hash === `#prework-${item.id}`);
      const detail = topic && topicRefs.current.get(topic.id);
      if (!detail) return;
      detail.open = true;
      detail.scrollIntoView({block: 'start', behavior: 'instant'});
    };
    revealHash();
    window.addEventListener('hashchange', revealHash);
    return () => window.removeEventListener('hashchange', revealHash);
  }, [sections, layoutReady]);

  function openTopic(event, id) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const detail = topicRefs.current.get(id);
    if (!detail) return;
    detail.open = true;
    requestAnimationFrame(() => detail.querySelector('summary')?.focus({preventScroll: true}));
  }

  return <section className="prework-section" id="prework-section" aria-labelledby="prework-heading" ref={sectionRef}>
    <header className="prework-header">
      <div className="prework-labels"><span className="prework-category">{category}</span><span>{sections.length}개 주제</span></div>
      <h2 id="prework-heading">{title}</h2>
      <p>주제별 사전질문과 답변 부서의 현업검토의견을 확인하세요.</p>
      <ul className="prework-tags" aria-label="주제 태그">{tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
    </header>

    <div className="prework-grid">
      <div className="prework-overview">
        <table className="prework-table">
          <caption>주제별 답변 부서</caption>
          <colgroup><col className="prework-number-col"/><col/><col className="prework-department-col"/></colgroup>
          <thead><tr><th scope="col">구분</th><th scope="col">주제</th><th scope="col">답변 부서</th></tr></thead>
          <tbody>{sections.map(topic => <tr key={topic.id}>
            <td>{topic.number}</td>
            <th scope="row"><a href={`#prework-${topic.id}`} onClick={event => openTopic(event, topic.id)}>{topic.topic}</a></th>
            <td>{topic.department}</td>
          </tr>)}</tbody>
        </table>
        <p className="prework-overview-hint">주제를 선택하면 해당 질문과 검토의견이 펼쳐집니다.</p>
      </div>

      <div className="prework-topics">
        {sections.map((topic, index) => <details
          className="prework-topic"
          id={`prework-${topic.id}`}
          key={topic.id}
          open={index === 0}
          ref={node => {if (node) topicRefs.current.set(topic.id, node); else topicRefs.current.delete(topic.id);}}
        >
          <summary className="prework-summary">
            <h3>
              <span className="prework-topic-number">{topic.number}</span>
              <span className="prework-summary-copy">
                <span className="prework-topic-title">{topic.heading}</span>
                <span className="prework-department"><span>답변 부서</span> {topic.department}</span>
              </span>
              <span className="prework-disclosure" aria-hidden="true">
                <ChevronDown size={20}/>
                <span className="prework-when-closed">펼치기</span>
                <span className="prework-when-open">접기</span>
              </span>
            </h3>
          </summary>
          <div className="prework-topic-body">
            {topic.entries.map(entry => <section className="prework-entry" key={entry.id} aria-labelledby={`prework-${entry.id}-heading`}>
              <h4 id={`prework-${entry.id}-heading`}>{entry.heading}</h4>
              {entry.questions.length > 0 && <ul className="prework-question-list">{entry.questions.map((question, questionIndex) => <li key={questionIndex}><InlineText text={question}/></li>)}</ul>}
              <div className="prework-answer">
                <p className="prework-answer-label">현업검토의견</p>
                <ul className="prework-answer-list">{entry.answers.map((answer, answerIndex) => <li key={answerIndex}><InlineText text={answer}/></li>)}</ul>
              </div>
            </section>)}
          </div>
        </details>)}
      </div>
    </div>
  </section>;
}
