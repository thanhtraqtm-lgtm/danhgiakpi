export interface CivilServiceTask {
  id: string;
  mission: string;       // Nhiệm vụ (Col 2)
  reportingLevel: string; // Cấp trình (Col 3)
  productName: string;    // Sản phẩm (Col 4)
  targetQuantity: number; // Số lượng (Col 5)
  timeline: string;       // Tiến độ (Col 6)
  note: string;           // Ghi chú (Col 7)
  maxScore: number;       // Điểm tối đa (Col 8)
  assignedScore: number;  // Điểm chấm công việc (Col 9)
  
  // Actual progress inputs (Thực tế triển khai)
  actualQtyCount: number;      // Thực tế hoàn thành - KPI Số lượng
  actualQualityCount: number;  // Thực tế hoàn thành - KPI Chất lượng
  actualProgressCount: number;  // Thực tế hoàn thành - KPI Tiến độ

  taskType?: 'Định kỳ' | 'Phát sinh' | 'Đột xuất'; // Loại công việc
  deadlineDate?: string; // Hạn hoàn thành cụ thể dạng YYYY-MM-DD
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  tasks: CivilServiceTask[];
  selfAssessmentNote?: string;
  departmentHeadAssessmentNote?: string;
  managerAssessmentNote?: string;
  evaluationPeriod?: string; // e.g. "Quý II / Năm 2026"

  // Standard Form 01 Fields (Vietnamese Party/Civil Self-Assessment Word Template)
  tutuongChinhTri?: string;      // 1. Tư tưởng chính trị
  phamChatDaoDuc?: string;       // 2. Phẩm chất đạo đức, lối sống
  tacPhongLeLoi?: string;        // 3. Tác phong, lề lối làm việc
  yThucKyLuat?: string;          // 4. Ý thức tổ chức kỷ luật
  hanCheKhuyetDiem?: string;     // 5. Hạn chế, khuyết điểm & nguyên nhân
  bienPhapKhacPhuc?: string;     // 6. Phương hướng, biện pháp khắc phục
  tuNhanXepLoai?: string;        // 7. Tự nhận mức xếp loại chất lượng (Xuất sắc / Tốt / Hoàn thành / Không hoàn thành)
  
  // 10 General Criteria scores (Tiêu chí chung - 30 points)
  diemI1?: number;
  diemI2?: number;
  diemII1?: number;
  diemII2?: number;
  diemII3?: number;
  diemII4?: number;
  diemIII1?: number;
  diemIII2?: number;
  diemIII3?: number;
  diemIII4?: number;
  
  // Login credentials and Admin access
  username?: string;
  password?: string;
  isAdmin?: boolean;
  orgType?: 'Ban Lãnh Đạo' | 'Lãnh đạo' | 'Phòng ban' | 'Đơn vị cơ sở'; // Organization level classification
  leadershipRole?: 'Trưởng' | 'Phó'; // To distinguish lead vs deputy leaders

  // CA Digital Signatures
  selfSignedCA?: boolean;
  selfSignedCADate?: string;
  deptHeadSignedCA?: boolean;
  deptHeadSignedCADate?: string;
  managerSignedCA?: boolean;
  managerSignedCADate?: string;

  // Trạng thái "Lưu" từng biểu mẫu: điểm/dữ liệu CHỈ được tính chính thức lên hệ thống sau khi bấm Lưu.
  // Mặc định (chưa lưu lần nào) coi như trắng/chưa có điểm. Mọi chỉnh sửa sau khi đã lưu sẽ tự đưa
  // biểu đó về trạng thái "chưa lưu" cho tới khi người dùng bấm Lưu lại.
  form1Saved?: boolean;      // Biểu 01: Nhiệm vụ công tác & điểm tự chấm
  form1SavedDate?: string;
  form2Saved?: boolean;      // Biểu 02: Bảng quy đổi chỉ số KPI chi tiết
  form2SavedDate?: string;
}

export interface KPIResultSummary {
  totalTargetQty: number;
  totalTargetConverted: number;
  
  totalQtyActual: number;
  totalQtyConverted: number;
  qtyKPIPercentage: number;
  
  totalQualityActual: number;
  totalQualityConverted: number;
  qualityKPIPercentage: number;
  
  totalProgressActual: number;
  totalProgressConverted: number;
  progressKPIPercentage: number;
  
  overallTaskPerformanceScore: number; // Average of the 3 percentages
  finalGradingScore: number; // Custom or calculated final tracking score
}

export function getGeneralCriteriaScores(emp: Employee) {
  return {
    diemI1: emp.diemI1 ?? 0,
    diemI2: emp.diemI2 ?? 0,
    diemII1: emp.diemII1 ?? 0,
    diemII2: emp.diemII2 ?? 0,
    diemII3: emp.diemII3 ?? 0,
    diemII4: emp.diemII4 ?? 0,
    diemIII1: emp.diemIII1 ?? 0,
    diemIII2: emp.diemIII2 ?? 0,
    diemIII3: emp.diemIII3 ?? 0,
    diemIII4: emp.diemIII4 ?? 0,
  };
}

// Cán bộ đã lưu đầy đủ Biểu 01 + Biểu 02 => đủ điều kiện để "Gửi lên Trưởng đơn vị" (ký xác nhận Biểu 03).
// Hiển thị "Tiến độ / Hạn hoàn thành" mà không có tiền tố "Trước ngày" (kể cả với dữ liệu cũ đã lưu
// trước khi có thay đổi này) - chỉ lấy đúng ngày hạn hoàn thành.
export function formatTimelineDisplay(timeline?: string): string {
  if (!timeline) return '';
  return timeline.replace(/^\s*trước\s*ngày\s*/i, '').trim();
}

export function isReadyToSubmitForApproval(emp: Employee): boolean {
  return !!(emp.form1Saved && emp.form2Saved);
}

// Điểm chỉ được coi là "điểm chính thức" của hệ thống sau khi: (1) cán bộ tự lưu đủ Biểu 01 + 02,
// (2) tự gửi/ký xác nhận (selfSignedCA), và (3) Trưởng đơn vị (hoặc cấp trên trực tiếp nếu cán bộ đó
// chính là trưởng đơn vị) đã hoàn thành nhận xét và gửi phê duyệt.
export function isEmployeeOfficiallyApproved(emp: Employee): boolean {
  if (!isReadyToSubmitForApproval(emp) || !emp.selfSignedCA) return false;
  const employeeIsDeptHead = (emp.role || '').includes('Trưởng') || (emp.role || '').includes('Phó Trưởng') || (emp.role || '').includes('Bí thư');
  return employeeIsDeptHead ? !!emp.managerSignedCA : !!emp.deptHeadSignedCA;
}

