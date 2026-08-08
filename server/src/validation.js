const ROOM_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRoom(value, fallback = 'classroom-1') {
  const room = String(value ?? fallback).trim();
  if (!ROOM_PATTERN.test(room)) {
    throw new ValidationError('교실 코드는 영문, 숫자, -, _만 사용해 40자 이내로 입력해 주세요.');
  }
  return room;
}

export function cleanText(value, fieldName, maxLength, { required = true } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) {
    throw new ValidationError(`${fieldName}을(를) 입력해 주세요.`);
  }
  if (text.length > maxLength) {
    throw new ValidationError(`${fieldName}은(는) ${maxLength}자 이하여야 합니다.`);
  }
  return text;
}

export function validateMessageInput(input, defaultRoom) {
  const type = input?.type;
  if (!['call', 'question'].includes(type)) {
    throw new ValidationError('메시지 유형은 call 또는 question이어야 합니다.');
  }

  const responseOptions = Array.isArray(input.responseOptions)
    ? [...new Set(input.responseOptions.map((item) => cleanText(item, '응답 버튼', 40)))]
    : [];
  if (responseOptions.length > 6) {
    throw new ValidationError('응답 버튼은 최대 6개까지 만들 수 있습니다.');
  }

  const allowText = Boolean(input.allowText);
  if (type === 'question' && responseOptions.length === 0 && !allowText) {
    throw new ValidationError('응답 버튼을 하나 이상 만들거나 직접 입력을 허용해 주세요.');
  }

  return {
    room: validateRoom(input.room, defaultRoom),
    type,
    target: cleanText(input.target, '학생 이름', 40, { required: type === 'call' }),
    message: cleanText(input.message, '메시지', 240),
    responseOptions,
    allowText,
  };
}

export function validateResponseInput(input) {
  const kind = input?.kind === 'text' ? 'text' : 'preset';
  return {
    value: cleanText(input?.value, '응답', 160),
    kind,
    respondent: cleanText(input?.respondent, '응답자', 40, { required: false }),
  };
}
