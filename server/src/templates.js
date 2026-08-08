export const templates = [
  {
    id: 'temperature',
    label: '교실 온도 확인',
    message: '교실 지금 덥니?',
    responseOptions: ['네, 더워요 🥵', '괜찮아요 🙂', '추워요 🥶'],
    allowText: true,
  },
  {
    id: 'ready',
    label: '수업 준비 확인',
    message: '수업 준비가 되었나요?',
    responseOptions: ['준비됐어요 ✅', '조금만 기다려 주세요 ⏳'],
    allowText: true,
  },
  {
    id: 'attendance',
    label: '교실 상황 확인',
    message: '지금 교실에 선생님이 계신가요?',
    responseOptions: ['네, 계세요 🙋', '아니요, 안 계세요'],
    allowText: true,
  },
];

export const defaultCallOptions = ['지금 갈게요 🙋', '친구에게 알려줄게요 📣', '잠시만 기다려 주세요 ⏳'];
