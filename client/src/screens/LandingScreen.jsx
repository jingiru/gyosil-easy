import { BellIcon, UsersIcon } from '../components/Icons.jsx';

export default function LandingScreen({ room }) {
  return (
    <main className="landing-shell">
      <div className="landing-brand">
        <span className="brand-mark large"><BellIcon size={34} /></span>
        <p>교실 운영을 좀 더 쉽게</p>
        <h1>교실이지</h1>
        <span>방송실 서버와 교실을 실시간으로 연결합니다.</span>
      </div>
      <div className="role-grid">
        <a className="role-card teacher" href={`#/teacher?room=${encodeURIComponent(room)}`}>
          <span className="role-icon"><BellIcon size={32} /></span>
          <span><small>휴대폰에서 사용</small><strong>교사용 화면</strong><p>학생 호출과 질문을 보내고 응답을 확인합니다.</p></span>
          <b>열기 →</b>
        </a>
        <a className="role-card classroom" href={`#/classroom?room=${encodeURIComponent(room)}`}>
          <span className="role-icon"><UsersIcon size={34} /></span>
          <span><small>Raspberry Pi에서 사용</small><strong>교실용 화면</strong><p>호출을 확인하고 버튼이나 글로 응답합니다.</p></span>
          <b>열기 →</b>
        </a>
      </div>
      <p className="landing-room">현재 기본 교실 코드 <strong>{room}</strong></p>
    </main>
  );
}
