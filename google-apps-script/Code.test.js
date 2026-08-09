import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

class Range {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.rows[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? '',
      ),
    );
  }

  setValues(values) {
    values.forEach((rowValues, rowOffset) => {
      const rowIndex = this.row - 1 + rowOffset;
      if (!this.sheet.rows[rowIndex]) this.sheet.rows[rowIndex] = [];
      rowValues.forEach((value, columnOffset) => {
        this.sheet.rows[rowIndex][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }
}

class Sheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }

  appendRow(values) {
    this.rows.push([...values]);
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, rowCount, columnCount) {
    return new Range(this, row, column, rowCount, columnCount);
  }

  setFrozenRows() {}
}

class Spreadsheet {
  constructor() {
    this.sheets = new Map();
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name) {
    const sheet = new Sheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function createRuntime() {
  const spreadsheet = new Spreadsheet();
  const properties = { SPREADSHEET_ID: 'spreadsheet-id' };
  let uuid = 0;
  const context = vm.createContext({
    console: { error() {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(text) {
        return {
          text,
          setMimeType() { return this; },
        };
      },
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => properties[name] ?? null,
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
    },
    Utilities: {
      getUuid: () => `uuid-${++uuid}`,
    },
  });
  const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
  vm.runInContext(source, context);
  return { context, properties, spreadsheet };
}

function body(output) {
  return JSON.parse(output.text);
}

function get(context, path, query = {}) {
  return body(context.doGet({ parameter: { path, method: 'GET', ...query } }));
}

function post(context, path, requestBody, teacherPin = '') {
  return body(context.doPost({
    postData: {
      contents: JSON.stringify({
        path,
        method: 'POST',
        query: {},
        body: requestBody,
        teacherPin,
      }),
    },
  }));
}

test('Apps Script 백업 API가 메시지 전체 흐름을 Spreadsheet에 저장한다', () => {
  const { context, spreadsheet } = createRuntime();

  const config = get(context, '/api/config');
  assert.equal(config.ok, true);
  assert.equal(config.data.defaultRoom, 'classroom-1');
  assert.equal(config.data.templates.length, 3);

  const created = post(context, '/api/messages', {
    room: 'classroom-1',
    type: 'question',
    target: '',
    message: '준비됐나요?',
    responseOptions: ['네'],
    allowText: true,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.id, 'uuid-1');

  const initialState = get(context, '/api/state', { room: 'classroom-1' });
  assert.equal(initialState.data.active.length, 1);

  const answered = post(context, '/api/messages/uuid-1/responses', {
    kind: 'preset',
    value: '네',
    respondent: '3학년 1반',
  });
  assert.equal(answered.status, 201);
  assert.equal(answered.data.message.responses.length, 1);

  const closed = post(context, '/api/messages/uuid-1/close', {});
  assert.equal(closed.data.status, 'closed');

  const finalState = get(context, '/api/state', { room: 'classroom-1' });
  assert.equal(finalState.data.active.length, 0);
  assert.equal(finalState.data.history[0].responses[0].value, '네');
  assert.ok(spreadsheet.getSheetByName('Backup_Messages'));
  assert.ok(spreadsheet.getSheetByName('Backup_Responses'));
});

test('교사 PIN을 Apps Script 요청 본문에서 검사한다', () => {
  const { context, properties } = createRuntime();
  properties.TEACHER_PIN = '1234';
  const payload = {
    room: 'classroom-1',
    type: 'call',
    target: '민수',
    message: '민수, 방송실로 오렴.',
    responseOptions: [],
    allowText: true,
  };

  assert.equal(post(context, '/api/messages', payload).status, 401);
  assert.equal(post(context, '/api/messages', payload, '1234').status, 201);
});
