const { EventEmitter } = require('events');

jest.mock('../../../src/services/apiLogService', () => ({ record: jest.fn() }));

const apiLogService = require('../../../src/services/apiLogService');
const apiLogMiddleware = require('../../../src/middlewares/apiLogMiddleware');

const makeReqRes = ({ method = 'POST', originalUrl = '/api/v1/rooms', path = originalUrl.split('?')[0], user, statusCode = 200 } = {}) => {
  const req = { method, originalUrl, path, user, ip: '1.2.3.4', headers: { 'user-agent': 'jest-agent' } };
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.locals = {};
  res.json = jest.fn().mockReturnValue(res);
  return { req, res };
};

describe('apiLogMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ตอบกลับเสร็จ -> บันทึก method/path/status/ผู้เรียก/code ใน response', () => {
    const { req, res } = makeReqRes({ user: { id: 'u1', role: 'admin' }, statusCode: 401 });
    const next = jest.fn();

    apiLogMiddleware(req, res, next);
    res.json({ success: false, code: 'LINE_TOKEN_INVALID', message: 'x' });
    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(apiLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/v1/rooms',
      statusCode: 401,
      errorCode: 'LINE_TOKEN_INVALID',
      userId: 'u1',
      role: 'admin',
      ip: '1.2.3.4',
      userAgent: 'jest-agent'
    }));
    expect(typeof apiLogService.record.mock.calls[0][0].durationMs).toBe('number');
  });

  test('ห้ามเก็บ query string (มี token/เบอร์โทร) และ body', () => {
    const { req, res } = makeReqRes({ method: 'GET', originalUrl: '/api/liff/invoices/pdf?token=SECRET.JWT&phone=0800000000' });

    apiLogMiddleware(req, res, jest.fn());
    res.emit('finish');

    const saved = JSON.stringify(apiLogService.record.mock.calls[0][0]);
    expect(apiLogService.record.mock.calls[0][0].path).toBe('/api/liff/invoices/pdf');
    expect(saved).not.toContain('SECRET.JWT');
    expect(saved).not.toContain('0800000000');
  });

  test('ไม่มีผู้ใช้/ไม่มี code -> เก็บเป็น null', () => {
    const { req, res } = makeReqRes({ method: 'GET' });

    apiLogMiddleware(req, res, jest.fn());
    res.json({ success: true });
    res.emit('finish');

    expect(apiLogService.record).toHaveBeenCalledWith(expect.objectContaining({ userId: null, role: null, errorCode: null }));
  });

  test.each([
    ['preflight OPTIONS', { method: 'OPTIONS' }],
    ['health check GET /', { method: 'GET', originalUrl: '/', path: '/' }]
  ])('ข้าม %s', (_name, opts) => {
    const { req, res } = makeReqRes(opts);
    const next = jest.fn();

    apiLogMiddleware(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(apiLogService.record).not.toHaveBeenCalled();
  });
});
