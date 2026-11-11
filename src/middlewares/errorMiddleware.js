const config = require('../config/env');

/**
 * Middleware สำหรับจัดการ Route ที่หาไม่พบ (404 Not Found)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`ไม่พบ Endpoint นี้ - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Middleware สำหรับจัดการ Error แบบรวมศูนย์ (Global Error Handler)
 */
const errorHandler = (err, req, res, next) => {
  // Prisma P2023 + "Error creating UUID" = Client ส่งค่าที่ไม่ใช่ UUID เข้ามาใน query/params/body (เช่น buildingId เป็นข้อความ)
  // เป็นความผิดของ Request ไม่ใช่ Server — ตอบ 400 แทน 500 ครอบทุก Endpoint ที่ส่งต่อด้วย next(error) จุดเดียว
  if (err.code === 'P2023' && /UUID/i.test(err.meta?.message || '')) {
    return res.status(400).json({
      success: false,
      message: 'รูปแบบรหัสอ้างอิง (ID) ไม่ถูกต้อง',
      code: 'INVALID_ID'
    });
  }

  // ⚠️ เดิมไม่เคยอ่าน err.statusCode เลย ทำให้ Error ที่ throw จาก Service พร้อม statusCode
  // ตั้งใจไว้ (เช่น 404/400/403 ใน tenantService, lineService) กลายเป็น 500 เสมอเวลาที่ Controller
  // ส่งต่อด้วย next(error) โดยไม่ได้ res.status() เองก่อน — แก้ให้ยึด err.statusCode เป็นหลัก
  const statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);

  // 5xx ห้ามส่ง err.message ออกไป (Prisma error มีชื่อตาราง/คำสั่ง/path ไฟล์บนเครื่อง) ยกเว้นตอน dev
  const expose = statusCode < 500 || config.nodeEnv === 'development';
  if (statusCode >= 500 && config.nodeEnv !== 'test') console.error(err);

  res.status(statusCode).json({
    success: false,
    message: (expose && err.message) || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)',
    ...(err.code && { code: err.code }),
    ...(err.data !== undefined && { data: err.data }),
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
