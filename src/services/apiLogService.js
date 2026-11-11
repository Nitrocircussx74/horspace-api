const prisma = require('../config/prisma');

class ApiLogService {
  /**
   * บันทึกการเรียก API 1 รายการลงตาราง api_logs
   * ห้าม throw เด็ดขาด: log พังต้องไม่ทำให้ request ของผู้ใช้พัง (เหมือน auditService)
   * ponytail: ไม่มี retention — ตารางโตไม่จำกัด ถ้าเกินหลักล้านแถวให้เพิ่ม job ลบข้อมูลเก่ากว่า N วัน
   * @param {Object} entry method, path, statusCode, durationMs, errorCode?, userId?, role?, buildingId?, ip?, userAgent?
   */
  async record(entry) {
    try {
      return await prisma.apiLog.create({ data: entry });
    } catch (error) {
      console.error('⚠️ Failed to save ApiLog record:', error.message);
      return null;
    }
  }
}

module.exports = new ApiLogService();
