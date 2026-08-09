export default function StatusPill({ connected, server = 'primary' }) {
  const usingBackup = connected && server === 'backup';
  return (
    <span className={`status-pill ${connected ? 'is-online' : 'is-offline'} ${usingBackup ? 'is-backup' : ''}`}>
      <span className="status-dot" />
      {usingBackup ? '백업 서버 연결됨' : connected ? '실시간 연결됨' : '연결 확인 중'}
    </span>
  );
}
