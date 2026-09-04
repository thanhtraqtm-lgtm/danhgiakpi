import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Edit2,
  Save,
  Trash2,
  X,
  MapPin,
  Clock,
  Briefcase,
  BookOpen,
  GraduationCap,
  MoreHorizontal,
  Building,
  Users,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart2,
  XCircle,
  ChevronDown,
  Eye,
  Maximize2,
  Calendar,
  CalendarDays,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Layout,
  Grid,
  Table,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Minimize2,
  Maximize,
  Building2,
  User,
  Users as UsersIcon,
  List,
  ClipboardList,
  Menu,
  X as XIcon,
  Filter as FilterIcon,
  BarChart3,
  Check,
  ExternalLink,
  Sun,
  Moon,
  Building2 as Building2Icon,
  CheckCircle2,
  XCircle as XCircleIcon,
} from 'lucide-react';
import { WeeklyScheduleItem, User as UserType, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';

export const DEFAULT_LEADERS = [
  { name: 'Đào Trọng Truyển', position: 'Trưởng Thống Kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Phạm Văn Tụ', position: 'Phó Trưởng Thống Kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Đào Thị Hiếu', position: 'Phó Trưởng Thống Kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Vũ Tuấn Hùng', position: 'Phó Trưởng Thống Kê', unitName: 'Ban Lãnh đạo' },
];

const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SESSIONS = ['MORNING', 'AFTERNOON'] as const;
const SESSION_LABELS = { MORNING: 'Sáng', AFTERNOON: 'Chiều' };

const STATUS_ICONS = {
  'Đã hoàn thành': '✓',
  'Đang thực hiện': '📝',
  'Chưa bắt đầu': '○',
  'Hủy': '✕',
};

const TASK_TYPE_COLORS = {
  'Họp': '#3b82f6',
  'Công tác': '#10b981',
  'Làm việc tại cơ quan': '#f59e0b',
  'Đào tạo': '#ef4444',
  'Khác': '#8b5cf6',
};

const WORK_TYPE_LABELS_VN = {
  OFFICE: 'Tại CQ',
  OUTSIDE: 'Công tác',
  MEETING: 'Họp',
  OFF: 'Nghỉ',
};

const WORK_TYPE_COLORS = {
  OFFICE: '#f59e0b',
  OUTSIDE: '#10b981',
  MEETING: '#3b82f6',
  OFF: '#6b7280',
};

const WORK_TYPE_ICONS = {
  OFFICE: Building,
  OUTSIDE: Briefcase,
  MEETING: Users,
  OFF: XCircleIcon,
};

const LEADER_COLOR = '#2d6e3e';
const PHONG_COLOR = '#3b82f6';
const VUNG1_COLOR = '#0d9488';
const VUNG2_COLOR = '#ec4899';

// Date & Week helper functions
const toLocalDateString = (dateInput: Date | string) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateInput;
  }
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDayOfWeek = (val: any): number => {
  if (typeof val === 'number') {
    return val >= 0 && val <= 6 ? val : 1;
  }
  const str = String(val || '').toLowerCase().trim();
  if (str.includes('chủ nhật') || str.includes('cn') || str === '0') return 0;
  if (str.includes('thứ hai') || str.includes('thứ 2') || str === 't2' || str === '2' || str === '1') return 1;
  if (str.includes('thứ ba') || str.includes('thứ 3') || str === 't3' || str === '3') return 2;
  if (str.includes('thứ tư') || str.includes('thứ 4') || str === 't4' || str === '4') return 3;
  if (str.includes('thứ năm') || str.includes('thứ 5') || str === 't5' || str === '5') return 4;
  if (str.includes('thứ sáu') || str.includes('thứ 6') || str === 't6' || str === '6') return 5;
  if (str.includes('thứ bảy') || str.includes('thứ 7') || str === 't7' || str === '7') return 6;
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    if (num >= 2 && num <= 7) return num - 1;
    if (num === 0 || num === 1) return num;
  }
  return 1;
};

const isSameWeek = (sWeekDate: string | undefined, targetWeekStart: Date) => {
  if (!sWeekDate) return true;
  const targetStr = toLocalDateString(targetWeekStart);
  if (sWeekDate === targetStr) return true;
  try {
    const sDate = new Date(sWeekDate);
    if (isNaN(sDate.getTime())) return false;
    const start = new Date(targetWeekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return sDate >= start && sDate < end;
  } catch {
    return sWeekDate === targetStr;
  }
};

const isCustomSchedule = (s: { workType?: string; title?: string } | null | undefined): boolean => {
  if (!s) return false;
  if (s.workType && s.workType !== 'OFFICE') return true;
  if (s.title && s.title.trim() !== '') {
    const norm = s.title.trim().toLowerCase();
    if (
      norm !== 'làm việc tại cơ quan' && 
      norm !== 'làm việc cơ quan' && 
      norm !== 'tại cơ quan' &&
      norm !== 'tại cq' &&
      norm !== 'cơ quan' &&
      norm !== 'co quan' &&
      norm !== '—' &&
      norm !== '-'
    ) {
      return true;
    }
  }
  return false;
};

const VUNG1_UNITS = [
  'Phố Hiến', 'Như Quỳnh', 'Yên Mỹ', 'Mỹ Hào', 'Khoái Châu', 'Lương Bằng', 'Hoàng Hoa Thám'
];

const VUNG2_UNITS = [
  'Quỳnh Phụ', 'Hưng Hà', 'Đông Hưng', 'Thái Thụy', 'Tiền Hải', 'Kiến Xương', 'Vũ Thư'
];

const PHONG_UNITS = [
  { short: 'P. Tổng hợp', full: 'Phòng Thống kê Tổng hợp', count: 12 },
  { short: 'Phòng TCHC', full: 'Phòng TCHC', count: 0 },
  { short: 'P. TMDV & Giá', full: 'Phòng Thống kê TMDV & Giá', count: 0 },
  { short: 'P. CNXD', full: 'Phòng Thống kê CNXD', count: 0 },
  { short: 'P. NN&XH', full: 'Phòng Thống kê NN&XH', count: 0 },
];

const FUNCTIONAL_DEPTS = PHONG_UNITS.map(p => p.full);
const ALL_DISTRICTS = [...VUNG1_UNITS, ...VUNG2_UNITS];

// Fuzzy match department names (case-insensitive, trim, accent-insensitive)
const normName = (s: string) => 
  (s || '').normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const normDept = normName;

const isPersonMatch = (p1?: string, p2?: string): boolean => {
  if (!p1 || !p2) return false;
  const s1 = p1.trim().toLowerCase();
  const s2 = p2.trim().toLowerCase();
  if (s1 === s2) return true;
  const n1 = normName(p1);
  const n2 = normName(p2);
  if (n1 === n2) return true;
  if (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1))) return true;
  return false;
};

const normalizeSession = (sess?: string): 'MORNING' | 'AFTERNOON' => {
  if (!sess) return 'MORNING';
  const s = sess.toString().trim().toUpperCase();
  if (s.includes('CHIỀU') || s.includes('CHIEU') || s === 'AFTERNOON' || s === 'PM') return 'AFTERNOON';
  return 'MORNING';
};

const deptMatch = (userDept: string, targetDept: string) => {
  const normUser = normDept(userDept);
  const normTarget = normDept(targetDept);
  return normUser === normTarget || normUser.includes(normTarget) || normTarget.includes(normUser);
};

const formatWeekRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

// Card colors for modern design
const CARD_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600',
  'from-orange-500 to-orange-600',
];

const CARD_HOVER_GRADIENTS = [
  'from-emerald-600 to-emerald-700',
  'from-blue-600 to-blue-700',
  'from-amber-600 to-amber-700',
  'from-purple-600 to-purple-700',
  'from-rose-600 to-rose-700',
  'from-indigo-600 to-indigo-700',
  'from-orange-600 to-orange-700',
];

const CARD_BG_LIGHT = [
  'bg-emerald-50 dark:bg-emerald-950/20',
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-amber-50 dark:bg-amber-950/20',
  'bg-purple-50 dark:bg-purple-950/20',
  'bg-rose-50 dark:bg-rose-950/20',
  'bg-indigo-50 dark:bg-indigo-950/20',
  'bg-orange-50 dark:bg-orange-950/20',
];

const CARD_BORDER_LIGHT = [
  'border-emerald-200 dark:border-emerald-800',
  'border-blue-200 dark:border-blue-800',
  'border-amber-200 dark:border-amber-800',
  'border-purple-200 dark:border-purple-800',
  'border-rose-200 dark:border-rose-800',
  'border-indigo-200 dark:border-indigo-800',
  'border-orange-200 dark:border-orange-800',
];

const CARD_TEXT_COLOR = [
  'text-emerald-700 dark:text-emerald-300',
  'text-blue-700 dark:text-blue-300',
  'text-amber-700 dark:text-amber-300',
  'text-purple-700 dark:text-purple-300',
  'text-rose-700 dark:text-rose-300',
  'text-indigo-700 dark:text-indigo-300',
  'text-orange-700 dark:text-orange-300',
];

const isCustomWork = (s: { workType?: string; title?: string }) => {
  if (!s) return false;
  if (s.workType && s.workType !== 'OFFICE') return true;
  if (s.title && s.title.trim() !== '') {
    const norm = s.title.trim().toLowerCase();
    if (
      norm !== 'làm việc tại cơ quan' && 
      norm !== 'làm việc cơ quan' && 
      norm !== 'tại cơ quan' &&
      norm !== 'tại cq' &&
      norm !== 'cơ quan' &&
      norm !== 'co quan' &&
      norm !== '—' &&
      norm !== '-'
    ) {
      return true;
    }
  }
  return false;
};

const getScheduleForUnit = (
  unit: { name: string; fullName?: string; members: UserType[] },
  schedules: any[],
  weekStartDate: Date,
  filterWorkType: string
) => {
  return schedules.filter(s => {
    if (!isSameWeek(s.weekStartDate, weekStartDate)) return false;
    const sPerson = s.personName || '';
    const sUnit = s.unitName || '';
    
    // Match by member name
    if (unit.members.some(m => isPersonMatch(sPerson, m.fullName))) return true;
    
    // Match by unit department
    if (deptMatch(sUnit, unit.fullName || unit.name) || deptMatch(sUnit, unit.name)) return true;
    
    // Match if unit.name is the person's name (e.g. Ban Lãnh đạo cards)
    if (isPersonMatch(sPerson, unit.name)) return true;
    if (deptMatch(sPerson, unit.name)) return true;
    
    return false;
  }).filter(s => {
    if (filterWorkType !== 'ALL' && s.workType !== filterWorkType) return false;
    return true;
  }).sort((a, b) => {
    const dayA = parseDayOfWeek(a.dayOfWeek);
    const dayB = parseDayOfWeek(b.dayOfWeek);
    if (dayA !== dayB) return dayA - dayB;
    return normalizeSession(a.session) === 'MORNING' ? -1 : 1;
  });
};

// ===== MODERN CARD COMPONENT =====
interface ModernCardProps {
  unit: {
    id: string;
    name: string;
    fullName?: string;
    position?: string;
    color: string;
    members: UserType[];
    allSchedules: any[];
  };
  index: number;
  isSelected?: boolean;
  schedules: any[];
  weekStartDateStr: string;
  weekStartDate: Date;
  filterWorkType: string;
  onClick: () => void;
  onAddClick: (e: React.MouseEvent) => void;
  handleEditClick: (schedule: any) => void;
  onAddForMemberAndDay?: (dayIndex: number, personName: string, session?: 'MORNING' | 'AFTERNOON') => void;
  blockType?: 'leader' | 'phong' | 'vung1' | 'vung2';
}

const ModernCard: React.FC<ModernCardProps> = ({
  unit,
  index,
  isSelected,
  schedules,
  weekStartDateStr,
  weekStartDate,
  filterWorkType,
  onClick,
  onAddClick,
  handleEditClick,
  onAddForMemberAndDay,
  blockType
}) => {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const bgLight = CARD_BG_LIGHT[index % CARD_BG_LIGHT.length];
  const borderLight = CARD_BORDER_LIGHT[index % CARD_BORDER_LIGHT.length];
  const textColor = CARD_TEXT_COLOR[index % CARD_TEXT_COLOR.length];

  const unitSchedules = getScheduleForUnit(unit, schedules, weekStartDate, filterWorkType);
  // Only count & group tasks that are DIFFERENT from "Làm việc tại cơ quan"
  const customTasks = unitSchedules.filter(isCustomWork);
  const totalTasks = customTasks.length;

  // Group by work type (only custom tasks)
  const workTypeCounts = customTasks.reduce((acc, s) => {
    acc[s.workType] = (acc[s.workType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by day (only custom tasks)
  const schedulesByDay: Record<number, any[]> = {};
  customTasks.forEach(s => {
    const dayNum = parseDayOfWeek(s.dayOfWeek);
    if (!schedulesByDay[dayNum]) schedulesByDay[dayNum] = [];
    schedulesByDay[dayNum].push(s);
  });

  // Calculate boundary orientation to avoid clipping
  const isLeader = blockType === 'leader';
  const isPhong = blockType === 'phong';
  const isRightCol = isLeader ? (index % 2 === 1) : isPhong ? (index % 3 === 2) : (index % 4 === 3);
  const isLeftCol = isLeader ? (index % 2 === 0) : isPhong ? (index % 3 === 0) : (index % 4 === 0);

  return (
    <div
      onClick={onClick}
      className={`relative group w-full flex flex-col justify-between rounded-xl transition-all duration-150 text-left cursor-pointer overflow-visible p-2 sm:p-2.5 min-h-[70px] hover:z-40 ${
        isSelected
          ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 z-20'
          : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 z-10'
      }`}
      style={{ borderTop: `3px solid ${unit.color || '#2d6e3e'}` }}
    >
      {/* Header: Name, Role/Short Subtitle, Badge, and Quick '+' Add */}
      <div className="w-full flex items-start justify-between gap-1 mb-1">
        <div className="min-w-0 flex-1 text-left">
          <h4 className="font-semibold text-[12px] sm:text-[12.5px] leading-tight truncate text-slate-800 dark:text-slate-100" title={unit.name}>
            {unit.name}
          </h4>
          {(unit.position || unit.fullName) && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate leading-tight mt-0.5" title={unit.position || unit.fullName}>
              {unit.position || unit.fullName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {totalTasks > 0 ? (
            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80">
              {totalTasks}
            </span>
          ) : null}

          {/* Quick Add Button with '+' Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick(e);
            }}
            className="w-5 h-5 flex items-center justify-center bg-slate-50 hover:bg-[#2d6e3e] hover:text-white text-slate-500 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-[#2d6e3e] border border-slate-200 dark:border-slate-700 rounded transition-all"
            title="Thêm lịch mới"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Day indicators in plain text without bounding boxes */}
      <div className="flex items-center justify-between w-full pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
        {DAY_LABELS_SHORT.map((day, dayIndex) => {
          const dayNum = dayIndex === 6 ? 0 : dayIndex + 1;
          const dayTasks = schedulesByDay[dayNum] || [];
          const hasTasks = dayTasks.length > 0;
          
          const dObj = new Date(weekStartDate);
          dObj.setDate(dObj.getDate() + dayIndex);
          const dateFormatted = `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}`;

          // Boundary-safe popover and pointer arrow positioning
          let tooltipAlign = 'left-1/2 -translate-x-1/2';
          let arrowAlign = 'left-1/2 -translate-x-1/2';

          if (isRightCol) {
            tooltipAlign = 'right-0 sm:-right-2';
            arrowAlign = dayIndex <= 2 ? 'right-28' : dayIndex >= 5 ? 'right-6' : 'right-16';
          } else if (isLeftCol) {
            tooltipAlign = 'left-0 sm:-left-2';
            arrowAlign = dayIndex <= 1 ? 'left-6' : dayIndex >= 4 ? 'left-28' : 'left-16';
          } else {
            if (dayIndex <= 1) {
              tooltipAlign = 'left-0 sm:-left-4';
              arrowAlign = 'left-8';
            } else if (dayIndex >= 5) {
              tooltipAlign = 'right-0 sm:-right-4';
              arrowAlign = 'right-8';
            } else {
              tooltipAlign = 'left-1/2 -translate-x-1/2';
              arrowAlign = 'left-1/2 -translate-x-1/2';
            }
          }

          return (
            <div 
              key={dayIndex} 
              className="relative group/day flex-1 flex flex-col items-center justify-center cursor-pointer py-0.5"
              onClick={(e) => {
                if (hasTasks) {
                  e.stopPropagation();
                }
              }}
            >
              {/* Plain text Day name */}
              <span className={`text-[10px] sm:text-[10.5px] leading-none transition-colors ${
                hasTasks
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'font-normal text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
                {day}
              </span>

              {/* Dot indicator under day */}
              {hasTasks ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1 ring-1 ring-white dark:ring-slate-900" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-1" />
              )}

              {/* Floating Popper / Tooltip Menu on Hover - Safe from boundary cutoffs */}
              {hasTasks && (
                <div 
                  className={`absolute bottom-full mb-2.5 ${tooltipAlign} z-50 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 pointer-events-none opacity-0 invisible group-hover/day:opacity-100 group-hover/day:visible transition-all duration-150 ease-out`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{DAY_LABELS[dayIndex]} ({dateFormatted})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                      {dayTasks.length} việc
                    </span>
                  </div>

                  {/* List of Tasks */}
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {dayTasks.map((task, tIdx) => {
                      const WorkIcon = WORK_TYPE_ICONS[task.workType as keyof typeof WORK_TYPE_ICONS] || Building;
                      const typeColor = WORK_TYPE_COLORS[task.workType] || '#2d6e3e';
                      return (
                        <div key={task.id || tIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-left space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-100">
                              {task.personName} {task.personRole ? `(${task.personRole})` : ''}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-medium ${
                              task.session === 'MORNING'
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300'
                            }`}>
                              {SESSION_LABELS[task.session]}
                            </span>
                          </div>

                          <div className="text-[11.5px] text-slate-700 dark:text-slate-200 font-normal leading-snug flex items-start gap-1">
                            <span className="shrink-0 mt-0.5 px-1 py-0.2 rounded text-[9px] font-medium inline-flex items-center gap-0.5" style={{ backgroundColor: `${typeColor}18`, color: typeColor }}>
                              <WorkIcon className="w-2.5 h-2.5" />
                              {WORK_TYPE_LABELS_VN[task.workType] || task.workType}
                            </span>
                            <span className="flex-1">{task.title}</span>
                          </div>

                          {task.location && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-normal">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{task.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Little arrow at bottom */}
                  <div className={`absolute -bottom-1.5 ${arrowAlign} w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 rotate-45`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Danh sách công việc trực tiếp trên thẻ - Nhìn 1 lần là ra hết các công việc của đơn vị */}
      {customTasks.length > 0 ? (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1 w-full">
          {customTasks.slice(0, 3).map((task, tIdx) => {
            const dayNum = parseDayOfWeek(task.dayOfWeek);
            const dayText = DAY_LABELS_SHORT[dayNum === 0 ? 6 : dayNum - 1];
            const sessionText = task.session === 'MORNING' ? 'S' : 'C';
            return (
              <div 
                key={task.id || tIdx} 
                className="text-[11px] leading-tight flex items-start gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors"
                title={`${dayText} (${task.session === 'MORNING' ? 'Sáng' : 'Chiều'}) - ${task.personName ? task.personName + ': ' : ''}${task.title}${task.location ? ' [' + task.location + ']' : ''}`}
              >
                <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {dayText}-{sessionText}
                </span>
                <span className="truncate flex-1 font-medium">
                  {task.title}
                </span>
              </div>
            );
          })}
          {customTasks.length > 3 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
              +{customTasks.length - 3} công việc khác...
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 pt-1.5 border-t border-slate-100/60 dark:border-slate-800/60 text-[10px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shrink-0" />
          <span className="truncate">Làm việc tại cơ quan</span>
        </div>
      )}
    </div>
  );
};

// ===== SECTION BLOCK COMPONENT =====
const SectionBlock = ({ 
  title, 
  subtitle,
  icon, 
  headerColor,
  units,
  color,
  type,
  onAddForm,
  schedules,
  weekStartDateStr,
  weekStartDate,
  filterWorkType,
  handleEditClick,
  onUnitClick,
  selectedUnitId
}: { 
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  headerColor: string;
  units: Array<{id: string; name: string; fullName?: string; position?: string; color: string; members: UserType[]; allSchedules: any[]}>;
  color: string;
  type: 'leader' | 'phong' | 'vung1' | 'vung2';
  onAddForm: (dayIndex?: number, unitName?: string, session?: 'MORNING' | 'AFTERNOON') => void;
  schedules: any[];
  weekStartDateStr: string;
  weekStartDate: Date;
  filterWorkType: string;
  handleEditClick: (schedule: any) => void;
  onUnitClick?: (unit: any) => void;
  selectedUnitId?: string | null;
}) => {
  const handleAddClick = (e: React.MouseEvent, unitName: string) => {
    e.stopPropagation();
    onAddForm(undefined, unitName);
  };

  // Calculate task count for each unit in this block
  const unitTaskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    units.forEach(u => {
      const unitScheds = getScheduleForUnit(u, schedules, weekStartDate, filterWorkType);
      map[u.id] = unitScheds.filter(isCustomWork).length;
    });
    return map;
  }, [units, schedules, weekStartDate, filterWorkType]);

  // Total tasks across all units in this block
  const totalBlockTasks = useMemo(() => {
    return Object.values(unitTaskCounts).reduce((sum: number, c) => sum + (Number(c) || 0), 0);
  }, [unitTaskCounts]);

  // Check if currently selected unit belongs to this block
  const activeUnitInBlock = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find(u => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  // Ensure each block displays exactly 2 rows (top & bottom):
  // leader: 4 items => 2 cols x 2 rows
  // phong: 5 items => 3 cols (row 1: 3, row 2: 2)
  // vung1: 7 items => 4 cols (row 1: 4, row 2: 3)
  // vung2: 7 items => 4 cols (row 1: 4, row 2: 3)
  const gridColsClass = type === 'leader'
    ? 'grid-cols-2'
    : type === 'phong'
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-visible relative" style={{ borderTop: `3px solid ${headerColor}` }}>
      {/* Compact Header with Dynamic Work Count */}
      <div 
        className="px-3 py-1.5 flex items-center justify-between text-white shadow-xs shrink-0 rounded-t-[10px]"
        style={{
          background: `linear-gradient(135deg, ${headerColor}, ${headerColor}ee)`,
          backgroundColor: headerColor
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-[12px] tracking-wider uppercase text-white/95 truncate drop-shadow-xs">{title}</h3>
        </div>

        {/* Dynamic Badge: Displays specific unit work when clicked, or total block work normally */}
        {activeUnitInBlock ? (
          <span 
            className="px-2.5 py-0.5 bg-white text-slate-800 dark:bg-slate-800 dark:text-emerald-300 rounded-full text-[10px] font-semibold shadow-xs shrink-0 flex items-center gap-1.5 border border-white/50 animate-in fade-in duration-200"
            title={`Đang chọn ${activeUnitInBlock.name}: ${unitTaskCounts[activeUnitInBlock.id] || 0} việc (Tổng khối: ${totalBlockTasks} việc)`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate max-w-[130px] font-medium">{activeUnitInBlock.name}:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{unitTaskCounts[activeUnitInBlock.id] || 0} việc</span>
          </span>
        ) : (
          <span 
            className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium text-white/95 shrink-0"
            title={`Tổng số lịch/công việc trong tuần của khối: ${totalBlockTasks} việc`}
          >
            {totalBlockTasks} việc
          </span>
        )}
      </div>

      {/* Cards Grid: Exactly 2 rows (top and bottom) */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-start">
        <div className={`grid gap-2 w-full ${gridColsClass}`}>
          {units.map((unit, index) => (
            <ModernCard
              key={unit.id}
              unit={unit}
              index={index}
              isSelected={selectedUnitId === unit.id}
              schedules={schedules}
              weekStartDateStr={weekStartDateStr}
              weekStartDate={weekStartDate}
              filterWorkType={filterWorkType}
              onClick={() => {
                onUnitClick?.(unit);
              }}
              onAddClick={(e) => handleAddClick(e, unit.fullName || unit.name)}
              handleEditClick={handleEditClick}
              onAddForMemberAndDay={(dayIndex, personName, session) => onAddForm(dayIndex, personName, session)}
              blockType={type}
            />
          ))}

          {/* Empty state when no units */}
          {units.length === 0 && (
            <div className="col-span-full py-6 text-center">
              <p className="font-medium text-slate-400 text-xs">Chưa có đơn vị</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Alternating colors for cards
const cardColors = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-orange-600',
];

interface MasterTableSection {
  title: string;
  color: string;
  units: any[];
}

const AllUnitsMasterTable: React.FC<{
  sections: MasterTableSection[];
  schedules: any[];
  weekStartDate: Date;
  weekStartDateStr: string;
  filterWorkType: string;
  onOpenAdd: (dayIndex?: number, unitName?: string, session?: 'MORNING' | 'AFTERNOON') => void;
  handleEditClick: (schedule: any) => void;
  onUnitSelect: (unit: any) => void;
}> = ({
  sections,
  schedules,
  weekStartDate,
  weekStartDateStr,
  filterWorkType,
  onOpenAdd,
  handleEditClick,
  onUnitSelect,
}) => {
  const dayDates = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map(offset => {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + offset);
      const dayNum = offset === 6 ? 0 : offset + 1; // 1 = T2, ..., 6 = T7, 0 = CN
      return {
        label: DAY_LABELS[offset],
        shortLabel: DAY_LABELS_SHORT[offset],
        dayOfWeek: dayNum,
        dayIndex: offset,
        formatted: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
      };
    });
  }, [weekStartDate]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#2d6e3e]" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Bảng Toàn Cảnh Lịch Công Tác Tuần - Tất Cả Các Đơn Vị & Lãnh Đạo
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Toàn bộ công việc hiển thị trực tiếp • Bấm vào công việc để xem chi tiết / chỉnh sửa
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-[#2d6e3e] text-white text-xs uppercase font-semibold">
              <th className="p-2.5 w-48 sticky left-0 z-20 bg-[#2d6e3e] shadow-[2px_0_4px_rgba(0,0,0,0.1)] border-r border-emerald-700">
                Đơn vị / Lãnh đạo
              </th>
              {dayDates.map(d => (
                <th key={d.dayOfWeek} className="p-2 text-center border-r border-emerald-700 last:border-r-0 min-w-[135px]">
                  <div>{d.label}</div>
                  <div className="text-[10px] font-normal opacity-90">{d.formatted}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {sections.map((section) => (
              <React.Fragment key={section.title}>
                {/* Tiêu đề phân khối */}
                <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-800 dark:text-slate-200">
                  <td colSpan={8} className="px-3 py-1.5 text-[11px] uppercase tracking-wider" style={{ borderLeft: `4px solid ${section.color}` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                      <span>{section.title}</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({section.units.length} đơn vị / cá nhân)</span>
                    </div>
                  </td>
                </tr>

                {/* Các dòng đơn vị */}
                {section.units.map((unit) => {
                  const unitScheds = getScheduleForUnit(unit, schedules, weekStartDate, filterWorkType);
                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Cột tên đơn vị sticky bên trái */}
                      <td 
                        onClick={() => onUnitSelect(unit)}
                        className="p-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.05)] border-r border-slate-200 dark:border-slate-800 cursor-pointer group"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {unit.name}
                        </div>
                        {unit.position && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{unit.position}</div>
                        )}
                        {!unit.position && unit.fullName && unit.fullName !== unit.name && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{unit.fullName}</div>
                        )}
                      </td>

                      {/* 7 Cột các ngày trong tuần */}
                      {dayDates.map(d => {
                        const dayTasks = unitScheds.filter(s => parseDayOfWeek(s.dayOfWeek) === d.dayOfWeek && isCustomWork(s));
                        const morningTasks = dayTasks.filter(s => normalizeSession(s.session) === 'MORNING');
                        const afternoonTasks = dayTasks.filter(s => normalizeSession(s.session) === 'AFTERNOON');

                        return (
                          <td key={d.dayOfWeek} className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 align-top group/cell relative">
                            {dayTasks.length > 0 ? (
                              <div className="space-y-1.5">
                                {morningTasks.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span>Sáng</span>
                                    </div>
                                    {morningTasks.map(t => (
                                      <div
                                        key={t.id}
                                        onClick={() => handleEditClick(t)}
                                        className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[10.5px] leading-snug cursor-pointer hover:bg-amber-100 transition-colors"
                                        title={`${t.personName ? t.personName + ': ' : ''}${t.title}${t.location ? ' [' + t.location + ']' : ''}`}
                                      >
                                        <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{t.title}</div>
                                        {t.location && (
                                          <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate mt-0.5">
                                            <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                                            <span className="truncate">{t.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {afternoonTasks.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      <span>Chiều</span>
                                    </div>
                                    {afternoonTasks.map(t => (
                                      <div
                                        key={t.id}
                                        onClick={() => handleEditClick(t)}
                                        className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-[10.5px] leading-snug cursor-pointer hover:bg-indigo-100 transition-colors"
                                        title={`${t.personName ? t.personName + ': ' : ''}${t.title}${t.location ? ' [' + t.location + ']' : ''}`}
                                      >
                                        <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{t.title}</div>
                                        {t.location && (
                                          <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate mt-0.5">
                                            <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                                            <span className="truncate">{t.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full min-h-[36px] flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-600 italic">
                                Tại cơ quan
                              </div>
                            )}

                            {/* Nút thêm nhanh khi hover */}
                            <button
                              onClick={() => onOpenAdd(d.dayIndex, unit.fullName || unit.name)}
                              className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 p-0.5 bg-white dark:bg-slate-700 text-slate-600 hover:text-emerald-700 rounded border border-slate-200 dark:border-slate-600 shadow-2xs transition-all"
                              title="Thêm lịch cho ngày này"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export const WeeklyWorkSchedule: React.FC<{
  users: UserType[];
  schedules: any[];
  currentUser?: UserType | null;
  globalRole?: string;
  onAddSchedule: (item: any) => void;
  onUpdateSchedule: (id: string, updated: any) => void;
  onDeleteSchedule: (id: string) => void;
  onBatchSaveSchedules?: (items: any[]) => void;
  onClearWeekSchedules?: (weekStartDate: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}> = ({
  users,
  schedules,
  currentUser,
  globalRole,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onBatchSaveSchedules,
  onClearWeekSchedules,
  addToast
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [viewMode, setViewMode] = useState<'BLOCKS' | 'FULL_TABLE'>('BLOCKS');
  const [filterWorkType, setFilterWorkType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drillDown, setDrillDown] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [targetUploadDept, setTargetUploadDept] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDept = useMemo(() => {
    if (!currentUser) return '';
    return currentUser.department || currentUser.workUnit || '';
  }, [currentUser]);

  const isAdminOrLeader = useMemo(() => {
    if (!currentUser) return true;
    return currentUser.role === 'ADMIN' || 
           currentUser.role === 'PROVINCE_LEADER' || 
           globalRole === 'ADMIN' || 
           globalRole === 'PROVINCE_LEADER' ||
           deptMatch(currentUser.department, 'Ban Lãnh đạo');
  }, [currentUser, globalRole]);

  const isStaff = globalRole === 'STAFF';

  const weekStartDate = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentWeekStart]);

  const weekEndDate = useMemo(() => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStartDate]);

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStartDate]);

  const weekStartDateStr = toLocalDateString(weekStartDate);

  const leaderUnits = useMemo(() => {
    // Chỉ hiển thị đúng 4 lãnh đạo của tỉnh (xóa các lãnh đạo/người dùng khác khỏi khối ban lãnh đạo)
    return DEFAULT_LEADERS.map((leader) => {
      const userMatch = users.find(u => isPersonMatch(u.fullName, leader.name));
      const leaderMember: UserType = userMatch || {
        id: `leader_${leader.name}`,
        username: `leader_${leader.name}`,
        fullName: leader.name,
        position: leader.position,
        department: leader.unitName,
        workUnit: 'Thống kê tỉnh',
        role: 'PROVINCE_LEADER',
        createdAt: new Date().toISOString()
      };

      return {
        id: `leader_${leader.name}`,
        name: leader.name,
        position: leader.position,
        fullName: leader.name,
        color: LEADER_COLOR,
        members: [leaderMember],
        allSchedules: schedules.filter(s => isSameWeek(s.weekStartDate, weekStartDate) && (
          isPersonMatch(s.personName, leader.name) ||
          (leader.name === 'Vũ Tuấn Hùng' && (isPersonMatch(s.personName, 'Nguyễn Văn Nam') || isPersonMatch(s.personName, 'Vũ Thị Minh')))
        ))
      };
    });
  }, [users, schedules, weekStartDate]);

  const vung1Units = useMemo(() => {
    return VUNG1_UNITS.map(name => {
      const fullName = `Thống kê cơ sở ${name}`;
      const members = users.filter(u => 
        deptMatch(u.department, fullName) || 
        deptMatch(u.workUnit, fullName) || 
        deptMatch(u.department, name) || 
        deptMatch(u.workUnit, name)
      );
      const memberNames = new Set(members.map(m => m.fullName.toLowerCase().trim()));
      return {
        id: `vung1_${name}`,
        name,
        fullName,
        color: VUNG1_COLOR,
        members,
        allSchedules: schedules.filter(s => isSameWeek(s.weekStartDate, weekStartDate) && (
          members.some(m => isPersonMatch(s.personName, m.fullName)) || deptMatch(s.unitName, fullName) || deptMatch(s.unitName, name)
        ))
      };
    });
  }, [users, schedules, weekStartDate]);

  const phongUnits = useMemo(() => {
    return PHONG_UNITS.map(p => {
      const members = users.filter(u => 
        deptMatch(u.department, p.full) || 
        deptMatch(u.workUnit, p.full) || 
        deptMatch(u.department, p.short) || 
        deptMatch(u.workUnit, p.short)
      );
      return {
        id: `phong_${p.full}`,
        name: p.short,
        fullName: p.full,
        color: PHONG_COLOR,
        members,
        allSchedules: schedules.filter(s => isSameWeek(s.weekStartDate, weekStartDate) && (
          members.some(m => isPersonMatch(s.personName, m.fullName)) || deptMatch(s.unitName, p.full) || deptMatch(s.unitName, p.short)
        ))
      };
    });
  }, [users, schedules, weekStartDate]);

  const vung2Units = useMemo(() => {
    return VUNG2_UNITS.map(name => {
      const fullName = `Thống kê cơ sở ${name}`;
      const members = users.filter(u => 
        deptMatch(u.department, fullName) || 
        deptMatch(u.workUnit, fullName) || 
        deptMatch(u.department, name) || 
        deptMatch(u.workUnit, name)
      );
      return {
        id: `vung2_${name}`,
        name,
        fullName,
        color: VUNG2_COLOR,
        members,
        allSchedules: schedules.filter(s => isSameWeek(s.weekStartDate, weekStartDate) && (
          members.some(m => isPersonMatch(s.personName, m.fullName)) || deptMatch(s.unitName, fullName) || deptMatch(s.unitName, name)
        ))
      };
    });
  }, [users, schedules, weekStartDate]);

  const allUnits = useMemo(() => [
    ...leaderUnits,
    ...phongUnits,
    ...vung1Units,
    ...vung2Units
  ], [leaderUnits, phongUnits, vung1Units, vung2Units]);

  // Dynamically resolved selected unit (always syncs with new schedules & week changes)
  const selectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return allUnits.find(u => u.id === selectedUnitId) || null;
  }, [selectedUnitId, allUnits]);

  const effectiveMembers = useMemo(() => {
    if (!selectedUnit) return [];
    const list = [...selectedUnit.members];
    const knownNames = new Set(list.map(m => normName(m.fullName)));

    // Include any person having schedules for this unit this week
    const unitSchedules = schedules.filter(s => 
      isSameWeek(s.weekStartDate, weekStartDate) && (
        deptMatch(s.unitName || '', selectedUnit.fullName || selectedUnit.name) ||
        deptMatch(s.unitName || '', selectedUnit.name) ||
        isPersonMatch(s.personName || '', selectedUnit.name) ||
        isPersonMatch(s.personName || '', selectedUnit.fullName || '')
      )
    );

    unitSchedules.forEach(s => {
      const pName = (s.personName || '').trim();
      if (pName && !knownNames.has(normName(pName))) {
        knownNames.add(normName(pName));
        list.push({
          id: `sched_user_${normName(pName)}`,
          username: `user_${normName(pName)}`,
          fullName: pName,
          position: s.personRole || 'Cán bộ',
          department: selectedUnit.fullName || selectedUnit.name,
          workUnit: selectedUnit.name,
          role: 'STAFF',
          createdAt: new Date().toISOString()
        });
      }
    });

    return list;
  }, [selectedUnit, schedules, weekStartDate]);

  const handleUnitClick = useCallback((unit: any) => {
    setSelectedUnitId(prev => prev === unit.id ? null : unit.id);
  }, []);

  const getSchedulesForUnit = useCallback((unitName: string, unitMembers: UserType[]) => {
    const memberNames = new Set(unitMembers.map(m => m.fullName.toLowerCase().trim()));
    return schedules.filter(s => {
      if (!isSameWeek(s.weekStartDate, weekStartDate)) return false;
      const sPerson = (s.personName || '').toLowerCase().trim();
      const sUnit = s.unitName || '';
      if (memberNames.size > 0 && memberNames.has(sPerson)) return true;
      if (deptMatch(sUnit, unitName)) return true;
      if (sPerson === unitName.toLowerCase().trim()) return true;
      return false;
    }).filter(s => {
      if (filterWorkType !== 'ALL' && s.workType !== filterWorkType) return false;
      return true;
    }).sort((a, b) => {
      const dayA = parseDayOfWeek(a.dayOfWeek);
      const dayB = parseDayOfWeek(b.dayOfWeek);
      if (dayA !== dayB) return dayA - dayB;
      return a.session === 'MORNING' ? -1 : 1;
    });
  }, [schedules, weekStartDate, filterWorkType]);

  const handlePrevWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const handleEditClick = (schedule: any) => {
    setEditingId(schedule.id || '');
    setAddForm({ ...schedule });
    setShowAddForm(true);
  };

  const handleSaveEdit = (scheduleId: string) => {
    const workType = addForm.workType || 'MEETING';
    const title = addForm.title?.trim() || WORK_TYPE_LABELS_VN[workType as keyof typeof WORK_TYPE_LABELS_VN] || 'Lịch công tác';
    const personName = addForm.personName?.trim() || currentUser?.fullName || 'Cán bộ';
    const weekStart = addForm.weekStartDate || weekStartDateStr;
    const dayOfWeek = parseDayOfWeek(addForm.dayOfWeek !== undefined ? addForm.dayOfWeek : 1);

    onUpdateSchedule(scheduleId, { 
      ...addForm,
      id: scheduleId,
      title,
      personName,
      workType,
      weekStartDate: weekStart,
      dayOfWeek,
      updatedAt: new Date().toISOString() 
    });
    setEditingId(null);
    setAddForm({});
    setShowAddForm(false);
    addToast('success', 'Thành công', 'Đã cập nhật lịch công tác');
  };

  const handleAddSchedule = () => {
    const workType = addForm.workType || 'MEETING';
    const title = addForm.title?.trim() || WORK_TYPE_LABELS_VN[workType as keyof typeof WORK_TYPE_LABELS_VN] || 'Lịch công tác';
    const personName = addForm.personName?.trim() || currentUser?.fullName || 'Cán bộ';
    const weekStart = addForm.weekStartDate || weekStartDateStr;
    const dayOfWeek = parseDayOfWeek(addForm.dayOfWeek !== undefined ? addForm.dayOfWeek : 1);
    
    const newSchedule = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      weekStartDate: weekStart,
      dayOfWeek,
      session: addForm.session || 'MORNING',
      personName,
      personRole: addForm.personRole || currentUser?.position || '',
      unitName: addForm.unitName || currentUser?.department || currentUser?.workUnit || userDept || 'Cơ quan',
      title,
      workType,
      location: addForm.location || '',
      participants: addForm.participants || '',
      notes: addForm.notes || '',
      createdAt: new Date().toISOString()
    };

    onAddSchedule(newSchedule);
    setShowAddForm(false);
    setAddForm({});
    setEditingId(null);
    addToast('success', 'Thành công', `Đã thêm lịch: ${title} cho ${personName}`);
  };

  const openAddForm = (dayIndex?: number, unitName?: string, session?: 'MORNING' | 'AFTERNOON') => {
    const dayNum = dayIndex !== undefined ? (dayIndex === 6 ? 0 : dayIndex + 1) : 1;
    const initialForm: any = {
      weekStartDate: weekStartDateStr,
      dayOfWeek: dayNum,
      session: session || 'MORNING',
      workType: 'MEETING',
      title: '',
      location: '',
      personName: '',
      personRole: '',
      unitName: '',
    };

    if (unitName) {
      // 1. Check if unitName is one of the Leaders (e.g. Phạm Văn Tự / Phạm Văn Tụ)
      const leaderMatch = DEFAULT_LEADERS.find(l => isPersonMatch(l.name, unitName));
      if (leaderMatch) {
        initialForm.personName = leaderMatch.name;
        initialForm.personRole = leaderMatch.position;
        initialForm.unitName = leaderMatch.unitName;
      } else {
        // 2. Check if unitName is an exact or matching user in system
        const exactUser = users.find(u => isPersonMatch(u.fullName, unitName));
        if (exactUser) {
          initialForm.personName = exactUser.fullName;
          initialForm.personRole = exactUser.position || 'Cán bộ';
          initialForm.unitName = exactUser.department || exactUser.workUnit || '';
        } else {
          // 3. unitName is a department/unit (e.g. "Phố Hiến", "Phòng Thống kê Tổng hợp")
          initialForm.unitName = unitName;
          const unitUsers = users.filter(u => deptMatch(u.fullName, unitName) || deptMatch(u.department, unitName) || deptMatch(u.workUnit, unitName));
          if (currentUser && unitUsers.some(u => isPersonMatch(u.fullName, currentUser.fullName))) {
            initialForm.personName = currentUser.fullName;
            initialForm.personRole = currentUser.position || 'Cán bộ';
          } else if (unitUsers[0]) {
            initialForm.personName = unitUsers[0].fullName;
            initialForm.personRole = unitUsers[0].position || 'Cán bộ';
          } else {
            initialForm.personName = currentUser?.fullName || 'Cán bộ';
            initialForm.personRole = currentUser?.position || '';
          }
        }
      }
    } else if (currentUser) {
      initialForm.personName = currentUser.fullName;
      initialForm.personRole = currentUser.position || '';
      initialForm.unitName = currentUser.department || currentUser.workUnit || '';
    }

    setAddForm(initialForm);
    setShowAddForm(true);
    setEditingId(null);
  };

  const openEditForm = (schedule: any) => {
    setAddForm({ ...schedule });
    setShowAddForm(true);
    setEditingId(schedule.id);
  };

  const handleMatrixCellClick = (unitName: string, unitMembers: UserType[], dayIndex: number, session: 'MORNING' | 'AFTERNOON') => {
    const dayOfWeek = (dayIndex + 1) % 7;
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    const daySchedules = schedules.filter(s => {
      if (s.weekStartDate !== weekStartDateStr) return false;
      if (s.dayOfWeek !== dayOfWeek) return false;
      if (s.session !== session) return false;
      if (!memberNames.has(s.personName)) return false;
      return true;
    });
    
    if (daySchedules.length > 0) {
      const unitMembersFiltered = unitMembers.filter(u => daySchedules.some(s => s.personName === u.fullName));
      setDrillDown({ unitName, unitMembers: unitMembersFiltered, dayIndex, session: SESSION_LABELS[session], schedules: daySchedules });
    } else {
      openAddForm(dayIndex, unitName, session);
    }
  };

  const handleClearWeek = () => {
    if (confirm(`Xóa toàn bộ lịch tuần ${formatWeekRange(weekStartDate)}?`)) {
      onClearWeekSchedules(weekStartDateStr);
      addToast('success', 'Đã xóa', 'Đã xóa toàn bộ lịch tuần này');
    }
  };

  const downloadDepartmentTemplate = useCallback((unitName?: string) => {
    const selectedUnit = unitName || userDept || 'Ban Lãnh đạo';
    let personnelList: Array<{ name: string; position: string }> = [];

    if (deptMatch(selectedUnit, 'Ban Lãnh đạo') || selectedUnit.toLowerCase().includes('lãnh đạo')) {
      personnelList = DEFAULT_LEADERS.map(l => ({ name: l.name, position: l.position }));
    } else {
      // Find matching users in users list
      const matchedMembers = users.filter(u => 
        deptMatch(u.department, selectedUnit) || 
        deptMatch(u.workUnit, selectedUnit) ||
        (selectedUnit.includes('Phòng') && deptMatch(u.department, selectedUnit.replace('Phòng ', '')))
      );

      if (matchedMembers.length > 0) {
        personnelList = matchedMembers.map(m => ({
          name: m.fullName,
          position: m.position || 'Thống kê viên'
        }));
      } else {
        personnelList = [
          { name: 'Đ/c Trưởng đơn vị', position: 'Trưởng phòng / Trưởng đơn vị' },
          { name: 'Đ/c Phó đơn vị', position: 'Phó phòng / Phó đơn vị' },
          { name: 'Đ/c Chuyên viên 1', position: 'Thống kê viên' },
          { name: 'Đ/c Chuyên viên 2', position: 'Thống kê viên' }
        ];
      }
    }

    const headers = [
      'Ngày',
      'Buổi',
      ...personnelList.map(p => `${p.name}\n(${p.position})`)
    ];

    const sampleRows: string[][] = [];
    const days = [
      { name: 'Thứ 2', dayNum: 1 },
      { name: 'Thứ 3', dayNum: 2 },
      { name: 'Thứ 4', dayNum: 3 },
      { name: 'Thứ 5', dayNum: 4 },
      { name: 'Thứ 6', dayNum: 5 },
      { name: 'Thứ 7', dayNum: 6 },
      { name: 'Chủ nhật', dayNum: 0 }
    ];

    days.forEach((day, dIdx) => {
      // Sáng row
      const morningRow: string[] = [day.name, 'Sáng'];
      personnelList.forEach((_, pIdx) => {
        if (dIdx === 2 && pIdx === 0) {
          morningRow.push('🚨 Họp BCH, Họp giao ban (8h00)\n📍 Trụ sở chính');
        } else if (dIdx === 3 && pIdx === 1) {
          morningRow.push('🚨 Họp UBND tỉnh (8h00)\n📍 P207 UBND tỉnh');
        } else if (dIdx === 4 && pIdx === 2) {
          morningRow.push('Kiểm tra cơ sở (8h00)\n📍 Thống kê cơ sở');
        } else {
          morningRow.push('Làm việc cơ quan');
        }
      });
      sampleRows.push(morningRow);

      // Chiều row
      const afternoonRow: string[] = ['', 'Chiều'];
      personnelList.forEach((_, pIdx) => {
        if (dIdx === 3 && pIdx === 0) {
          afternoonRow.push('🚨 Họp trực tuyến Cục TK (14h00)\n📍 Phòng họp');
        } else {
          afternoonRow.push('Làm việc cơ quan');
        }
      });
      sampleRows.push(afternoonRow);
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 10 },
      ...personnelList.map(() => ({ wch: 38 }))
    ];

    const wb = XLSX.utils.book_new();
    const cleanSheetName = selectedUnit.replace(/[\/\\?*:[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName || 'Lich_Tuan');
    const safeFileName = selectedUnit.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '');
    XLSX.writeFile(wb, `Mau_Lich_Tuan_${safeFileName}_${weekStartDateStr}.xlsx`);
    addToast('success', 'Tải file mẫu thành công', `Đã tải mẫu Excel cho ${selectedUnit}`);
  }, [userDept, users, weekStartDateStr, addToast]);

  const downloadTemplate = useCallback(() => {
    downloadDepartmentTemplate(userDept || 'Ban Lãnh đạo');
  }, [downloadDepartmentTemplate, userDept]);

  const downloadMatrixTemplate = useCallback(() => {
    downloadDepartmentTemplate(userDept || 'Ban Lãnh đạo');
  }, [downloadDepartmentTemplate, userDept]);

  const exportToExcel = useCallback(() => {
    if (schedules.length === 0) {
      addToast('warning', 'Cảnh báo', 'Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'Tuần (Thứ 2)',
      'Thứ',
      'Buổi',
      'Nhân sự',
      'Chức vụ',
      'Đơn vị',
      'Tiêu đề',
      'Loại công việc',
      'Địa điểm',
      'Thành phần',
      'Ghi chú'
    ];

    const data = schedules.map(s => [
      s.weekStartDate,
      s.dayOfWeek.toString(),
      s.session,
      s.personName,
      s.personRole || '',
      s.unitName || '',
      s.title,
      s.workType || '',
      s.location || '',
      s.participants || '',
      s.notes || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch công tác tuần');
    XLSX.writeFile(wb, `Lich_Cong_Tac_Tuan_${weekStartDateStr}.xlsx`);
    addToast('success', 'Thành công', `Đã xuất ${data.length} bản ghi ra Excel`);
  }, [schedules, weekStartDateStr, addToast]);

  const parseMatrixFormat = useCallback((jsonData: string[][], defaultUnitName?: string) => {
    if (jsonData.length < 2) return null;
    
    // Find header row (usually row 0, or within first 10 rows)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i] || [];
      const rowStr = row.join(' ').toLowerCase();
      if ((rowStr.includes('ngày') || rowStr.includes('thứ') || rowStr.includes('date')) && 
          (rowStr.includes('buổi') || rowStr.includes('sáng') || rowStr.includes('chiều') || rowStr.includes('session'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      if (jsonData[0]?.length >= 3) headerRowIdx = 0;
      else return null;
    }

    const headerRow = jsonData[headerRowIdx] as string[];
    const personCols: Array<{ index: number; name: string; position: string; matchedUser?: UserType }> = [];
    
    for (let c = 2; c < headerRow.length; c++) {
      const colHeader = String(headerRow[c] || '').trim();
      if (!colHeader) continue;
      
      const cleanName = colHeader.split('\n')[0].replace(/\(.*?\)/g, '').trim();
      const posMatch = colHeader.match(/\((.*?)\)/);
      const position = posMatch ? posMatch[1].trim() : '';
      
      const matched = users.find(u => 
        deptMatch(u.fullName, cleanName) || 
        u.fullName.toLowerCase().trim() === cleanName.toLowerCase()
      );

      personCols.push({
        index: c,
        name: matched ? matched.fullName : cleanName,
        position: matched?.position || position || '',
        matchedUser: matched
      });
    }

    if (personCols.length === 0) return null;

    const dataRows = jsonData.slice(headerRowIdx + 1);
    const result: any[] = [];
    let currentDayOfWeek = 1;

    dataRows.forEach((row) => {
      const dayCell = String(row[0] || '').trim();
      const sessionCell = String(row[1] || '').trim().toLowerCase();

      if (dayCell) {
        currentDayOfWeek = parseDayOfWeek(dayCell);
      }

      let sessionKey: 'MORNING' | 'AFTERNOON' = 'MORNING';
      if (sessionCell.includes('chiều') || sessionCell.includes('afternoon') || sessionCell.includes('pm') || sessionCell === 'c') {
        sessionKey = 'AFTERNOON';
      } else if (sessionCell.includes('sáng') || sessionCell.includes('morning') || sessionCell.includes('am') || sessionCell === 's') {
        sessionKey = 'MORNING';
      } else if (!sessionCell && dayCell.toLowerCase().includes('chiều')) {
        sessionKey = 'AFTERNOON';
      }

      personCols.forEach(pCol => {
        const cellVal = String(row[pCol.index] || '').trim();
        if (!cellVal || cellVal === '—' || cellVal === '-') return;

        const normalizedVal = cellVal.toLowerCase();
        if (
          normalizedVal === 'làm việc cơ quan' || 
          normalizedVal === 'làm việc tại cơ quan' || 
          normalizedVal === 'tại cơ quan' ||
          normalizedVal === 'tại cq' ||
          normalizedVal === 'lv cq' ||
          normalizedVal === 'lv cơ quan' ||
          normalizedVal === 'cơ quan' ||
          normalizedVal === 'co quan'
        ) {
          return;
        }

        const lines = cellVal.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let location = '';
        const titleLines: string[] = [];

        lines.forEach(line => {
          if (
            line.includes('📍') || 
            line.includes('') || 
            line.toLowerCase().startsWith('tại:') || 
            line.toLowerCase().startsWith('tại ') ||
            line.toLowerCase().startsWith('địa điểm:') ||
            /^p\d+/i.test(line) ||
            line.toLowerCase().startsWith('trụ sở') ||
            line.toLowerCase().startsWith('ubnd') ||
            line.toLowerCase().startsWith('hội trường') ||
            line.toLowerCase().startsWith('phòng họp') ||
            line.toLowerCase().startsWith('ht ')
          ) {
            location = line.replace(/[📍]/g, '').replace(/^(tại:|địa điểm:)\s*/i, '').trim();
          } else {
            titleLines.push(line.replace(/^[🚨📌⏰⚡📍]\s*/g, '').trim());
          }
        });

        const title = titleLines.join(' - ') || cellVal.replace(/^[🚨📌⏰⚡📍]\s*/g, '').trim();

        let workType = 'OFFICE';
        const checkStr = cellVal.toLowerCase();
        if (
          checkStr.includes('họp') || 
          checkStr.includes('hội nghị') || 
          checkStr.includes('giao ban') || 
          checkStr.includes('bch') || 
          checkStr.includes('đảng ủy') || 
          checkStr.includes('lễ kỷ niệm') || 
          checkStr.includes('lễ') || 
          checkStr.includes('ubnd') || 
          checkStr.includes('tập huấn')
        ) {
          workType = 'MEETING';
        } else if (
          checkStr.includes('công tác') || 
          checkStr.includes('kiểm tra') || 
          checkStr.includes('khảo sát') || 
          checkStr.includes('cơ sở') || 
          checkStr.includes('thanh tra') ||
          checkStr.includes('đi ')
        ) {
          workType = 'OUTSIDE';
        } else if (
          checkStr.includes('nghỉ') || 
          checkStr.includes('phép') || 
          checkStr.includes('off')
        ) {
          workType = 'OFF';
        }

        const resolvedUnit = defaultUnitName || 
          pCol.matchedUser?.department || 
          pCol.matchedUser?.workUnit || 
          (DEFAULT_LEADERS.some(l => l.name === pCol.name) ? 'Ban Lãnh đạo' : userDept) || 
          'Đơn vị';

        result.push({
          id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          weekStartDate: weekStartDateStr,
          dayOfWeek: currentDayOfWeek,
          session: sessionKey,
          personName: pCol.name,
          personRole: pCol.position,
          unitName: resolvedUnit,
          title,
          location,
          workType,
          createdAt: new Date().toISOString()
        });
      });
    });

    return result.length > 0 ? result : null;
  }, [users, userDept, weekStartDateStr]);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // First attempt: Matrix format
        const matrixData = parseMatrixFormat(jsonData as string[][], targetUploadDept || userDept);
        
        if (matrixData && matrixData.length > 0) {
          const items = matrixData.map((cell, idx) => ({
            id: cell.id || `ws_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
            weekStartDate: toLocalDateString(cell.weekStartDate || weekStartDateStr),
            dayOfWeek: parseDayOfWeek(cell.dayOfWeek),
            session: cell.session,
            personName: cell.personName,
            personRole: cell.personRole,
            unitName: cell.unitName,
            title: cell.title,
            workType: cell.workType,
            location: cell.location,
            createdAt: new Date().toISOString()
          }));

          if (onBatchSaveSchedules) {
            onBatchSaveSchedules(items);
          } else {
            items.forEach(item => onAddSchedule(item));
          }

          addToast('success', 'Nhập lịch tuần thành công', `Đã ghi nhận ${items.length} lịch công tác/họp phát sinh vào tuần`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTargetUploadDept('');
          return;
        }

        // Second attempt: Standard tabular list format
        const headers = (jsonData[0] as string[]) || [];
        const rows = jsonData.slice(1) as string[][];

        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => {
          const normalized = String(h).toLowerCase().trim();
          if (normalized.includes('tuần') || normalized.includes('thứ 2')) colMap.weekStartDate = i;
          else if (normalized.includes('thứ') && !normalized.includes('tuần')) colMap.dayOfWeek = i;
          else if (normalized.includes('buổi')) colMap.session = i;
          else if (normalized.includes('nhân sự') || normalized.includes('tên')) colMap.personName = i;
          else if (normalized.includes('chức vụ')) colMap.personRole = i;
          else if (normalized.includes('đơn vị') || normalized.includes('phòng')) colMap.unitName = i;
          else if (normalized.includes('tiêu đề') || normalized.includes('nội dung')) colMap.title = i;
          else if (normalized.includes('loại')) colMap.workType = i;
          else if (normalized.includes('địa điểm')) colMap.location = i;
          else if (normalized.includes('thành phần')) colMap.participants = i;
          else if (normalized.includes('ghi chú')) colMap.notes = i;
        });

        const items = rows.map((row, idx) => ({
          id: `ws_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
          weekStartDate: toLocalDateString(row[colMap.weekStartDate]?.toString().trim() || weekStartDateStr),
          dayOfWeek: parseDayOfWeek(row[colMap.dayOfWeek]?.toString().trim() || '1'),
          session: row[colMap.session]?.toString().trim() || 'MORNING',
          personName: row[colMap.personName]?.toString().trim() || '',
          personRole: row[colMap.personRole]?.toString().trim() || '',
          unitName: row[colMap.unitName]?.toString().trim() || userDept || '',
          title: row[colMap.title]?.toString().trim() || '',
          workType: row[colMap.workType]?.toString().trim() || 'OFFICE',
          location: row[colMap.location]?.toString().trim() || '',
          participants: row[colMap.participants]?.toString().trim() || '',
          notes: row[colMap.notes]?.toString().trim() || '',
          createdAt: new Date().toISOString(),
        })).filter(item => item.title && item.personName);

        if (items.length === 0) {
          addToast('error', 'Không tìm thấy lịch phát sinh', 'File không có lịch họp/công tác phát sinh hoặc toàn bộ là làm việc cơ quan.');
          return;
        }

        if (onBatchSaveSchedules) {
          onBatchSaveSchedules(items);
        } else {
          items.forEach(item => onAddSchedule(item));
        }

        addToast('success', 'Nhập thành công', `Đã nhập ${items.length} lịch công tác`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTargetUploadDept('');
      } catch (err) {
        console.error('Import error:', err);
        addToast('error', 'Lỗi đọc file', 'File Excel không hợp lệ hoặc bị lỗi định dạng');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [parseMatrixFormat, targetUploadDept, userDept, onBatchSaveSchedules, onAddSchedule, weekStartDateStr, addToast]);

  const triggerFileImport = (deptName?: string) => {
    if (deptName) {
      setTargetUploadDept(deptName);
    }
    fileInputRef.current?.click();
  };

  if (showAddForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              {editingId ? 'Chỉnh sửa lịch công tác' : 'Thêm lịch công tác mới'}
            </h3>
            <button onClick={() => { setShowAddForm(false); setAddForm({}); setEditingId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Logged in user info banner */}
            {currentUser && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#2d6e3e] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-[#2d6e3e] dark:text-emerald-300">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {currentUser.position || 'Cán bộ'} • {currentUser.department || currentUser.workUnit || 'Cơ quan'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-white/90 dark:bg-slate-800 text-[#2d6e3e] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                  Tài khoản đăng nhập
                </span>
              </div>
            )}

            {/* Quick user picker from personnel list */}
            <div>
              <label className="block text-xs font-semibold text-[#2d6e3e] dark:text-emerald-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>Chọn nhanh từ Danh sách nhân sự</span>
              </label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  const selected = users.find(u => u.fullName === val);
                  if (selected) {
                    setAddForm(prev => ({
                      ...prev,
                      personName: selected.fullName,
                      personRole: selected.position || 'Cán bộ',
                      unitName: selected.department || selected.workUnit || 'Cơ quan',
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-[#2d6e3e]/40 dark:border-emerald-700 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-[#2d6e3e]"
                defaultValue=""
              >
                <option value="" disabled>-- Chọn nhanh Lãnh đạo hoặc Cán bộ --</option>
                {DEFAULT_LEADERS.length > 0 && (
                  <optgroup label="Ban Lãnh đạo">
                    {DEFAULT_LEADERS.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.position} ({l.unitName})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Danh sách Cán bộ / Nhân sự">
                  {users.map(u => (
                    <option key={u.id || u.fullName} value={u.fullName}>
                      {u.fullName} — {u.position || 'Cán bộ'} ({u.department || u.workUnit || 'Chưa phân bổ'})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên nhân sự</label>
                <input
                  type="text"
                  value={addForm.personName || ''}
                  onChange={(e) => setAddForm(prev => ({ ...prev, personName: e.target.value }))}
                  placeholder="Nhập hoặc chọn nhân sự"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chức vụ</label>
                <input
                  type="text"
                  value={addForm.personRole || ''}
                  onChange={(e) => setAddForm(prev => ({ ...prev, personRole: e.target.value }))}
                  placeholder="Chức vụ"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phòng ban / Đơn vị</label>
              <select
                value={addForm.unitName || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, unitName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="">-- Chọn phòng ban / đơn vị --</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tuần (Thứ 2)</label>
                <input
                  type="date"
                  value={addForm.weekStartDate || ''}
                  onChange={(e) => setAddForm(prev => ({ ...prev, weekStartDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thứ trong tuần</label>
                <select
                  value={addForm.dayOfWeek !== undefined ? addForm.dayOfWeek : 1}
                  onChange={(e) => setAddForm(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value={1}>Thứ 2</option>
                  <option value={2}>Thứ 3</option>
                  <option value={3}>Thứ 4</option>
                  <option value={4}>Thứ 5</option>
                  <option value={5}>Thứ 6</option>
                  <option value={6}>Thứ 7</option>
                  <option value={0}>Chủ Nhật</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Buổi</label>
              <select
                value={addForm.session || 'MORNING'}
                onChange={(e) => setAddForm(prev => ({ ...prev, session: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="MORNING">Sáng</option>
                <option value="AFTERNOON">Chiều</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề công việc</label>
              <input
                type="text"
                value={addForm.title || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="VD: Làm việc tại cơ quan / Họp giao ban / Công tác..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Loại công việc</label>
              <select
                value={addForm.workType || 'OFFICE'}
                onChange={(e) => setAddForm(prev => ({ ...prev, workType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="OFFICE">Làm việc tại cơ quan</option>
                <option value="OUTSIDE">Công tác ngoài</option>
                <option value="MEETING">Họp/Hội nghị</option>
                <option value="OFF">Nghỉ/Off</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Địa điểm</label>
              <input
                type="text"
                value={addForm.location || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="VD: Tại cơ quan, Phòng họp A..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thành phần tham gia</label>
              <input
                type="text"
                value={addForm.participants || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, participants: e.target.value }))}
                placeholder="VD: Ban Lãnh đạo, Toàn thể cán bộ..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
              <textarea
                value={addForm.notes || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú thêm..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => {
                  if (editingId) {
                    handleSaveEdit(editingId);
                  } else {
                    handleAddSchedule();
                  }
                }} 
                className="flex-1 px-4 py-2 bg-[#2d6e3e] hover:bg-[#1e4d2b] text-white rounded-lg font-medium text-xs transition-colors shadow-xs"
              >
                {editingId ? 'Lưu thay đổi' : 'Thêm lịch'}
              </button>
              <button 
                onClick={() => { setShowAddForm(false); setAddForm({}); setEditingId(null); }} 
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium text-xs transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3ef] p-2 font-sans">
      <div className="w-full mx-auto space-y-4">
        
        {/* ===== TOP HEADER ===== */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
                <span>Lịch Công tác tuần</span>
              </h2>
              
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={currentWeekStart.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selected = new Date(e.target.value);
                    const day = selected.getDay();
                    const diff = selected.getDate() - day + (day === 0 ? -6 : 1);
                    setCurrentWeekStart(new Date(selected.setDate(diff)));
                  }}
                  className="bg-transparent border-none outline-none text-sm font-medium text-slate-800 dark:text-slate-200 w-auto min-w-[150px]"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần trước">
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[180px] text-center">
                  {formatWeekRange(weekStartDate)}
                </span>
                <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần sau">
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button onClick={handleThisWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium text-slate-600 dark:text-slate-400" title="Tuần này">
                  Tuần này
                </button>
              </div>

              {/* Chế độ xem: Khối Thẻ / Bảng Toàn Cảnh */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('BLOCKS')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'BLOCKS'
                      ? 'bg-white dark:bg-slate-700 text-[#2d6e3e] dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Hiển thị theo 4 khối đơn vị (danh sách công việc hiển thị trực tiếp trên thẻ)"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Dạng Khối Đơn Vị</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('FULL_TABLE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'FULL_TABLE'
                      ? 'bg-white dark:bg-slate-700 text-[#2d6e3e] dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Xem toàn cảnh 1 lần ra hết công việc của tất cả các đơn vị và lãnh đạo"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Bảng Toàn Cảnh (Tất cả đơn vị)</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Main Upload Button - Tailored to logged in user's department */}
              <button 
                onClick={() => triggerFileImport(userDept || '')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d6e3e] hover:bg-[#235832] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all"
                title={`Tải lên lịch tuần dạng Excel ma trận cho ${userDept || 'đơn vị'}`}
              >
                <UploadIcon className="w-4 h-4 text-emerald-200" />
                <span>Tải lên lịch tuần {userDept ? `(${userDept})` : ''}</span>
              </button>

              {/* Download Department Template Button */}
              <button 
                onClick={() => downloadDepartmentTemplate(userDept || 'Ban Lãnh đạo')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                title={`Tải file mẫu Excel lịch tuần có sẵn danh sách nhân sự của ${userDept || 'Ban Lãnh đạo'}`}
              >
                <DownloadIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>File mẫu {userDept ? `(${userDept})` : 'mẫu'}</span>
              </button>

              {/* Template selector for other departments (only for Admin & Leaders) */}
              {!isStaff && (
                <button 
                  onClick={() => setShowTemplateModal(true)}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Chọn tải mẫu hoặc tải lên cho các phòng ban / cơ sở khác"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Chọn đơn vị khác</span>
                </button>
              )}

              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" />

              <button 
                onClick={exportToExcel} 
                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg transition-colors" 
                title="Xuất dữ liệu lịch tuần ra file Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              {!isStaff && (
                <button 
                  onClick={handleClearWeek} 
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors" 
                  title="Xóa toàn bộ lịch của tuần này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'BLOCKS' ? (
          /* 2-COLUMN PROPORTIONAL LAYOUT (LEFT: 5/12 for KHỐI 1 & 3, RIGHT: 7/12 for KHỐI 2 & 4) */
          <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
            {/* CỘT TRÁI (5/12): KHỐI 1 (LÃNH ĐẠO) & KHỐI 3 (PHÒNG THỐNG KÊ) */}
            <div className="xl:col-span-5 flex flex-col gap-3.5 h-full">
              <div className="flex-1 flex flex-col">
                <SectionBlock
                  title="Ban Lãnh Đạo"
                  icon={<Users className="w-4 h-4" />}
                  headerColor={LEADER_COLOR}
                  units={leaderUnits}
                  color={LEADER_COLOR}
                  type="leader"
                  onAddForm={openAddForm}
                  schedules={schedules}
                  weekStartDateStr={weekStartDateStr}
                  weekStartDate={currentWeekStart}
                  filterWorkType={filterWorkType}
                  handleEditClick={handleEditClick}
                  onUnitClick={handleUnitClick}
                  selectedUnitId={selectedUnitId}
                />
              </div>
              <div className="flex-1 flex flex-col">
                <SectionBlock
                  title="Phòng Thống kê"
                  icon={<Building className="w-4 h-4" />}
                  headerColor={PHONG_COLOR}
                  units={phongUnits}
                  color={PHONG_COLOR}
                  type="phong"
                  onAddForm={openAddForm}
                  schedules={schedules}
                  weekStartDateStr={weekStartDateStr}
                  weekStartDate={currentWeekStart}
                  filterWorkType={filterWorkType}
                  handleEditClick={handleEditClick}
                  onUnitClick={handleUnitClick}
                  selectedUnitId={selectedUnitId}
                />
              </div>
            </div>

            {/* CỘT PHẢI (7/12): KHỐI 2 (VÙNG 1) & KHỐI 4 (VÙNG 2) */}
            <div className="xl:col-span-7 flex flex-col gap-3.5 h-full">
              <div className="flex-1 flex flex-col">
                <SectionBlock
                  title="Thống kê cơ sở Vùng 1"
                  icon={<Building2 className="w-4 h-4" />}
                  headerColor={VUNG1_COLOR}
                  units={vung1Units}
                  color={VUNG1_COLOR}
                  type="vung1"
                  onAddForm={openAddForm}
                  schedules={schedules}
                  weekStartDateStr={weekStartDateStr}
                  weekStartDate={currentWeekStart}
                  filterWorkType={filterWorkType}
                  handleEditClick={handleEditClick}
                  onUnitClick={handleUnitClick}
                  selectedUnitId={selectedUnitId}
                />
              </div>
              <div className="flex-1 flex flex-col">
                <SectionBlock
                  title="Thống kê cơ sở Vùng 2"
                  icon={<Building2 className="w-4 h-4" />}
                  headerColor={VUNG2_COLOR}
                  units={vung2Units}
                  color={VUNG2_COLOR}
                  type="vung2"
                  onAddForm={openAddForm}
                  schedules={schedules}
                  weekStartDateStr={weekStartDateStr}
                  weekStartDate={currentWeekStart}
                  filterWorkType={filterWorkType}
                  handleEditClick={handleEditClick}
                  onUnitClick={handleUnitClick}
                  selectedUnitId={selectedUnitId}
                />
              </div>
            </div>
          </div>
        ) : (
          <AllUnitsMasterTable
            sections={[
              { title: 'I. Ban Lãnh Đạo Tỉnh', color: LEADER_COLOR, units: leaderUnits },
              { title: 'II. Phòng Thống Kê Chuyên Môn', color: PHONG_COLOR, units: phongUnits },
              { title: 'III. Thống Kê Cơ Sở Vùng 1', color: VUNG1_COLOR, units: vung1Units },
              { title: 'IV. Thống Kê Cơ Sở Vùng 2', color: VUNG2_COLOR, units: vung2Units },
            ]}
            schedules={schedules}
            weekStartDate={currentWeekStart}
            weekStartDateStr={weekStartDateStr}
            filterWorkType={filterWorkType}
            onOpenAdd={openAddForm}
            handleEditClick={handleEditClick}
            onUnitSelect={handleUnitClick}
          />
        )}

        {/* ================= DYNAMIC UNIT MATRIX ================= */}
        {selectedUnit && (
          <div className="bg-[#f4faf6] dark:bg-slate-900 border border-[#b8d8be] dark:border-slate-700 rounded-xl shadow-xs flex flex-col mt-4 overflow-hidden">
            <div className="bg-[#6b9e73] text-white text-[12px] font-semibold text-center py-2 uppercase tracking-wide flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-100" />
                <span>Ma Trận Lịch Tuần - {selectedUnit.fullName || selectedUnit.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] opacity-90">{effectiveMembers.length} nhân sự (cuộn để xem chi tiết)</span>
                <button
                  onClick={() => openAddForm(undefined, selectedUnit.fullName || selectedUnit.name)}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Thêm lịch
                </button>
              </div>
            </div>
            <div className="p-3">
              {/* Scrollable table container limited to a few rows */}
              <div className="overflow-x-auto overflow-y-auto max-h-[340px] custom-scrollbar border border-[#cde2d2] dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full min-w-[900px] border-collapse text-[11px] font-sans">
                  <thead>
                    <tr className="bg-[#e4f2e7] dark:bg-slate-800 border-b border-[#b8d8be] dark:border-slate-700 sticky top-0 z-20 shadow-2xs">
                      <th className="px-2.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 sticky left-0 bg-[#e4f2e7] dark:bg-slate-800 z-30 w-32">Nhân sự / Chức vụ</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-24">Phòng ban</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T2</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T3</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T4</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T5</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T6</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 w-20">T7</th>
                      <th className="px-1.5 py-2 text-center font-bold text-[#1f4a2b] dark:text-emerald-400 w-20">CN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveMembers.map((member, mIdx) => (
                      <tr key={member.id || member.fullName} className={`${mIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-[#f8fdf9] dark:bg-slate-800/40'} border-b border-[#edf4ee] dark:border-slate-800 hover:bg-[#edf7ef] transition-colors`}>
                        <td className="px-2.5 py-2 font-semibold text-[#1e582e] dark:text-emerald-400 border-r border-[#cde2d2] dark:border-slate-700 sticky left-0 bg-inherit z-10 w-32 text-nowrap">
                          {member.fullName} <br/><span className="text-[9.5px] font-normal text-slate-500">{member.position || '—'}</span>
                        </td>
                        <td className="px-1.5 py-2 text-slate-600 dark:text-slate-400 text-[9.5px] border-r border-[#edf4ee] dark:border-slate-800 text-center">
                          {member.department || member.workUnit || selectedUnit.name || '—'}
                        </td>
                        {DAY_LABELS.map((_, dayIdx) => (
                          <td key={dayIdx} className="px-1 py-1 border-r border-[#edf4ee] dark:border-slate-800 w-20 min-w-[70px] max-w-[70px] align-top">
                            <div className="space-y-1 min-h-[44px]">
                              {SESSIONS.map((session) => {
                                const dayOfWeek = (dayIdx + 1) % 7;
                                const memberSchedules = schedules.filter(s => 
                                  isSameWeek(s.weekStartDate, weekStartDate) && 
                                  (
                                    isPersonMatch(s.personName, member.fullName) ||
                                    (effectiveMembers.length === 1 && (isPersonMatch(s.personName, selectedUnit.name) || deptMatch(s.unitName, selectedUnit.name)))
                                  ) &&
                                  parseDayOfWeek(s.dayOfWeek) === dayOfWeek &&
                                  normalizeSession(s.session) === session
                                );
                                const hasSchedule = memberSchedules.length > 0;
                                const firstSchedule = hasSchedule ? memberSchedules[0] : null;
                                const isCustom = firstSchedule && isCustomSchedule(firstSchedule);
                                
                                return (
                                  <div 
                                    key={session}
                                    className={`relative p-1 rounded text-[9px] leading-tight min-h-[18px] cursor-pointer transition-all hover:shadow-xs group ${
                                      isCustom 
                                        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700' 
                                        : 'bg-[#f9faf9] dark:bg-slate-800/40 border border-[#e5ece6] dark:border-slate-800 hover:bg-emerald-50/40'
                                    }`}
                                    onClick={(e) => {
                                      const target = e.target as HTMLElement | null;
                                      if (!target?.closest('button')) {
                                        if (hasSchedule && firstSchedule) {
                                          openEditForm(firstSchedule);
                                        } else {
                                          openAddForm(dayIdx, member.fullName, session);
                                        }
                                      }
                                    }}
                                    title={hasSchedule 
                                      ? memberSchedules.map(s => `${SESSION_LABELS[normalizeSession(s.session)]}: ${s.title}`).join('\n')
                                      : `${DAY_LABELS[dayIdx]} ${SESSION_LABELS[session]}: Tại CQ - Nhấp để thêm lịch`}
                                  >
                                    <span className="font-medium text-[8px] opacity-70 text-slate-500 dark:text-slate-400 mr-1">{SESSION_LABELS[session].charAt(0)}:</span>
                                    {isCustom ? (
                                      <>
                                        <span className="truncate block font-semibold text-emerald-900 dark:text-emerald-100">{firstSchedule?.title}</span>
                                        {firstSchedule?.location && (
                                          <span className="truncate block text-[7.5px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">📍{firstSchedule.location}</span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500 font-normal">Tại CQ</span>
                                    )}
                                    {memberSchedules.length > 1 && (
                                      <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">+{memberSchedules.length - 1}</span>
                                    )}
                                    {/* Edit button on hover */}
                                    {hasSchedule && firstSchedule && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditForm(firstSchedule);
                                        }}
                                        className="absolute top-0 right-0 m-0.5 p-0.5 text-emerald-600 hover:bg-emerald-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Sửa lịch này"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {effectiveMembers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Chưa có nhân sự trong đơn vị này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-[#eaf4ec] dark:bg-slate-800/80 border-t border-[#b8d8be] dark:border-slate-700 px-4 py-2 flex items-center justify-between">
              <span className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">
                Tuần: {formatWeekRange(weekStartDate)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[9.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Có lịch phát sinh
                </span>
                <button 
                  onClick={() => setSelectedUnitId(null)}
                  className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-slate-800 px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md flex items-center gap-1 font-medium transition-colors shadow-2xs"
                >
                  <X className="w-3 h-3" /> Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== DEPARTMENT TEMPLATE & UPLOAD MODAL ===== */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Tải mẫu Excel & Nhập lịch theo đơn vị
                    </h3>
                    <p className="text-xs text-slate-500">Chọn phòng ban hoặc cơ sở để tải file mẫu Excel tương ứng</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4 max-h-[calc(85vh-120px)]">
                {/* 1. Ban Lãnh đạo */}
                <div>
                  <h4 className="text-xs font-bold text-[#b42318] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Khối Ban Lãnh Đạo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">Ban Lãnh đạo Cục</div>
                        <div className="text-[10px] text-slate-500">4 Đ/c Lãnh đạo (Cục trưởng, Phó Cục trưởng)</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            downloadDepartmentTemplate('Ban Lãnh đạo');
                            setShowTemplateModal(false);
                          }}
                          className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded text-[11px] font-medium flex items-center gap-1"
                          title="Tải mẫu Excel"
                        >
                          <DownloadIcon className="w-3 h-3" /> Mẫu
                        </button>
                        <button
                          onClick={() => {
                            setShowTemplateModal(false);
                            triggerFileImport('Ban Lãnh đạo');
                          }}
                          className="px-2 py-1 bg-[#b42318] hover:bg-red-800 text-white rounded text-[11px] font-medium flex items-center gap-1"
                          title="Tải lên lịch tuần"
                        >
                          <UploadIcon className="w-3 h-3" /> Nạp
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Phòng chuyên môn */}
                <div>
                  <h4 className="text-xs font-bold text-[#2d6e3e] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Khối Phòng Nghiệp Vụ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FUNCTIONAL_DEPTS.map(dept => (
                      <div key={dept} className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{dept}</div>
                          <div className="text-[10px] text-slate-500">Mẫu ma trận có sẵn nhân sự</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              downloadDepartmentTemplate(dept);
                              setShowTemplateModal(false);
                            }}
                            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] font-medium flex items-center gap-1"
                            title="Tải mẫu Excel"
                          >
                            <DownloadIcon className="w-3 h-3" /> Mẫu
                          </button>
                          <button
                            onClick={() => {
                              setShowTemplateModal(false);
                              triggerFileImport(dept);
                            }}
                            className="px-2 py-1 bg-[#2d6e3e] hover:bg-emerald-800 text-white rounded text-[11px] font-medium flex items-center gap-1"
                            title="Tải lên lịch tuần"
                          >
                            <UploadIcon className="w-3 h-3" /> Nạp
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Cơ sở địa phương */}
                <div>
                  <h4 className="text-xs font-bold text-[#b54d05] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Khối Thống Kê Cơ Sở
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_DISTRICTS.map(district => (
                      <div key={district} className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{district}</div>
                          <div className="text-[10px] text-slate-500">Chi cục / Cơ sở</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              downloadDepartmentTemplate(district);
                              setShowTemplateModal(false);
                            }}
                            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[11px] font-medium flex items-center gap-1"
                            title="Tải mẫu Excel"
                          >
                            <DownloadIcon className="w-3 h-3" /> Mẫu
                          </button>
                          <button
                            onClick={() => {
                              setShowTemplateModal(false);
                              triggerFileImport(district);
                            }}
                            className="px-2 py-1 bg-[#b54d05] hover:bg-amber-800 text-white rounded text-[11px] font-medium flex items-center gap-1"
                            title="Tải lên lịch tuần"
                          >
                            <UploadIcon className="w-3 h-3" /> Nạp
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default WeeklyWorkSchedule;