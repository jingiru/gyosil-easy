import { useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatTime } from '../lib/format.js';

export default function ClassroomMessageCard({ item, respondent, onNotice }) {
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);

  async function respond(value, kind) {
    if (!value.trim() || sending) return;
    setSending(true);
    try {
      await apiRequest(`/api/messages/${item.id}/responses`, {
        method: 'POST',
        body: JSON.stringify({ value, kind, respondent }),
      });
      setAnswer('');
      onNotice('선생님께 응답을 보냈어요.', 'success');
    } catch (error) {
      onNotice(error.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={`classroom-card ${item.type}`}>
      <div className="classroom-card-meta">
        <span>{item.type === 'call' ? '📣 선생님 호출' : '💬 선생님 질문'}</span>
        <time>{formatTime(item.createdAt)}</time>
      </div>
      {item.target && <h2>{item.target}</h2>}
      <p className="classroom-message">{item.message}</p>

      <div className="classroom-actions">
        {item.responseOptions.map((option) => (
          <button key={option} type="button" onClick={() => respond(option, 'preset')} disabled={sending}>
            {option}
          </button>
        ))}
      </div>

      {item.allowText && (
        <form
          className="direct-answer"
          onSubmit={(event) => {
            event.preventDefault();
            respond(answer, 'text');
          }}
        >
          <label htmlFor={`answer-${item.id}`}>다른 답변을 직접 입력해도 돼요</label>
          <div>
            <input
              id={`answer-${item.id}`}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={160}
              placeholder="답변 입력"
            />
            <button type="submit" disabled={!answer.trim() || sending}>
              보내기
            </button>
          </div>
        </form>
      )}
      {item.responses.length > 0 && (
        <p className="sent-count">이 화면에서 보낸 응답이 실시간으로 선생님께 전달됩니다.</p>
      )}
    </article>
  );
}
