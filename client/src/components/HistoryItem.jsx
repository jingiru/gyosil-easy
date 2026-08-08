import { formatDateTime } from '../lib/format.js';

export default function HistoryItem({ item }) {
  const latest = item.responses.at(-1);
  return (
    <article className="history-item">
      <div className={`history-icon ${item.type}`} aria-hidden="true">
        {item.type === 'call' ? '호출' : '질문'}
      </div>
      <div className="history-copy">
        <div className="history-heading">
          <strong>{item.target || item.message}</strong>
          <time>{formatDateTime(item.createdAt)}</time>
        </div>
        {item.target && <p>{item.message}</p>}
        <span className="history-response">
          {latest
            ? `최근 응답: ${latest.value}${item.responses.length > 1 ? ` 외 ${item.responses.length - 1}건` : ''}`
            : item.status === 'active'
              ? '응답 대기 중'
              : '응답 없이 종료'}
        </span>
      </div>
    </article>
  );
}
