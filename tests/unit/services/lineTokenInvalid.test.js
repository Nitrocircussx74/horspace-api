jest.mock('../../../src/middlewares/liffAuthMiddleware', () => ({
  verifyLineIdToken: jest.fn()
}));

const { verifyLineIdToken } = require('../../../src/middlewares/liffAuthMiddleware');
const tenantAuthService = require('../../../src/services/tenantAuthService');

describe('LINE_TOKEN_INVALID: log สาเหตุจริง', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('verify ล้มเหลว -> ตอบ 401 LINE_TOKEN_INVALID เหมือนเดิม และ log เฉพาะข้อความ error ไม่ log token', async () => {
    verifyLineIdToken.mockRejectedValue(new Error('LINE ID Token นี้ไม่ได้ออกให้กับแอปพลิเคชันนี้'));

    const result = await tenantAuthService.linkAndLogin({ rawPhone: '0800000000', pin: '123456', rawToken: 'SECRET.TOKEN.VALUE' });

    expect(result.statusCode).toBe(401);
    expect(result.body.code).toBe('LINE_TOKEN_INVALID');
    expect(warnSpy).toHaveBeenCalledWith('[LINE verify] LINE ID Token นี้ไม่ได้ออกให้กับแอปพลิเคชันนี้');
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('SECRET.TOKEN.VALUE');
  });
});

describe('setupOrResetPin: LINE ID Token เสีย', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('มี token แต่ verify ล้มเหลวและไม่มี session -> LINE_TOKEN_INVALID ไม่ใช่ LINE_LOGIN_REQUIRED', async () => {
    verifyLineIdToken.mockRejectedValue(new Error('LINE ID Token ไม่ถูกต้องหรือหมดอายุแล้ว'));

    const result = await tenantAuthService.setupOrResetPin({ targetPin: '123456', rawToken: 'EXPIRED.TOKEN' });

    expect(result.statusCode).toBe(401);
    expect(result.body.code).toBe('LINE_TOKEN_INVALID');
  });

  test('ไม่ส่ง token เลยและไม่มี session -> ยังเป็น LINE_LOGIN_REQUIRED เหมือนเดิม', async () => {
    const result = await tenantAuthService.setupOrResetPin({ targetPin: '123456' });

    expect(result.statusCode).toBe(401);
    expect(result.body.code).toBe('LINE_LOGIN_REQUIRED');
  });
});
