export const DEPARTMENTS = [
  'Lãnh đạo',
  'Phòng Thống kê Tổng hợp',
  'Phòng TCHC',
  'Phòng Thống kê TMDV & Giá',
  'Phòng Thống kê CNXD',
  'Phòng Thống kê NN&XH',
  'Thống kê cơ sở Phố Hiến',
  'Thống kê cơ sở Như Quỳnh',
  'Thống kê cơ sở Yên Mỹ',
  'Thống kê cơ sở Mỹ Hào',
  'Thống kê cơ sở Khoái Châu',
  'Thống kê cơ sở Lương Bằng',
  'Thống kê cơ sở Hoàng Hoa Thám',
  'Thống kê cơ sở Quỳnh Phụ',
  'Thống kê cơ sở Hưng Hà',
  'Thống kê cơ sở Đông Hưng',
  'Thống kê cơ sở Thái Thụy',
  'Thống kê cơ sở Tiền Hải',
  'Thống kê cơ sở Kiến Xương',
  'Thống kê cơ sở Vũ Thư',
] as const;

export type Department = typeof DEPARTMENTS[number] | string;

export interface User {
  id: string;
  fullName: string;
  birthYear?: string;
  joinDate?: string;
  position: string;
  title?: string;
  workUnit?: string;
  department: Department | string;
  jobDescription?: string;
  phone?: string;
  email?: string;
  username: string;
  password?: string;
  createdAt: string;
  role?: 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER' | 'ADMIN';
  isFirstLogin?: boolean;
  passwordChanged?: boolean;
}

export type TaskStatus = 'Chưa hoàn thành' | 'Chưa hoàn thành trễ hạn' | 'Hoàn thành' | 'Hoàn thành trễ hạn';

export interface KpiTask {
  id: string;
  userName: string; // Người/ đơn vị chủ trì
  taskName: string; // Tên công việc
  jobType?: string; // Loại công việc (Kế hoạch tổng cục, Phát sinh, Kế hoạch đơn vị...)
  coopUnit?: string; // Đơn vị phối hợp
  assignedDate?: string; // Ngày giao việc (DD/MM/YYYY)
  planDeadline: string; // Hạn hoàn thành (YYYY-MM-DD or DD/MM/YYYY)
  actualDeadline?: string; // Hạn thực tế
  weight: number; // Trọng số/Điểm số
  scoreCalculated?: number;
  status: TaskStatus | string; // Tình trạng
  lateReason?: string; // Lý do trễ hạn
  daysLate?: number;
  department?: string;
  notes?: string;
  customFields?: Record<string, string | number>;
  categoryGroup?: number;
  maxScore?: number;
  conversionFactor?: number;
  taskGroup?: string;
  detailTask?: string;
}

export interface ColumnMappingConfig {
  userNameCol: string;
  taskNameCol: string;
  planDeadlineCol: string;
  actualDeadlineCol: string;
  weightCol: string;
  customCols: { id: string; label: string; mappedCol: string }[];
}

export interface LateRuleConfig {
  nDaysThreshold: number; // Mặc định 5 ngày
  deductRatioLate: number; // Mặc định 0.25 (25%)
  warningDays: number; // Mặc định 2 ngày
}

export interface SelfAssessmentDoc {
  id: string;
  fileName: string;
  userName: string;
  uploadDate: string;
  extractedContent: string;
  wordCount: number;
  userId?: string;
  periodId?: string;
  status?: string;
  docType?: string;
  createdAt?: string;
}

export type UserRole = 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER';

export type SubmissionStatus = 'DRAFT' | 'PENDING_DEPT' | 'APPROVED_DEPT' | 'PENDING_PROVINCE' | 'APPROVED_FINAL' | 'REJECTED' | 'RECALLED' | 'DELETED';

export interface SelfEvalCriterion {
  id: string;
  categoryName: string;
  targetDescription: string;
  plannedDeadline: string;
  actualStatus: string;
  selfScore: number;
  maxScore: number;
}

export const CLASSIFICATION_OPTIONS = [
  'Hoàn thành xuất sắc nhiệm vụ',
  'Hoàn thành tốt nhiệm vụ',
  'Hoàn thành nhiệm vụ',
  'Chưa hoàn thành nhiệm vụ',
  'Không hoàn thành nhiệm vụ',
] as const;

export type ClassificationType = typeof CLASSIFICATION_OPTIONS[number];

export interface WorkflowSubmission {
  id: string;
  userId: string;
  userName: string;
  userPosition: string;
  department: string;
  period: string; // e.g. "Kỳ đánh giá Quý IV/2025"
  selfScoreTotal: number;
  selfClassification?: string; // Mức công chức tự chọn/đề xuất
  criteria: SelfEvalCriterion[];
  selfExplanation?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  // Dept Head review
  deptHeadName?: string;
  deptHeadComment?: string;
  deptHeadScore?: number;
  deptHeadClassification?: string; // Mức Trưởng phòng đánh giá & xếp loại
  deptApprovedAt?: string;
  deptHeadId?: string;
  // Province Leader review
  provinceLeaderName?: string;
  provinceLeaderComment?: string;
  finalScore?: number;
  finalClassification?: string; // Mức Trưởng Thống kê Tỉnh quyết định xếp loại
  finalApprovedAt?: string;
  provinceLeaderId?: string;
  // Attachments
  attachedFileName?: string;
  selfAssessmentFileUrl?: string; // URL to uploaded self-assessment file
  selfAssessmentFileName?: string;
  // Recall/Retract
  recalledAt?: string;
  recalledBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  // Recalculation
  recalculatedAt?: string;
  recalculatedBy?: string;
  approverName?: string;
  approverTitle?: string;
  generalScore?: number;
  taskWeightedScore?: number;
  kpiTaskScore?: number;
  strengthsText?: string;
  weaknessesText?: string;
  managerOpinionText?: string;
  provinceUnit?: string;
  departmentUnit?: string;
  taskCount?: number;
  completedTaskCount?: number;
  kpiRows?: any[];
  // Version for tracking
  version?: number;
}

export interface EvaluationPeriodConfig {
  periodName: string;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  periods?: string[]; // Danh sách các kỳ đã tạo (lưu localStorage)
}

export interface TaskCatalogItem {
  id: string;
  stt: string;
  taskGroup: string; // Nhiệm vụ chính
  detailTask: string; // Công việc chi tiết
  outputProduct: string; // Sản phẩm đầu ra
  categoryGroup: number; // Phân nhóm (1, 2, 3, 4, 5)
  maxScore: number; // Khung điểm tối đa
  evaluatedScore: number; // Điểm chấm
  conversionFactor: number; // Hệ số quy đổi
  notes?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: 'google_meet' | 'offline' | 'polycom' | 'hybrid';
  startDate: string; // ISO string
  endDate: string; // ISO string
  repeat: boolean;
  googleMeetLink?: string;
  organizer?: string;
  location?: string;
  attendees: string[]; // emails
  reminders: { type: 'notification' | 'email'; minutesBefore: number }[];
  attachments: { name: string; url: string }[];
  createdAt: string;
}

export interface WeeklySchedule {
  id: string;
  weekStartDate: string; // ISO string (Monday of the week)
  weekEndDate: string; // ISO string (Sunday of the week)
  department: string; // Department name
  workUnit?: string; // Base unit for 14 cơ sở
  userName: string; // Person responsible
  userPosition?: string;
  dayOfWeek: number; // 0=Mon, 1=Tue, ..., 6=Sun
  date: string; // YYYY-MM-DD
  taskName: string;
  taskType: 'Công tác' | 'Họp' | 'Đào tạo' | 'Khác' | 'Làm việc tại cơ quan';
  location?: string;
  notes?: string;
  status: 'Đã hoàn thành' | 'Đang thực hiện' | 'Chưa bắt đầu' | 'Hủy';
  createdAt: string;
  createdBy: string;
}

export interface WeeklyScheduleItem {
  id?: string;
  weekStartDate: string; // YYYY-MM-DD of Monday
  dayOfWeek: number;      // 1=Mon, 2=Tue, ..., 6=Sat, 0=Sun
  session: 'MORNING' | 'AFTERNOON';
  personName: string;
  personRole?: string;
  unitName?: string;
  title: string;
  location?: string;
  participants?: string;
  workType?: 'OFFICE' | 'OUTSIDE' | 'MEETING' | 'OFF';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'users_list'
  | 'org_chart'
  | 'kpi_tasks'
  | 'kpi_catalog'
  | 'kpi_catalog_lookup'
  | 'kpi_assign'
  | 'kpi_late_rules'
  | 'kpi_rules_doc'
  | 'self_eval_30'
  | 'self_eval_70'
  | 'self_eval_workflow'
  | 'eval_list'
  | 'eval_results'
  | 'eval_lock'
  | 'meeting_register'
  | 'meeting_calendar'
  | 'weekly_schedule';
