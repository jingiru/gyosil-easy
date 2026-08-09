import { useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom.js';
import { BellIcon, MessageIcon } from '../components/Icons.jsx';
import HistoryItem from '../components/HistoryItem.jsx';
import RoomSwitcher from '../components/RoomSwitcher.jsx';
import StatusPill from '../components/StatusPill.jsx';
import TeacherMessageCard from '../components/TeacherMessageCard.jsx';

function OptionEditor({ options, onChange }) {
  function update(index, value) {
    onChange(options.map((option, optionIndex) => (index === optionIndex ? value : option)));
  }

  return (
    <div className="option-editor">
      <div className="field-heading">
        <label>학생 응답 버튼</label>
        <span>최대 6개</span>
      </div>
      {options.map((option, index) => (
        <div className="option-row" key={`${index}-${options.length}`}>
          <input
            aria-label={`응답 버튼 ${index + 1}`}
            value={option}
            maxLength={40}
            onChange={(event) => update(index, event.target.value)}
          />
          <button
            className="icon-button"
            type="button"
            aria-label={`${option || index + 1} 삭제`}
            onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {options.length < 6 && (
        <button className="add-option" type="button" onClick={() => onChange([...options, ''])}>
          + 응답 버튼 추가
        </button>
      )}
    </div>
  );
}

export default function TeacherScreen({ config, room, onRoomChange }) {
  const realtime = useRealtimeRoom(room);
  const [tab, setTab] = useState('call');
  const [student, setStudent] = useState('');
  const [place, setPlace] = useState('교무실');
  const [callOptions, setCallOptions] = useState(config.defaultCallOptions);
  const [question, setQuestion] = useState(config.templates[0]?.message || '');
  const [questionOptions, setQuestionOptions] = useState(
    config.templates[0]?.responseOptions || [],
  );
  const [allowText, setAllowText] = useState(config.templates[0]?.allowText ?? true);
  const [teacherPin, setTeacherPin] = useState(
    () => window.localStorage.getItem('gyosil-easy-teacher-pin') || '',
  );
  const [sending, setSending] = useState(false);
  const [closingId, setClosingId] = useState('');
  const [notice, setNotice] = useState(null);

  const closedHistory = useMemo(
    () => realtime.history.filter((item) => item.status === 'closed').slice(0, 30),
    [realtime.history],
  );

  function notify(message, type = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3500);
  }

  function savePin(value) {
    setTeacherPin(value);
    window.localStorage.setItem('gyosil-easy-teacher-pin', value);
  }

  async function sendMessage(payload) {
    setSending(true);
    try {
      await apiRequest('/api/messages', {
        method: 'POST',
        teacherPin,
        body: JSON.stringify({ room, ...payload }),
      });
      notify(payload.type === 'call' ? '학생 호출을 보냈습니다.' : '교실에 질문을 보냈습니다.');
      if (payload.type === 'call') setStudent('');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSending(false);
    }
  }

  async function closeMessage(id) {
    setClosingId(id);
    try {
      await apiRequest(`/api/messages/${id}/close`, {
        method: 'POST',
        teacherPin,
      });
      notify('메시지를 기록으로 이동했습니다.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setClosingId('');
    }
  }

  function applyTemplate(template) {
    setQuestion(template.message);
    setQuestionOptions(template.responseOptions);
    setAllowText(template.allowText);
  }

  return (
    <div className="app-shell teacher-shell">
      <header className="teacher-header">
        <a className="brand" href="#/">
          <span className="brand-mark"><BellIcon size={22} /></span>
          <span><strong>교실이지</strong><small>교사용</small></span>
        </a>
        <StatusPill connected={realtime.connected} server={realtime.activeServer} />
      </header>

      <main className="teacher-main">
        <section className="teacher-intro">
          <div>
            <p className="eyebrow">오늘도 반가워요 👋</p>
            <h1>교실에 무엇을 전할까요?</h1>
          </div>
          <RoomSwitcher room={room} onChange={onRoomChange} compact />
        </section>

        {realtime.error && <div className="alert error">{realtime.error}</div>}
        {!realtime.connected && !realtime.loading && (
          <div className="alert warning">서버 연결을 다시 시도하고 있습니다. 학교 Wi-Fi와 서버 PC를 확인해 주세요.</div>
        )}

        <div className="teacher-grid">
          <section className="compose-panel panel">
            <div className="compose-tabs" role="tablist" aria-label="메시지 유형">
              <button className={tab === 'call' ? 'active' : ''} type="button" onClick={() => setTab('call')}>
                <BellIcon size={20} /> 학생 호출
              </button>
              <button className={tab === 'question' ? 'active' : ''} type="button" onClick={() => setTab('question')}>
                <MessageIcon size={20} /> 교실 질문
              </button>
            </div>

            {tab === 'call' ? (
              <form
                className="compose-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage({
                    type: 'call',
                    target: student,
                    message: `${student}, ${place}로 오렴.`,
                    responseOptions: callOptions.filter((option) => option.trim()),
                    allowText: true,
                  });
                }}
              >
                <div className="field">
                  <label htmlFor="student-name">부를 학생</label>
                  <input id="student-name" value={student} onChange={(event) => setStudent(event.target.value)} maxLength={40} placeholder="예: 김민수" required />
                </div>
                <div className="field">
                  <label htmlFor="call-place">오도록 할 장소</label>
                  <input id="call-place" value={place} onChange={(event) => setPlace(event.target.value)} maxLength={60} list="place-list" required />
                  <datalist id="place-list">
                    <option value="교무실" /><option value="방송실" /><option value="상담실" /><option value="보건실" />
                  </datalist>
                </div>
                <div className="message-preview"><span>화면에 이렇게 보여요</span><strong>{student ? `${student}, ${place}로 오렴.` : '학생 이름을 입력해 주세요.'}</strong></div>
                <OptionEditor options={callOptions} onChange={setCallOptions} />
                <button className="button primary full" type="submit" disabled={sending || !student.trim()}>{sending ? '보내는 중…' : '교실로 호출 보내기'}</button>
              </form>
            ) : (
              <form
                className="compose-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage({
                    type: 'question',
                    target: '',
                    message: question,
                    responseOptions: questionOptions.filter((option) => option.trim()),
                    allowText,
                  });
                }}
              >
                <div className="template-block">
                  <label>빠른 질문</label>
                  <div className="template-buttons">
                    {config.templates.map((template) => <button type="button" key={template.id} onClick={() => applyTemplate(template)}>{template.label}</button>)}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="question">질문 내용</label>
                  <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} rows={3} placeholder="교실에 물어볼 내용을 입력하세요." required />
                </div>
                <OptionEditor options={questionOptions} onChange={setQuestionOptions} />
                <label className="check-row"><input type="checkbox" checked={allowText} onChange={(event) => setAllowText(event.target.checked)} /><span>학생이 직접 답변을 입력할 수 있게 하기</span></label>
                <button className="button primary full" type="submit" disabled={sending || !question.trim() || (!allowText && questionOptions.every((option) => !option.trim()))}>{sending ? '보내는 중…' : '교실로 질문 보내기'}</button>
              </form>
            )}

            {config.teacherPinRequired && (
              <div className="pin-field">
                <label htmlFor="teacher-pin">교사 PIN</label>
                <input id="teacher-pin" type="password" inputMode="numeric" autoComplete="current-password" value={teacherPin} onChange={(event) => savePin(event.target.value)} placeholder="서버에 설정한 PIN" />
              </div>
            )}
          </section>

          <section className="live-panel">
            <div className="section-title">
              <div><span className="live-dot" /><h2>진행 중</h2><span className="count-badge">{realtime.active.length}</span></div>
              <button type="button" className="text-button" onClick={realtime.refresh}>새로 확인</button>
            </div>
            {realtime.loading ? <div className="empty-card">교실 상태를 불러오고 있어요…</div> : realtime.active.length === 0 ? <div className="empty-card"><span>✓</span><strong>진행 중인 메시지가 없습니다.</strong><p>새 호출이나 질문을 보내면 여기에 표시됩니다.</p></div> : <div className="active-list">{realtime.active.map((item) => <TeacherMessageCard key={item.id} item={item} onClose={closeMessage} closing={closingId === item.id} />)}</div>}
          </section>
        </div>

        <section className="history-section">
          <div className="section-title"><div><h2>지난 기록</h2><span className="count-badge muted">{closedHistory.length}</span></div></div>
          <div className="history-list">{closedHistory.length ? closedHistory.map((item) => <HistoryItem key={item.id} item={item} />) : <p className="history-empty">종료된 호출과 질문이 이곳에 보관됩니다.</p>}</div>
        </section>
      </main>

      {notice && <div className={`toast ${notice.type}`} role="status">{notice.message}</div>}
    </div>
  );
}
