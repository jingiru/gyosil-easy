import { useEffect, useState } from 'react';
import ClassroomMessageCard from '../components/ClassroomMessageCard.jsx';
import { BellIcon, ExpandIcon } from '../components/Icons.jsx';
import RoomSwitcher from '../components/RoomSwitcher.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom.js';

export default function ClassroomScreen({ room, onRoomChange }) {
  const realtime = useRealtimeRoom(room);
  const [respondent, setRespondent] = useState(
    () => window.localStorage.getItem(`gyosil-easy-respondent-${room}`) || '',
  );
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setRespondent(window.localStorage.getItem(`gyosil-easy-respondent-${room}`) || '');
  }, [room]);

  function notify(message, type) {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3500);
  }

  function updateRespondent(value) {
    setRespondent(value);
    window.localStorage.setItem(`gyosil-easy-respondent-${room}`, value);
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      notify('전체 화면을 시작하지 못했습니다.', 'error');
    }
  }

  return (
    <div className="classroom-shell">
      <header className="classroom-header">
        <a className="brand light" href="#/">
          <span className="brand-mark"><BellIcon size={24} /></span>
          <span><strong>교실이지</strong><small>교실 화면</small></span>
        </a>
        <div className="classroom-header-actions">
          <StatusPill connected={realtime.connected} server={realtime.activeServer} />
          <button className="fullscreen-button" type="button" onClick={enterFullscreen} aria-label="전체 화면">
            <ExpandIcon /> <span>전체 화면</span>
          </button>
        </div>
      </header>

      <main className="classroom-main">
        <div className="classroom-toolbar">
          <div>
            <p className="eyebrow">선생님과 바로 연결되는 화면</p>
            <h1>{realtime.active.length > 0 ? '새 메시지가 도착했어요' : '교실이지가 기다리고 있어요'}</h1>
          </div>
          <div className="classroom-settings">
            <div className="respondent-field">
              <label htmlFor="respondent">응답자 표시 <span>(선택)</span></label>
              <input id="respondent" value={respondent} onChange={(event) => updateRespondent(event.target.value)} maxLength={40} placeholder="예: 3학년 1반" />
            </div>
            <RoomSwitcher room={room} onChange={onRoomChange} compact />
          </div>
        </div>

        {realtime.error && <div className="alert error">{realtime.error}</div>}
        {!realtime.connected && !realtime.loading && (
          <div className="alert warning large">서버와 연결을 다시 시도하고 있어요. 잠시만 기다려 주세요.</div>
        )}

        {realtime.loading ? (
          <div className="classroom-empty"><div className="waiting-orbit"><span /></div><h2>선생님과 연결하고 있어요</h2></div>
        ) : realtime.active.length === 0 ? (
          <div className="classroom-empty">
            <div className="waiting-orbit"><span /></div>
            <h2>지금은 도착한 메시지가 없어요</h2>
            <p>선생님이 호출하거나 질문하면 이 화면에 바로 나타납니다.</p>
            <button className="text-button" type="button" onClick={realtime.refresh}>지금 새로 확인하기</button>
          </div>
        ) : (
          <div className="classroom-message-list">
            {realtime.active.map((item) => (
              <ClassroomMessageCard key={item.id} item={item} respondent={respondent} onNotice={notify} />
            ))}
          </div>
        )}
      </main>

      <footer className="classroom-footer">
        <span className={realtime.connected ? 'online' : ''} />
        {realtime.activeServer === 'backup'
          ? '백업 서버와 5초마다 동기화하고 있어요'
          : realtime.connected
            ? '선생님과 실시간으로 연결되어 있어요'
            : '연결을 확인하고 있어요'}
      </footer>
      {notice && <div className={`toast ${notice.type}`} role="status">{notice.message}</div>}
    </div>
  );
}
