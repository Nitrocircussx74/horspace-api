jest.mock('../../../src/config/prisma', () => ({ apiLog: { create: jest.fn() } }));

const prisma = require('../../../src/config/prisma');
const apiLogService = require('../../../src/services/apiLogService');

describe('apiLogService.record', () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  test('บันทึกลง api_logs', async () => {
    prisma.apiLog.create.mockResolvedValue({ id: '1' });

    const result = await apiLogService.record({ method: 'GET', path: '/x', statusCode: 200, durationMs: 5 });

    expect(prisma.apiLog.create).toHaveBeenCalledWith({ data: { method: 'GET', path: '/x', statusCode: 200, durationMs: 5 } });
    expect(result).toEqual({ id: '1' });
  });

  test('DB พัง -> ไม่ throw (log พังต้องไม่ทำให้ request ของผู้ใช้พัง)', async () => {
    prisma.apiLog.create.mockRejectedValue(new Error('db down'));

    await expect(apiLogService.record({ method: 'GET', path: '/x', statusCode: 200, durationMs: 5 })).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
