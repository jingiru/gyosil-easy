var MESSAGE_SHEET = 'Backup_Messages';
var RESPONSE_SHEET = 'Backup_Responses';
var MESSAGE_HEADERS = [
  'id',
  'room',
  'type',
  'target',
  'message',
  'response_options',
  'allow_text',
  'status',
  'created_at',
  'closed_at'
];
var RESPONSE_HEADERS = [
  'id',
  'message_id',
  'kind',
  'value',
  'respondent',
  'created_at'
];

var TEMPLATES = [
  {
    id: 'temperature',
    label: '교실 온도 확인',
    message: '교실 지금 덥니?',
    responseOptions: ['네, 더워요 🥵', '괜찮아요 🙂', '추워요 🥶'],
    allowText: true
  },
  {
    id: 'ready',
    label: '수업 준비 확인',
    message: '수업 준비가 되었나요?',
    responseOptions: ['준비됐어요 ✅', '조금만 기다려 주세요 ⏳'],
    allowText: true
  },
  {
    id: 'attendance',
    label: '교실 상황 확인',
    message: '지금 교실에 선생님이 계신가요?',
    responseOptions: ['네, 계세요 🙋', '아니요, 안 계세요'],
    allowText: true
  }
];

var DEFAULT_CALL_OPTIONS = [
  '지금 갈게요 🙋',
  '친구에게 알려줄게요 📣',
  '잠시만 기다려 주세요 ⏳'
];

function doGet(event) {
  var parameters = event && event.parameter ? event.parameter : {};
  var request = {
    method: String(parameters.method || 'GET').toUpperCase(),
    path: parameters.path || '/api/health',
    query: copyWithout_(parameters, ['method', 'path']),
    body: null,
    teacherPin: ''
  };
  return respond_(request);
}

function doPost(event) {
  try {
    var contents = event && event.postData ? event.postData.contents : '';
    var payload = JSON.parse(contents || '{}');
    return respond_({
      method: String(payload.method || 'POST').toUpperCase(),
      path: payload.path || '',
      query: payload.query || {},
      body: payload.body || {},
      teacherPin: String(payload.teacherPin || '')
    });
  } catch (error) {
    return json_({ ok: false, status: 400, error: '요청 JSON을 읽을 수 없습니다.' });
  }
}

function respond_(request) {
  try {
    var result = route_(request);
    return json_({ ok: true, status: result.status, data: result.data });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({
      ok: false,
      status: Number(error.status) || 500,
      error: Number(error.status) ? error.message : '백업 서버에서 요청을 처리하지 못했습니다.'
    });
  }
}

function route_(request) {
  var method = request.method;
  var path = request.path;

  if (method === 'GET' && path === '/api/health') {
    var spreadsheet = getSpreadsheet_();
    ensureSheets_(spreadsheet);
    return success_(200, {
      ok: true,
      service: 'gyosil-easy-backup',
      serverTime: new Date().toISOString()
    });
  }

  if (method === 'GET' && path === '/api/config') {
    var configSpreadsheet = getSpreadsheet_();
    ensureSheets_(configSpreadsheet);
    return success_(200, {
      defaultRoom: setting_('DEFAULT_ROOM', 'classroom-1'),
      teacherPinRequired: Boolean(setting_('TEACHER_PIN', '')),
      templates: TEMPLATES,
      defaultCallOptions: DEFAULT_CALL_OPTIONS
    });
  }

  if (method === 'GET' && path === '/api/state') {
    return success_(200, getState_(validateRoom_(request.query.room)));
  }

  if (method === 'POST' && path === '/api/messages') {
    requireTeacherPin_(request.teacherPin);
    return success_(201, withLock_(function () {
      return createMessage_(validateMessage_(request.body));
    }));
  }

  var responseMatch = path.match(/^\/api\/messages\/([^/]+)\/responses$/);
  if (method === 'POST' && responseMatch) {
    return success_(201, withLock_(function () {
      return createResponse_(decodeURIComponent(responseMatch[1]), validateResponse_(request.body));
    }));
  }

  var closeMatch = path.match(/^\/api\/messages\/([^/]+)\/close$/);
  if (method === 'POST' && closeMatch) {
    requireTeacherPin_(request.teacherPin);
    return success_(200, withLock_(function () {
      return closeMessage_(decodeURIComponent(closeMatch[1]));
    }));
  }

  throw apiError_(404, '요청한 주소를 찾을 수 없습니다.');
}

function getState_(room) {
  var spreadsheet = getSpreadsheet_();
  ensureSheets_(spreadsheet);
  var responsesByMessage = responseMap_(spreadsheet);
  var messages = readObjects_(spreadsheet.getSheetByName(MESSAGE_SHEET), MESSAGE_HEADERS)
    .filter(function (row) { return String(row.room) === room; })
    .map(function (row) { return messageFromRow_(row, responsesByMessage[row.id] || []); })
    .sort(function (left, right) { return right.createdAt.localeCompare(left.createdAt); });
  var historyLimit = positiveInteger_(setting_('HISTORY_LIMIT', '100'), 100);

  return {
    room: room,
    active: messages.filter(function (message) { return message.status === 'active'; }),
    history: messages.slice(0, historyLimit)
  };
}

function createMessage_(input) {
  var spreadsheet = getSpreadsheet_();
  ensureSheets_(spreadsheet);
  var createdAt = new Date().toISOString();
  var row = {
    id: Utilities.getUuid(),
    room: input.room,
    type: input.type,
    target: input.target,
    message: input.message,
    response_options: JSON.stringify(input.responseOptions),
    allow_text: input.allowText,
    status: 'active',
    created_at: createdAt,
    closed_at: ''
  };
  appendObject_(spreadsheet.getSheetByName(MESSAGE_SHEET), MESSAGE_HEADERS, row);
  return messageFromRow_(row, []);
}

function createResponse_(messageId, input) {
  var spreadsheet = getSpreadsheet_();
  ensureSheets_(spreadsheet);
  var record = findMessage_(spreadsheet, messageId);
  if (!record) throw apiError_(404, '메시지를 찾을 수 없습니다.');

  var message = messageFromRow_(record.row, responseMap_(spreadsheet)[messageId] || []);
  if (message.status !== 'active') throw apiError_(409, '이미 종료된 메시지입니다.');
  if (input.kind === 'preset' && message.responseOptions.indexOf(input.value) === -1) {
    throw apiError_(400, '등록되지 않은 응답 버튼입니다.');
  }
  if (input.kind === 'text' && !message.allowText) {
    throw apiError_(400, '이 메시지는 직접 답변을 받지 않습니다.');
  }

  var responseRow = {
    id: Utilities.getUuid(),
    message_id: messageId,
    kind: input.kind,
    value: input.value,
    respondent: input.respondent,
    created_at: new Date().toISOString()
  };
  appendObject_(spreadsheet.getSheetByName(RESPONSE_SHEET), RESPONSE_HEADERS, responseRow);
  var response = responseFromRow_(responseRow);
  message.responses.push(response);
  return { response: response, message: message };
}

function closeMessage_(messageId) {
  var spreadsheet = getSpreadsheet_();
  ensureSheets_(spreadsheet);
  var record = findMessage_(spreadsheet, messageId);
  if (!record) throw apiError_(404, '메시지를 찾을 수 없습니다.');

  if (String(record.row.status) === 'active') {
    var closedAt = new Date().toISOString();
    var statusColumn = MESSAGE_HEADERS.indexOf('status') + 1;
    var closedAtColumn = MESSAGE_HEADERS.indexOf('closed_at') + 1;
    record.sheet.getRange(record.rowNumber, statusColumn).setValue('closed');
    record.sheet.getRange(record.rowNumber, closedAtColumn).setValue(closedAt);
    record.row.status = 'closed';
    record.row.closed_at = closedAt;
  }

  return messageFromRow_(record.row, responseMap_(spreadsheet)[messageId] || []);
}

function findMessage_(spreadsheet, messageId) {
  var sheet = spreadsheet.getSheetByName(MESSAGE_SHEET);
  var rows = readObjects_(sheet, MESSAGE_HEADERS);
  for (var index = 0; index < rows.length; index += 1) {
    if (String(rows[index].id) === messageId) {
      return { sheet: sheet, rowNumber: index + 2, row: rows[index] };
    }
  }
  return null;
}

function responseMap_(spreadsheet) {
  return readObjects_(spreadsheet.getSheetByName(RESPONSE_SHEET), RESPONSE_HEADERS)
    .reduce(function (result, row) {
      var messageId = String(row.message_id);
      if (!result[messageId]) result[messageId] = [];
      result[messageId].push(responseFromRow_(row));
      result[messageId].sort(function (left, right) {
        return left.createdAt.localeCompare(right.createdAt);
      });
      return result;
    }, {});
}

function messageFromRow_(row, responses) {
  var options = [];
  try {
    options = JSON.parse(String(row.response_options || '[]'));
  } catch (error) {
    options = [];
  }
  return {
    id: String(row.id),
    room: String(row.room),
    type: String(row.type),
    target: String(row.target || ''),
    message: String(row.message),
    responseOptions: Array.isArray(options) ? options : [],
    allowText: row.allow_text === true || String(row.allow_text).toLowerCase() === 'true',
    status: String(row.status),
    createdAt: String(row.created_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    responses: responses
  };
}

function responseFromRow_(row) {
  return {
    id: String(row.id),
    messageId: String(row.message_id),
    kind: String(row.kind),
    value: String(row.value),
    respondent: String(row.respondent || ''),
    createdAt: String(row.created_at)
  };
}

function validateMessage_(input) {
  input = input || {};
  if (['call', 'question'].indexOf(input.type) === -1) {
    throw apiError_(400, '메시지 유형은 call 또는 question이어야 합니다.');
  }
  var responseOptions = Array.isArray(input.responseOptions) ? input.responseOptions : [];
  responseOptions = responseOptions.map(function (value) {
    return cleanText_(value, '응답 버튼', 40, true);
  }).filter(function (value, index, items) {
    return items.indexOf(value) === index;
  });
  if (responseOptions.length > 6) throw apiError_(400, '응답 버튼은 최대 6개까지 만들 수 있습니다.');

  var allowText = Boolean(input.allowText);
  if (input.type === 'question' && responseOptions.length === 0 && !allowText) {
    throw apiError_(400, '응답 버튼을 하나 이상 만들거나 직접 입력을 허용해 주세요.');
  }
  return {
    room: validateRoom_(input.room),
    type: input.type,
    target: cleanText_(input.target, '학생 이름', 40, input.type === 'call'),
    message: cleanText_(input.message, '메시지', 240, true),
    responseOptions: responseOptions,
    allowText: allowText
  };
}

function validateResponse_(input) {
  input = input || {};
  return {
    kind: input.kind === 'text' ? 'text' : 'preset',
    value: cleanText_(input.value, '응답', 160, true),
    respondent: cleanText_(input.respondent, '응답자', 40, false)
  };
}

function validateRoom_(value) {
  var room = String(value || setting_('DEFAULT_ROOM', 'classroom-1')).trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(room)) {
    throw apiError_(400, '교실 코드는 영문, 숫자, -, _만 사용해 40자 이내로 입력해 주세요.');
  }
  return room;
}

function cleanText_(value, fieldName, maxLength, required) {
  var text = String(value || '').trim();
  if (required && !text) throw apiError_(400, fieldName + '을(를) 입력해 주세요.');
  if (text.length > maxLength) throw apiError_(400, fieldName + '은(는) ' + maxLength + '자 이하여야 합니다.');
  return text;
}

function requireTeacherPin_(providedPin) {
  var expectedPin = setting_('TEACHER_PIN', '');
  if (expectedPin && providedPin !== expectedPin) {
    throw apiError_(401, '교사 PIN이 올바르지 않습니다.');
  }
}

function getSpreadsheet_() {
  var spreadsheetId = setting_('SPREADSHEET_ID', '');
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('스크립트 속성 SPREADSHEET_ID를 설정해 주세요.');
  }
  return active;
}

function ensureSheets_(spreadsheet) {
  ensureSheet_(spreadsheet, MESSAGE_SHEET, MESSAGE_HEADERS);
  ensureSheet_(spreadsheet, RESPONSE_SHEET, RESPONSE_HEADERS);
}

function ensureSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
    .map(function (value) { return String(value); });
  if (existing.join('|') !== headers.join('|')) {
    throw new Error(name + ' 시트의 첫 행 헤더가 백업 API 형식과 다릅니다.');
  }
  return sheet;
}

function readObjects_(sheet, headers) {
  if (sheet.getLastRow() <= 1) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map(function (row) {
    return headers.reduce(function (result, header, index) {
      result[header] = row[index];
      return result;
    }, {});
  }).filter(function (row) { return String(row.id || '').trim(); });
}

function appendObject_(sheet, headers, object) {
  sheet.appendRow(headers.map(function (header) { return object[header]; }));
}

function withLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function setting_(name, fallback) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  return value === null || value === '' ? fallback : value;
}

function positiveInteger_(value, fallback) {
  var parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
}

function copyWithout_(source, excluded) {
  return Object.keys(source).reduce(function (result, key) {
    if (excluded.indexOf(key) === -1) result[key] = source[key];
    return result;
  }, {});
}

function success_(status, data) {
  return { status: status, data: data };
}

function apiError_(status, message) {
  var error = new Error(message);
  error.status = status;
  return error;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
