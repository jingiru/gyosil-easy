export default function StatusPill({ connected }) {
  return (
    <span className={`status-pill ${connected ? 'is-online' : 'is-offline'}`}>
      <span className="status-dot" />
      {connected ? '실시간 연결됨' : '연결 확인 중'}
    </span>
  );
}
