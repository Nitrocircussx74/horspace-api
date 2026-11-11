const apiLogService = require('../services/apiLogService');

const MAX_USER_AGENT_LENGTH = 255;
const MAX_ERROR_CODE_LENGTH = 100;

// ข้าม preflight และ health check (docker healthcheck ยิง GET / ทุก 10 วินาที จะได้ ~8,600 แถว/วันที่ไม่มีประโยชน์)
const shouldSkip = (req) => req.method === 'OPTIONS' || (req.method === 'GET' && req.path === '/');

/**
 * บันทึก metadata ของทุก request ลง api_logs เมื่อตอบกลับเสร็จ (fire-and-forget ไม่รอ DB)
 * เก็บเฉพาะ method/path/status/เวลา/ผู้เรียก/code ใน response — ห้ามเก็บ body, query, header
 * เพราะมี PIN, เบอร์โทร, LINE ID Token, JWT (query ของลิงก์ดาวน์โหลดแนบ token มาด้วย)
 * ต้องวางหลัง body parser และก่อน routes (req.user ถูกตั้งโดย auth middleware ของแต่ละ route แต่อ่านตอน finish จึงทัน)
 */
const apiLogMiddleware = (req, res, next) => {
  if (shouldSkip(req)) return next();

  const startedAt = process.hrtime.bigint();

  // จับ code ใน response body (เช่น LINE_TOKEN_INVALID) ไว้ค้นสาเหตุ error โดยไม่ต้องเก็บ body ทั้งก้อน
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (typeof body?.code === 'string') res.locals.apiLogErrorCode = body.code.slice(0, MAX_ERROR_CODE_LENGTH);
    return originalJson(body);
  };

  res.on('finish', () => {
    apiLogService.record({
      method: req.method,
      path: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - startedAt) / 1000000n),
      errorCode: res.locals.apiLogErrorCode || null,
      userId: req.user?.id ? String(req.user.id) : null,
      role: req.user?.role ? String(req.user.role) : null,
      buildingId: req.buildingId ? String(req.buildingId) : null,
      ip: req.ip || null,
      userAgent: (req.headers['user-agent'] || '').slice(0, MAX_USER_AGENT_LENGTH) || null
    });
  });

  next();
};

module.exports = apiLogMiddleware;
