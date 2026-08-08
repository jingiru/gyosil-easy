import { formatTime } from '../lib/format.js';

export default function TeacherMessageCard({ item, onClose, closing }) {
  return (
    <article className={`active-card ${item.type}`}>
      <div className="active-card-topline">
        <span className="message-type">{item.type === 'call' ? '학생 호출' : '교실 질문'}</span>
        <time>{formatTime(item.createdAt)}</time>
      </div>
      {item.target && <h3>{item.target}</h3>}
      <p className="active-message">{item.message}</p>

      <div className="response-list">
        <div className="response-list-title">
          응답 <span>{item.responses.length}</span>
        </div>
        {item.responses.length === 0 ? (
          <p className="empty-response">아직 도착한 응답이 없습니다.</p>
        ) : (
          item.responses.map((response) => (
            <div className="response-row" key={response.id}>
              <span>{response.value}</span>
              <small>
                {response.respondent || '교실 화면'} · {formatTime(response.createdAt)}
              </small>
            </div>
          ))
        )}
      </div>

      <button className="button secondary full" type="button" onClick={() => onClose(item.id)} disabled={closing}>
        {closing ? '처리 중…' : '확인하고 종료'}
      </button>
    </article>
  );
}
