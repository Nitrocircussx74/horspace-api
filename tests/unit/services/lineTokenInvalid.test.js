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
