import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  INITIAL_EMPLOYEES, 
  calculateKPIResultSummary,
  SAMPLE_KPI_TEMPLATES
} from './initialData';
import { Employee, CivilServiceTask } from './types';
import DashboardOverview from './components/DashboardOverview';
import KPICard from './components/KPICard';
import SmartCoach from './components/SmartCoach';
import ScorecardExport from './components/ScorecardExport';
import KPIModal from './components/KPIModal';
import ExcelUploadModal from './components/ExcelUploadModal';
import BieuMauOne from './components/BieuMauOne';
import ToastContainer, { showToast } from './components/Toast';
import BieuMauTwo from './components/BieuMauTwo';
import BieuMauThree from './components/BieuMauThree';
import ApprovePage from './components/ApprovePage';
import { 
  Target, BarChart3, Users, HelpCircle, Plus, Search, 
  RotateCcw, Info, FileText, Sparkles, Shield, LogOut, 
  LogIn, UserCheck, FileUp, AlertCircle, RefreshCw,
  Lock, Unlock, Megaphone, Bell, Trash2, X, Download, CheckCircle2,
  AlertTriangle, Clock, Activity, FileSpreadsheet, Cloud,
  ChevronDown, UserPlus, Database, Check, CheckSquare, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  pushAllEmployeesToFirestore,
  fetchEmployeesFromFirestore,
  saveDirectivesToFirestore,
  fetchDirectivesFromFirestore,
  saveConfigToFirestore,
  fetchConfigFromFirestore,
  clearAllEmployeesExceptAdmin,
  pushEmployeeToFirestore,
  deleteEmployeeFromFirestore
} from './lib/firebaseSync';



function AgencyLogo() {
  const [imgSrc, setImgSrc] = useState<string | null>('/logo.png');
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc === '/logo.png') {
      setImgSrc('/logo.jpg');
    } else if (imgSrc === '/logo.jpg') {
      setImgSrc('/logo.svg');
    } else {
      setHasError(true);
    }
  };

  if (hasError || !imgSrc) {
    return (
      <div 
        className="w-12 h-12 border border-emerald-400/50 bg-[#052b19]/60 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-[#052b19]/90 shrink-0 group shadow-inner"
        title="Đồng chí có thể thay thế logo bằng cách tải tệp logo.png hoặc logo.jpg vào thư mục /public"
      >
        <Shield className="w-5 h-5 text-emerald-300 group-hover:text-white transition-colors" />
        <span className="text-[7px] text-emerald-200 font-black uppercase tracking-wider mt-0.5">LOGO</span>
      </div>
    );
  }

  return (
    <div 
      className="w-12 h-12 border border-emerald-400/50 bg-[#052b19]/60 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden shrink-0 shadow-inner"
      title="Logo cơ quan hoạt động (tải từ thư mục /public/logo.png)"
    >
      <img 
        src={imgSrc} 
        alt="Logo" 
        className="w-full h-full object-cover"
        onError={handleError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function App() {
  // State for loaded employees (synced with localStorage)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    // Với dữ liệu cũ (trước khi có cơ chế "Lưu Biểu 01/02"): nếu cán bộ đã có sẵn nhiệm vụ nhưng
    // chưa từng có cờ form1Saved/form2Saved (undefined), coi như họ đã "lưu" từ trước để không làm
    // trắng/mất điểm dữ liệu đã nhập trước đó. Cán bộ hoàn toàn mới (chưa có nhiệm vụ) vẫn ở trạng
    // thái mặc định "chưa lưu" cho tới khi họ tự lưu.
    const normalize = (emp: Employee): Employee => {
      if (!emp || emp.isAdmin) return emp;
      const hasLegacyData = Array.isArray(emp.tasks) && emp.tasks.length > 0;
      return {
        ...emp,
        form1Saved: emp.form1Saved ?? (hasLegacyData ? true : false),
        form2Saved: emp.form2Saved ?? (hasLegacyData ? true : false),
      };
    };

    const saved = localStorage.getItem('civil_service_kpi_employees_v2');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const hasAdmin = parsed.some((emp: any) => emp && emp.isAdmin === true);
          if (!hasAdmin) {
            const adminFromDefaults = INITIAL_EMPLOYEES.find(e => e.isAdmin);
            if (adminFromDefaults) {
              parsed = [adminFromDefaults, ...parsed];
            }
          }
          // Remove duplicates based on username (lowercase) or admin status
          const seen = new Set<string>();
          return parsed.filter((emp: any) => {
            if (!emp) return false;
            if (emp.isAdmin) return true;
            if (!emp.username) return false;
            const key = emp.username.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).map(normalize);
        }
      } catch (e) {
        console.error('Failed to parse saved employees, falling back to defaults.');
      }
    }
    // Also deduplicate INITIAL_EMPLOYEES just in case
    const seenDefault = new Set<string>();
    return INITIAL_EMPLOYEES.filter(emp => {
      if (!emp || !emp.id) return false;
      if (seenDefault.has(emp.id)) return false;
      seenDefault.add(emp.id);
      return true;
    }).map(normalize);
  });

  // Logged-in user state (synced with localStorage)
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('civil_service_kpi_current_user_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current user');
      }
    }
    return null;
  });

  // Firestore Connection & State Syncing Status (Requirement 1 & Cloud Sync)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('Chưa kết nối Cloud');
  const isLoadedFromCloud = useRef(false);

  // Auto load from Firestore on mount
  useEffect(() => {
    async function initFirestoreData() {
      setSyncStatus('loading');
      setSyncMessage('Đang kết nối Firestore...');
      try {
        const firestoreEmps = await fetchEmployeesFromFirestore();
        const firestoreConfig = await fetchConfigFromFirestore();
        const firestoreDirectives = await fetchDirectivesFromFirestore();
        
        let loadedEmployees = employees;
        if (firestoreEmps.length > 0) {
          // Lọc trùng lặp triệt để theo username (không phân biệt hoa thường)
          const uniqueEmps: Employee[] = [];
          firestoreEmps.forEach(emp => {
            if (!emp || !emp.username) return;
            const uName = emp.username.toLowerCase();
            const existingIdx = uniqueEmps.findIndex(e => e.username?.toLowerCase() === uName);
            if (existingIdx >= 0) {
              // Ưu tiên giữ bản ghi có nhiều công việc (tasks) hơn hoặc cập nhật công việc
              if (emp.tasks && emp.tasks.length > (uniqueEmps[existingIdx].tasks?.length || 0)) {
                uniqueEmps[existingIdx] = emp;
              }
            } else {
              uniqueEmps.push(emp);
            }
          });

          setEmployees(uniqueEmps);
          loadedEmployees = uniqueEmps;
          setSyncMessage('Đã đồng bộ');
          setSyncStatus('success');
        } else {
          // Firestore is empty, seed it with current local/default employees!
          setSyncMessage('Khởi tạo dữ liệu Cloud...');
          await pushAllEmployeesToFirestore(employees);
          await saveDirectivesToFirestore(directives);
          await saveConfigToFirestore(isQuarterLocked, departmentsRegion1, unitsRegion2);
          setSyncMessage('Đã khởi tạo Cloud');
          setSyncStatus('success');
        }

        if (firestoreConfig) {
          if (firestoreConfig.isQuarterLocked !== undefined) {
            setIsQuarterLocked(firestoreConfig.isQuarterLocked);
          }
          if (firestoreConfig.departments) {
            setDepartmentsRegion1(firestoreConfig.departments);
          }
          if (firestoreConfig.units) {
            setUnitsRegion2(firestoreConfig.units);
          }
        }

        if (firestoreDirectives && firestoreDirectives.length > 0) {
          setDirectives(firestoreDirectives);
        }
        
        // Sync currentUser with the latest fetched employee
        const savedCurrentUser = localStorage.getItem('civil_service_kpi_current_user_v2');
        if (savedCurrentUser) {
          try {
            const parsed = JSON.parse(savedCurrentUser);
            const freshUser = loadedEmployees.find(emp => emp.id === parsed.id);
            if (freshUser) {
              setCurrentUser(freshUser);
            }
          } catch (e) {}
        }
        
        isLoadedFromCloud.current = true;
      } catch (err) {
        console.error('Error connecting to Firestore, using local data:', err);
        setSyncStatus('error');
        setSyncMessage('Ngoại tuyến (Offline)');
        // Still allow save tracking for recovery
        isLoadedFromCloud.current = true;
      }
    }
    
    initFirestoreData();
  }, []);

  // Manual trigger for Cloud synchronization
  const forceSyncWithCloud = async () => {
    setSyncStatus('loading');
    setSyncMessage('Đang đồng bộ...');
    try {
      const firestoreEmps = await fetchEmployeesFromFirestore();
      const firestoreConfig = await fetchConfigFromFirestore();
      const firestoreDirectives = await fetchDirectivesFromFirestore();
      
      let loadedEmployees = employees;
      if (firestoreEmps.length > 0) {
        // Lọc trùng lặp triệt để theo username (không phân biệt hoa thường)
        const uniqueEmps: Employee[] = [];
        firestoreEmps.forEach(emp => {
          if (!emp || !emp.username) return;
          const uName = emp.username.toLowerCase();
          const existingIdx = uniqueEmps.findIndex(e => e.username?.toLowerCase() === uName);
          if (existingIdx >= 0) {
            // Ưu tiên giữ bản ghi có nhiều công việc (tasks) hơn hoặc cập nhật công việc
            if (emp.tasks && emp.tasks.length > (uniqueEmps[existingIdx].tasks?.length || 0)) {
              uniqueEmps[existingIdx] = emp;
            }
          } else {
            uniqueEmps.push(emp);
          }
        });

        setEmployees(uniqueEmps);
        loadedEmployees = uniqueEmps;
      } else {
        await pushAllEmployeesToFirestore(employees);
      }
      
      if (firestoreConfig) {
        if (firestoreConfig.isQuarterLocked !== undefined) {
          setIsQuarterLocked(firestoreConfig.isQuarterLocked);
        }
        if (firestoreConfig.departments) {
          setDepartmentsRegion1(firestoreConfig.departments);
        }
        if (firestoreConfig.units) {
          setUnitsRegion2(firestoreConfig.units);
        }
      }

      if (firestoreDirectives && firestoreDirectives.length > 0) {
        setDirectives(firestoreDirectives);
      }

      // Also ensure we write back anything newer
      await pushAllEmployeesToFirestore(loadedEmployees);
      await saveDirectivesToFirestore(directives);
      await saveConfigToFirestore(isQuarterLocked, departmentsRegion1, unitsRegion2);
      
      setSyncStatus('success');
      setSyncMessage('Đã đồng bộ');
      alert('Đồng bộ dữ liệu với máy chủ đám mây Firestore thành công!');
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus('error');
      setSyncMessage('Lỗi kết nối Cloud');
      alert('Không thể kết nối tới đám mây. Đồng chí có thể tiếp tục sử dụng ngoại tuyến (Offline) qua trình duyệt.');
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'approve' | 'instructions'>('employees');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('emp-1');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [activeKpiBlock, setActiveKpiBlock] = useState<'mau01' | 'cham_diem'>('mau01');
  const [activeKpiSheet, setActiveKpiSheet] = useState<'sheet1' | 'sheet2' | 'sheet3'>('sheet1');
  const [activeInstructionTab, setActiveInstructionTab] = useState<'kpi' | 'eval'>('kpi');
  
  // Dynamic lists of departments and units based on imported users or fallback to defaults (Requirement 1)
  const [departmentsRegion1, setDepartmentsRegion1] = useState<string[]>(() => {
    const saved = localStorage.getItem('civil_service_kpi_departments_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // 1. Định nghĩa biến này ở phạm vi file (trên cùng) hoặc ngay trước khối useState
const UNITS_REGION_2: string[] = []; 

// 2. Đoạn code của bạn:
const [unitsRegion2, setUnitsRegion2] = useState<string[]>(() => {
  const saved = localStorage.getItem('civil_service_kpi_units_v3');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return UNITS_REGION_2;
});

  // Notice & Executive Directives State (Requirement 3)
  const [directives, setDirectives] = useState<{ id: string; category: string; content: string; date: string }[]>(() => {
    const saved = localStorage.getItem('civil_service_kpi_directives');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'dir-1',
        category: 'Chỉ đạo',
        content: "Kiểm soát chặt chẽ chỉ tiêu thi đua xếp loại 'Xuất sắc', tuyệt đối không vượt quá 20% tổng số cán bộ đạt mức Tốt trở lên theo đúng quy chuẩn Nghị định 335/2025/NĐ-CP.",
        date: "13/07/2026"
      },
      {
        id: 'dir-2',
        category: 'Trọng tâm',
        content: "Tất cả cán bộ, Đảng viên trực thuộc ban phòng cần hoàn thành việc tự chấm điểm và báo cáo kết quả KPI trước ngày 15/07/2026.",
        date: "12/07/2026"
      },
      {
        id: 'dir-3',
        category: 'Thông báo',
        content: "Ban Tổ chức chuẩn bị tài liệu, hồ sơ chứng minh để phục vụ kế hoạch kiểm tra chéo, thanh tra công vụ giữa các đơn vị cơ sở.",
        date: "10/07/2026"
      },
      {
        id: 'dir-4',
        category: 'Hỗ trợ',
        content: "Đường dây nóng hỗ trợ Sổ tay đảng viên điện tử & tính điểm KPI quy đổi: Ban Tổ chức Đảng ủy (SĐT: 024.3926.XXXX).",
        date: "08/07/2026"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('civil_service_kpi_directives', JSON.stringify(directives));
    
    if (isLoadedFromCloud.current) {
      const saveDirectivesCloud = async () => {
        setSyncStatus('loading');
        setSyncMessage('Đang lưu...');
        try {
          await saveDirectivesToFirestore(directives);
          setSyncStatus('success');
          setSyncMessage('Đã đồng bộ');
        } catch (e) {
          setSyncStatus('error');
          setSyncMessage('Lỗi lưu Cloud');
        }
      };
      const timer = setTimeout(saveDirectivesCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [directives]);

  const [isAddingDirective, setIsAddingDirective] = useState(false);
  const [newDirectiveCategory, setNewDirectiveCategory] = useState('Chỉ đạo');
  const [newDirectiveContent, setNewDirectiveContent] = useState('');
  
  const [isQuarterLocked, setIsQuarterLocked] = useState<boolean>(() => {
    return localStorage.getItem('civil_service_kpi_quarter_locked_v2') === 'true';
  });

  const toggleQuarterLock = () => {
    setIsQuarterLocked(prev => !prev);
  };
  
  // Filtering states for Admin and 4 Leaders
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<'all' | 'ban_lanh_dao' | 'phong_ban' | 'vung_1' | 'vung_2'>('all');
  const [selectedDeptUnitFilter, setSelectedDeptUnitFilter] = useState<string>('all');

  // Modals & Export screen states
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isViewingScorecard, setIsViewingScorecard] = useState(false);
  const [uploadModalType, setUploadModalType] = useState<'users' | 'tasks' | null>(null);

  // New State variables for custom avatar updating and database management
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarTargetId, setAvatarTargetId] = useState<string | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [isDataDropdownOpen, setIsDataDropdownOpen] = useState(false);
  const [isAddingNewEmployee, setIsAddingNewEmployee] = useState(false);
  
  // Monthly Calendar state and helper functions
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null); // Default to null (show normal ranking)
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<number>(6); // Default is July (6)
  const [selectedCalendarYear, setSelectedCalendarYear] = useState<number>(2026); // Default is 2026

  const [calendarMonth, setCalendarMonth] = useState<number>(6); // Currently viewed month in calendar UI (0-11, July is 6)
  const [calendarYear, setCalendarYear] = useState<number>(2026); // Currently viewed year in calendar UI
  
  const getTaskDeadlineDate = (taskId: string, timeline: string | undefined | null, task?: CivilServiceTask): Date | null => {
    // If we have task object and deadlineDate is specified
    if (task && task.deadlineDate) {
      const parts = task.deadlineDate.split('-');
      if (parts.length >= 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const candidate = new Date(y, m, d);
        if (!isNaN(candidate.getTime())) return candidate;
      }
      const parsed = new Date(task.deadlineDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const safeTimeline = timeline || '';

    // Prioritize parsing explicit dates like DD/MM/YYYY or DD/MM inside the timeline text
    const dateRegexFull = /(\d{2})\/(\d{2})\/(\d{4})/;
    const matchFull = safeTimeline.match(dateRegexFull);
    if (matchFull) {
      const d = parseInt(matchFull[1], 10);
      const m = parseInt(matchFull[2], 10) - 1; // 0-indexed month
      const y = parseInt(matchFull[3], 10);
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const dateRegexShort = /(\d{2})\/(\d{2})/;
    const matchShort = safeTimeline.match(dateRegexShort);
    if (matchShort) {
      const d = parseInt(matchShort[1], 10);
      const m = parseInt(matchShort[2], 10) - 1; // 0-indexed month
      const y = 2026; // Default to 2026
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    const tl = safeTimeline.toLowerCase();
    const idStr = taskId || '';
    
    if (tl.includes('25 hằng tháng')) {
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 25) : new Date(2026, 5, 25);
    }
    
    if (tl.includes('hằng tháng') || tl.includes('hàng tháng')) {
      const charCode = idStr.charCodeAt(idStr.length - 1) || 0;
      if (charCode % 3 === 0) {
        return new Date(2026, 6, 15);
      } else if (charCode % 3 === 1) {
        return new Date(2026, 6, 8);
      } else {
        return new Date(2026, 5, 15);
      }
    }
    
    if (tl.includes('15 ngày') || tl.includes('10/07')) {
      return new Date(2026, 6, 10);
    }
    
    if (tl.includes('đột xuất')) {
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 14) : new Date(2026, 6, 8);
    }

    if (tl.includes('đúng hạn')) {
      return new Date(2026, 5, 30);
    }

    if (tl.includes('hằng quý') || tl.includes('hàng quý') || tl.includes('quý')) {
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 5) : new Date(2026, 4, 20);
    }

    if (tl.includes('6 tháng')) {
      return new Date(2026, 5, 28);
    }

    if (tl.includes('đảng ủy bộ tài chính')) {
      return new Date(2026, 5, 20);
    }

    if (tl.includes('cấp có thẩm quyền') || tl.includes('quy định') || tl.includes('công việc')) {
      const charCode = idStr.charCodeAt(idStr.length - 1) || 0;
      if (charCode % 3 === 0) {
        return new Date(2026, 6, 16);
      } else if (charCode % 3 === 1) {
        return new Date(2026, 6, 9);
      } else {
        return new Date(2026, 6, 17);
      }
    }

    return null; // Fallback to no deadline
  };

  const getTasksForDay = (dayNum: number, monthNum?: number, yearNum?: number) => {
    if (!currentUser) return [];
    
    const m = monthNum !== undefined ? monthNum : (selectedCalendarDay === dayNum ? selectedCalendarMonth : calendarMonth);
    const y = yearNum !== undefined ? yearNum : (selectedCalendarDay === dayNum ? selectedCalendarYear : calendarYear);
    
    // Admin/Leaders can see all employees' deadlines, normal users see only their own
    const searchBase = (currentUser.isAdmin || currentUser.orgType === 'Lãnh đạo' || currentUser.orgType === 'Ban Lãnh Đạo')
      ? employees
      : employees.filter(emp => emp.id === currentUser.id);
      
    const results: { emp: Employee; task: CivilServiceTask }[] = [];
    
    searchBase.forEach(emp => {
      if (!emp.tasks) return;
      emp.tasks.forEach(task => {
        const deadlineDate = getTaskDeadlineDate(task.id, task.timeline, task);
        if (deadlineDate && deadlineDate.getFullYear() === y && deadlineDate.getMonth() === m && deadlineDate.getDate() === dayNum) {
          results.push({ emp, task });
        }
      });
    });
    
    return results;
  };

  const checkDayHasDeadlines = (dayNum: number, monthNum: number = calendarMonth, yearNum: number = calendarYear): boolean => {
    return getTasksForDay(dayNum, monthNum, yearNum).length > 0;
  };

  const getSelectedDayTasks = () => {
    if (selectedCalendarDay === null) return [];
    return getTasksForDay(selectedCalendarDay, selectedCalendarMonth, selectedCalendarYear);
  };

  const getSelectedDayTasksCount = () => {
    return getSelectedDayTasks().length;
  };
  
  // New employee manual entry form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpOrgType, setNewEmpOrgType] = useState<'Phòng ban' | 'Đơn vị cơ sở'>('Phòng ban');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('123456');
  const [newEmpAvatar, setNewEmpAvatar] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face');

  // State for advanced individual/department deletion/reset tool
  const [deleteTargetEmployeeId, setDeleteTargetEmployeeId] = useState('');
  const [deleteTargetDeptName, setDeleteTargetDeptName] = useState('');

  // State for beautiful in-app alerts and confirmation dialogs that bypass sandboxed iframe restrictions
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isConfirm: false,
  });

  const triggerAlert = (title: string, message: string) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      isConfirm: false,
      confirmText: 'Đóng',
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>, confirmText = 'Đồng ý', cancelText = 'Hủy bỏ') => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  // Unique list of all departments currently in the system
  const allDepartmentNames = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sync state changes with localStorage and Firestore
  useEffect(() => {
    localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(employees));
    
    if (isLoadedFromCloud.current) {
      const saveEmployeesCloud = async () => {
        setSyncStatus('loading');
        setSyncMessage('Đang lưu...');
        try {
          await pushAllEmployeesToFirestore(employees);
          setSyncStatus('success');
          setSyncMessage('Đã đồng bộ');
        } catch (e) {
          setSyncStatus('error');
          setSyncMessage('Lỗi lưu Cloud');
        }
      };
      const timer = setTimeout(saveEmployeesCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [employees]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('civil_service_kpi_current_user_v2', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('civil_service_kpi_current_user_v2');
    }
  }, [currentUser]);

  // Sync currentUser data when employees updates
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin) {
      const match = employees.find(emp => emp.id === currentUser.id);
      if (match && JSON.stringify(match) !== JSON.stringify(currentUser)) {
        setCurrentUser(match);
      }
    }
  }, [employees, currentUser]);

  // Sync isQuarterLocked, departments, and units to localStorage & Firestore
  useEffect(() => {
    localStorage.setItem('civil_service_kpi_quarter_locked_v2', String(isQuarterLocked));
    localStorage.setItem('civil_service_kpi_departments_v3', JSON.stringify(departmentsRegion1));
    localStorage.setItem('civil_service_kpi_units_v3', JSON.stringify(unitsRegion2));
    
    if (isLoadedFromCloud.current) {
      const saveConfigCloud = async () => {
        setSyncStatus('loading');
        setSyncMessage('Đang lưu...');
        try {
          await saveConfigToFirestore(isQuarterLocked, departmentsRegion1, unitsRegion2);
          setSyncStatus('success');
          setSyncMessage('Đã đồng bộ');
        } catch (e) {
          setSyncStatus('error');
          setSyncMessage('Lỗi lưu Cloud');
        }
      };
      const timer = setTimeout(saveConfigCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [isQuarterLocked, departmentsRegion1, unitsRegion2]);

  // Role helpers - FIX cho Trưởng phòng / đơn vị
  const isLeaderOrAdmin = useMemo(() => {
    return !!(currentUser && (currentUser.isAdmin || currentUser.orgType === 'Lãnh đạo' || currentUser.orgType === 'Ban Lãnh Đạo'));
  }, [currentUser]);

  const isDeptHead = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    return r.includes('trưởng') || r.includes('giám đốc') || r.includes('bí thư') || r.includes('chủ tịch') || r.includes('hiệu trưởng');
  }, [currentUser]);

  const canViewDashboard = useMemo(() => {
    return !!(isLeaderOrAdmin || isDeptHead);
  }, [isLeaderOrAdmin, isDeptHead]);

  const isLeadLeader = useMemo(() => {
    return !!(currentUser && currentUser.orgType === 'Ban Lãnh Đạo' && currentUser.leadershipRole === 'Trưởng');
  }, [currentUser]);

  // Quyền quản trị dữ liệu: Admin hệ thống HOẶC Trưởng của Ban Lãnh Đạo (coi như admin).
  // Phó Lãnh đạo và Trưởng/Phó Phòng ban - Đơn vị cơ sở KHÔNG có quyền này (chỉ được xem).
  const canManageData = useMemo(() => {
    return !!(currentUser && (currentUser.isAdmin || (currentUser.orgType === 'Ban Lãnh Đạo' && currentUser.leadershipRole === 'Trưởng')));
  }, [currentUser]);


  // Aggregate all tasks and calculate core stats for global display (Requirement 4)
  const globalStats = useMemo(() => {
    let totalTasks = 0;
    let inProgressTasks = 0;
    let nearDeadlineTasks = 0;
    let completedOnTimeTasks = 0;
    let overdueTasks = 0;

    employees.forEach(emp => {
      emp.tasks.forEach(task => {
        totalTasks++;
        const qtyRatio = task.targetQuantity > 0 ? (task.actualQtyCount / task.targetQuantity) : 1;
        const progressRatio = task.targetQuantity > 0 ? (task.actualProgressCount / task.targetQuantity) : 1;
        
        if (qtyRatio >= 1 && progressRatio >= 1) {
          completedOnTimeTasks++;
        } else if (qtyRatio < 0.5 || progressRatio < 0.5) {
          overdueTasks++;
        } else if (
          (task.timeline || '').toLowerCase().includes('trước ngày') || 
          (task.timeline || '').toLowerCase().includes('15/07') || 
          task.id.includes('tmpl3-3') ||
          (qtyRatio >= 0.8 && qtyRatio < 1)
        ) {
          nearDeadlineTasks++;
        } else {
          inProgressTasks++;
        }
      });
    });

    return {
      totalTasks,
      inProgressTasks,
      nearDeadlineTasks,
      completedOnTimeTasks,
      overdueTasks
    };
  }, [employees]);

  // Excel Data Exporter (Requirement 1 - Tải dữ liệu người dùng)
  const downloadUserDataExcel = () => {
    // Filter out admin or keep only normal employees
    const exportableEmployees = employees.filter(emp => !emp.isAdmin);
    
    const data = exportableEmployees.map((emp, index) => {
      const summary = calculateKPIResultSummary(emp.tasks);
      let rankLabel = 'Hoàn thành nhiệm vụ';
      if (summary.overallTaskPerformanceScore >= 99.5) {
        rankLabel = 'Hoàn thành xuất sắc nhiệm vụ';
      } else if (summary.overallTaskPerformanceScore >= 90) {
        rankLabel = 'Hoàn thành tốt nhiệm vụ';
      } else if (summary.overallTaskPerformanceScore >= 80) {
        rankLabel = 'Hoàn thành nhiệm vụ';
      } else {
        rankLabel = 'Không hoàn thành nhiệm vụ';
      }

      return {
        'STT': index + 1,
        'Họ và Tên': emp.name,
        'Chức vụ': emp.role,
        'Phòng ban/Đơn vị': emp.department,
        'Phân vùng tổ chức': emp.orgType === 'Phòng ban' 
          ? 'Phòng ban' 
          : emp.orgType === 'Đơn vị cơ sở' 
            ? (unitsRegion2.slice(0, 7).includes(emp.department) ? 'Đơn vị cơ sở (Vùng 1)' : 'Đơn vị cơ sở (Vùng 2)')
            : (emp.orgType || 'Cán bộ'),
        'Số đầu việc đã đăng': emp.tasks.length,
        'Điểm Đạt KPI (%)': Number(summary.overallTaskPerformanceScore.toFixed(2)),
        'Phân Loại Chất Lượng': rankLabel,
        'Tỷ lệ Đạt Số Lượng (%)': Number(summary.qtyKPIPercentage.toFixed(2)),
        'Tỷ lệ Đạt Chất Lượng (%)': Number(summary.qualityKPIPercentage.toFixed(2)),
        'Tỷ lệ Đạt Tiến Độ (%)': Number(summary.progressKPIPercentage.toFixed(2)),
        'Tên Đăng Nhập': emp.username,
        'Trạng thái': emp.form1Saved && emp.form2Saved ? 'Đã lưu' : 'Chưa lưu'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Họ và Tên
      { wch: 18 }, // Chức vụ
      { wch: 25 }, // Phòng ban/Đơn vị
      { wch: 18 }, // Phân vùng tổ chức
      { wch: 18 }, // Số đầu việc đã đăng
      { wch: 18 }, // Điểm Đạt KPI
      { wch: 25 }, // Phân Loại Chất Lượng
      { wch: 20 }, // Tỷ lệ Đạt Số Lượng
      { wch: 20 }, // Tỷ lệ Đạt Chất Lượng
      { wch: 20 }, // Tỷ lệ Đạt Tiến Độ
      { wch: 18 }, // Tên Đăng Nhập
      { wch: 12 }  // Mật Khẩu
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_KPI_Can_Bo');
    XLSX.writeFile(wb, 'Du_Lieu_Can_Bo_Xep_Loai_KPI_2026.xlsx');
  };

  // Adjust active tab and selected employee based on logged-in role - FIX Trưởng phòng được vào dashboard
  useEffect(() => {
    if (currentUser) {
      if (canViewDashboard) {
        setActiveTab('dashboard');
        const firstUser = employees.find(emp => !emp.isAdmin && (isDeptHead && !isLeaderOrAdmin ? emp.department === currentUser.department : true));
        if (firstUser) {
          setSelectedEmployeeId(firstUser.id);
        }
      } else {
        setActiveTab('employees');
        setSelectedEmployeeId(currentUser.id);
      }
    }
  }, [currentUser, canViewDashboard, isDeptHead, isLeaderOrAdmin, employees]);

  // Active Selected Employee - Trưởng phòng được xem nhân viên cùng phòng
  const activeEmployee = useMemo(() => {
    if (!currentUser) return null;
    if (!canViewDashboard) {
      return employees.find(emp => emp.id === currentUser.id) || null;
    }
    return employees.find(emp => emp.id === selectedEmployeeId) || employees.find(emp => !emp.isAdmin) || employees[0];
  }, [employees, selectedEmployeeId, currentUser, canViewDashboard]);

  // Determine if the current user has permission to edit the currently viewed employee's data
  const canEditActiveEmployee = useMemo(() => {
    if (!currentUser || !activeEmployee) return false;
    if (currentUser.id === activeEmployee.id) return true; // Can edit self
    if (currentUser.isAdmin) return true; // Admin can edit all
    if (currentUser.orgType === 'Ban Lãnh Đạo' && currentUser.leadershipRole === 'Trưởng') return true; // Lead leader can edit/evaluate all
    return false; // Peers and Deputy Leaders cannot edit others
  }, [currentUser, activeEmployee]);

  // Subordinate evaluation rights helper (Requirement 3: Trưởng đánh giá cấp dưới cùng đơn vị)
  const canEvaluateActiveEmployee = useMemo(() => {
    if (!currentUser || !activeEmployee) return false;
    
    // Admin & Lead Leader can evaluate anyone
    if (currentUser.isAdmin || (currentUser.orgType === 'Ban Lãnh Đạo' && currentUser.leadershipRole === 'Trưởng')) return true;
    
    // Subordinate check: Is manager/leader in the same department, and evaluating someone else?
    const isManager = currentUser.role.includes('Trưởng') || currentUser.role.includes('Phó Trưởng') || currentUser.role.includes('Bí thư');
    const isSameDept = currentUser.department === activeEmployee.department;
    const isSelf = currentUser.id === activeEmployee.id;
    
    return isManager && isSameDept && !isSelf;
  }, [currentUser, activeEmployee]);

  // Filter employees list based on search box input or admin/leader constraints
  // Group employees by department name to help detect & fix misclassified Phòng ban / Đơn vị cơ sở
  const departmentOrgTypeStats = useMemo(() => {
    const map = new Map<string, { dept: string; phongBanCount: number; donViCoSoCount: number; total: number }>();
    employees.forEach(emp => {
      if (emp.isAdmin || emp.orgType === 'Lãnh đạo' || emp.orgType === 'Ban Lãnh Đạo' || !emp.department) return;
      const existing = map.get(emp.department) || { dept: emp.department, phongBanCount: 0, donViCoSoCount: 0, total: 0 };
      if (emp.orgType === 'Phòng ban') existing.phongBanCount += 1;
      else if (emp.orgType === 'Đơn vị cơ sở') existing.donViCoSoCount += 1;
      existing.total += 1;
      map.set(emp.department, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.dept.localeCompare(b.dept));
  }, [employees]);

  const hasMisclassifiedDepartments = useMemo(
    () => departmentOrgTypeStats.some(s => s.phongBanCount > 0 && s.donViCoSoCount > 0),
    [departmentOrgTypeStats]
  );

  const filteredEmployees = useMemo(() => {
    if (!currentUser) return [];
    
    let baseList = employees;
    if (!canViewDashboard) {
      // Nhân viên thường chỉ thấy cùng phòng
      baseList = employees.filter(emp => emp.department === currentUser.department);
    } else if (isDeptHead && !isLeaderOrAdmin) {
      // Trưởng phòng: chỉ thấy nhân viên cùng phòng để duyệt
      baseList = employees.filter(emp => !emp.isAdmin && emp.department === currentUser.department);
    } else {
      // Admin/Lãnh đạo thấy hết
      baseList = employees.filter(emp => !emp.isAdmin);
    }

    // Apply Region / Dept / Unit filter for Admin and Leaders
    if (isLeaderOrAdmin) {
      if (selectedRegionFilter === 'ban_lanh_dao') {
        // Khối Ban Lãnh Đạo
        baseList = baseList.filter(emp => emp.orgType === 'Ban Lãnh Đạo');
        if (selectedDeptUnitFilter !== 'all') {
          baseList = baseList.filter(emp => emp.department === selectedDeptUnitFilter);
        }
      } else if (selectedRegionFilter === 'phong_ban') {
        // Khối Phòng ban
        baseList = baseList.filter(emp => emp.orgType === 'Phòng ban');
        if (selectedDeptUnitFilter !== 'all') {
          baseList = baseList.filter(emp => emp.department === selectedDeptUnitFilter);
        }
      } else if (selectedRegionFilter === 'vung_1') {
        // Đơn vị cơ sở - Vùng 1 (7 đơn vị đầu)
        const vung1Units = unitsRegion2.slice(0, 7);
        baseList = baseList.filter(emp => emp.orgType === 'Đơn vị cơ sở' && vung1Units.includes(emp.department));
        if (selectedDeptUnitFilter !== 'all') {
          baseList = baseList.filter(emp => emp.department === selectedDeptUnitFilter);
        }
      } else if (selectedRegionFilter === 'vung_2') {
        // Đơn vị cơ sở - Vùng 2 (7 đơn vị tiếp theo)
        const vung2Units = unitsRegion2.slice(7);
        baseList = baseList.filter(emp => emp.orgType === 'Đơn vị cơ sở' && vung2Units.includes(emp.department));
        if (selectedDeptUnitFilter !== 'all') {
          baseList = baseList.filter(emp => emp.department === selectedDeptUnitFilter);
        }
      }
    }

    // Apply search filter
    const searched = baseList.filter(emp => 
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || 
      emp.department.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.role.toLowerCase().includes(employeeSearch.toLowerCase())
    );

    // Remove duplicates based on ID
    const seen = new Set<string>();
    return searched.filter(emp => {
      if (!emp || !emp.id) return false;
      if (seen.has(emp.id)) return false;
      seen.add(emp.id);
      return true;
    });
  }, [employees, employeeSearch, currentUser, isLeaderOrAdmin, selectedRegionFilter, selectedDeptUnitFilter]);

  // Handle individual Task updates (Target, Actual, Scores, etc)
  const handleUpdateTask = (updatedTask: CivilServiceTask) => {
    if (isQuarterLocked || !canEditActiveEmployee) return;
    if (!activeEmployee) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id === activeEmployee.id) {
        const updatedTasks = emp.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        return {
          ...emp,
          tasks: updatedTasks,
          // Có chỉnh sửa nhiệm vụ/điểm -> buộc phải bấm Lưu lại thì điểm mới được tính chính thức
          form1Saved: false,
          form2Saved: false
        };
      }
      return emp;
    }));
  };

  // Handle adding new custom Task to employee
  const handleAddTask = (newTask: CivilServiceTask) => {
    if (isQuarterLocked || !canEditActiveEmployee) return;
    if (!activeEmployee) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id === activeEmployee.id) {
        const updatedTasks = [...emp.tasks, newTask];
        return {
          ...emp,
          tasks: updatedTasks,
          form1Saved: false,
          form2Saved: false
        };
      }
      return emp;
    }));
    setIsAddingTask(false);
  };

  // Delete a Task from employee
  const handleDeleteTask = (taskId: string) => {
    if (isQuarterLocked || !canEditActiveEmployee) return;
    if (!activeEmployee) return;
    if (window.confirm('Đồng chí có chắc chắn muốn xóa nhiệm vụ công việc này không?')) {
      setEmployees(prev => prev.map(emp => {
        if (emp.id === activeEmployee.id) {
          const updatedTasks = emp.tasks.filter(t => t.id !== taskId);
          return {
            ...emp,
            tasks: updatedTasks,
            form1Saved: false,
            form2Saved: false
          };
        }
        return emp;
      }));
    }
  };

  // Reset all to template defaults
  const handleResetData = () => {
    if (window.confirm('Đồng chí có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu theo quy chuẩn nhà nước không? Mọi thay đổi sẽ bị xóa.')) {
      setEmployees(INITIAL_EMPLOYEES);
      localStorage.removeItem('civil_service_kpi_employees_v2');
      // If logged in, sync currentUser with reset state
      if (currentUser) {
        const match = INITIAL_EMPLOYEES.find(e => e.username === currentUser.username);
        if (match) {
          setCurrentUser(match);
        } else {
          setCurrentUser(null);
        }
      }
    }
  };

  const handleClearTestEmployeesOnly = async () => {
    if (window.confirm('CẢNH BÁO: Đồng chí có chắc chắn muốn xóa toàn bộ 10 cán bộ thử nghiệm ban đầu (giữ lại tài khoản Quản trị viên và 4 Lãnh đạo cấp cao) không?\n\nSau khi xóa, danh sách tinh gọn này sẽ được đồng bộ trực tiếp lên đám mây Firestore!')) {
      const keepIds = ['emp-admin', 'emp-leader-1', 'emp-leader-2', 'emp-leader-3', 'emp-leader-4'];
      const updated = employees.filter(emp => keepIds.includes(emp.id) || emp.isAdmin);
      
      // If active selection was a test employee, switch to admin or current user
      if (!updated.some(emp => emp.id === selectedEmployeeId)) {
        if (currentUser) {
          setSelectedEmployeeId(currentUser.id);
        } else {
          setSelectedEmployeeId('emp-admin');
        }
      }
      
      setEmployees(updated);
      
      // Force Firestore sync immediately
      setSyncStatus('loading');
      setSyncMessage('Đang dọn dẹp...');
      try {
        await clearAllEmployeesExceptAdmin(keepIds);
        setSyncStatus('success');
        setSyncMessage('Đã dọn dẹp Cloud');
        alert('Đã xóa thành công toàn bộ 10 cán bộ thử nghiệm ban đầu cả trên máy này và trên máy chủ đám mây Firestore!');
      } catch (err) {
        setSyncStatus('error');
        setSyncMessage('Lỗi cập nhật Cloud');
        alert('Đã xóa cán bộ cục bộ, nhưng gặp lỗi khi cập nhật lên đám mây Firestore. Hệ thống sẽ tự động đồng bộ lại khi có mạng.');
      }
    }
  };

  // Clear all sample data to start fresh with real data
  const handleClearSampleData = () => {
    triggerConfirm(
      'Cảnh báo xóa sạch toàn bộ',
      'Đồng chí có chắc chắn muốn xóa toàn bộ dữ liệu mẫu hiện có CẢ TRÊN MÁY NÀY VÀ TRÊN ĐÁM MÂY FIRESTORE không?\n\nHành động này sẽ:\n1. Xóa toàn bộ cán bộ demo của hệ thống khỏi cơ sở dữ liệu đám mây.\n2. Giữ lại duy nhất tài khoản hiện tại của đồng chí để không bị đăng xuất.\n3. Xóa toàn bộ các đầu việc mẫu để đồng chí bắt đầu lập mới tinh.\n\nSau khi xóa, cơ sở dữ liệu sẽ hoàn toàn sạch sẽ để đồng chí nạp dữ liệu chính thức!',
      async () => {
        if (!currentUser) return;
        
        // Create clean state for the active user with 0 tasks
        const cleanUser: Employee = {
          ...currentUser,
          tasks: []
        };

        setEmployees([cleanUser]);
        setCurrentUser(cleanUser);
        setSelectedEmployeeId(cleanUser.id);
        
        // Force refresh filters
        setSelectedRegionFilter('all');
        setSelectedDeptUnitFilter('all');

        localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify([cleanUser]));
        
        setSyncStatus('loading');
        setSyncMessage('Đang dọn dẹp Cloud...');
        try {
          // Clear all employees in Firestore except this active cleanUser ID
          await clearAllEmployeesExceptAdmin([cleanUser.id]);
          // Push the active clean user as the only doc
          await pushEmployeeToFirestore(cleanUser);
          
          setSyncStatus('success');
          setSyncMessage('Đã dọn dẹp Cloud');
          triggerAlert('Thành công', 'Đã xóa sạch thành công toàn bộ dữ liệu mẫu cả cục bộ và trên đám mây Firestore! Hiện tại hệ thống chỉ còn duy nhất tài khoản của đồng chí với danh sách đầu việc trống, sẵn sàng để đồng chí đẩy dữ liệu chính thức vào.');
        } catch (err) {
          setSyncStatus('error');
          setSyncMessage('Lỗi dọn Cloud');
          triggerAlert('Lỗi đồng bộ', 'Đã xóa dữ liệu mẫu cục bộ, nhưng gặp lỗi khi dọn dẹp cơ sở dữ liệu đám mây Firestore. Vui lòng kiểm tra kết nối mạng của đồng chí.');
        }
      },
      'Xóa Sạch Toàn Bộ',
      'Hủy bỏ'
    );
  };

  // Delete an individual employee from local and Firestore
  const handleDeleteEmployee = async (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting employee in sidebar
    
    const targetEmp = employees.find(emp => emp.id === employeeId);
    if (!targetEmp) return;
    
    if (window.confirm(`Đồng chí có chắc chắn muốn xóa vĩnh viễn cán bộ "${targetEmp.name}" khỏi danh sách CẢ TRÊN MÁY NÀY VÀ TRÊN CLOUD không?`)) {
      const updated = employees.filter(emp => emp.id !== employeeId);
      
      // If the deleted employee was active, select another
      if (selectedEmployeeId === employeeId) {
        const nextActive = updated.find(emp => emp.id !== employeeId) || null;
        setSelectedEmployeeId(nextActive ? nextActive.id : '');
      }
      
      setEmployees(updated);
      localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));
      
      setSyncStatus('loading');
      setSyncMessage('Đang cập nhật Cloud...');
      try {
        await deleteEmployeeFromFirestore(employeeId);
        setSyncStatus('success');
        setSyncMessage('Đã đồng bộ');
        alert(`Đã xóa cán bộ "${targetEmp.name}" thành công!`);
      } catch (err) {
        setSyncStatus('error');
        setSyncMessage('Lỗi xóa Cloud');
        console.error(err);
        alert(`Đã xóa cán bộ "${targetEmp.name}" cục bộ, nhưng gặp lỗi đồng bộ Cloud.`);
      }
    }
  };

  // Open Edit Avatar Dialog
  const handleOpenEditAvatar = (empId: string) => {
    const target = employees.find(e => e.id === empId);
    if (target) {
      setAvatarTargetId(empId);
      setAvatarUrlInput(target.avatar);
      setIsEditingAvatar(true);
    }
  };

  // Save updated avatar URL/selection
  const handleSaveAvatar = (newUrl: string) => {
    if (!avatarTargetId) return;
    const finalUrl = newUrl.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face';
    
    setEmployees(prev => prev.map(emp => {
      if (emp.id === avatarTargetId) {
        const updated = { ...emp, avatar: finalUrl };
        if (currentUser && currentUser.id === emp.id) {
          // Sync current user too
          setCurrentUser(updated);
        }
        return updated;
      }
      return emp;
    }));
    
    setIsEditingAvatar(false);
    setAvatarTargetId(null);
  };

  // Bulk auto-fix: re-run the name-based heuristic (Phòng/Ban/Văn phòng ở đầu tên -> Phòng ban,
  // còn lại -> Đơn vị cơ sở) cho TOÀN BỘ cán bộ hiện có, không cần upload lại Excel.
  const handleAutoReclassifyAll = () => {
    if (!window.confirm('Hệ thống sẽ tự động phân loại lại TOÀN BỘ cán bộ (trừ Lãnh đạo/Admin) dựa trên tên phòng/đơn vị:\n- Tên bắt đầu bằng "Phòng", "Ban", "Văn phòng", "Thanh tra", "Chi cục" → Phòng ban\n- Còn lại (VD tên huyện/xã) → Đơn vị cơ sở\n\nĐồng chí có chắc chắn muốn tiếp tục?')) {
      return;
    }

    const deptSet = new Set<string>();
    const unitSet = new Set<string>();

    const updated = employees.map(emp => {
      if (emp.isAdmin || !emp.department) {
        return emp;
      }

      const deptLower = emp.department.toLowerCase();

      // Cột Phòng ban/Đơn vị có tên là "Lãnh đạo" (hoặc chứa "lãnh đạo") -> luôn tách riêng vào khối Ban Lãnh Đạo
      if (deptLower.includes('lãnh đạo')) {
        return emp.orgType === 'Ban Lãnh Đạo' ? emp : { ...emp, orgType: 'Ban Lãnh Đạo' as const };
      }

      if (emp.orgType === 'Lãnh đạo' || emp.orgType === 'Ban Lãnh Đạo') {
        // Người đã được xếp Lãnh đạo nhưng tên phòng/đơn vị không có chữ "lãnh đạo" -> giữ nguyên, không tự ý đổi
        return emp;
      }

      const looksLikePhongBanName =
        deptLower.startsWith('phòng ') || deptLower.startsWith('ban ') ||
        deptLower.startsWith('văn phòng') || deptLower.startsWith('thanh tra') ||
        deptLower.startsWith('chi cục') || deptLower.includes('phòng ban');

      const newOrgType: 'Phòng ban' | 'Đơn vị cơ sở' = looksLikePhongBanName ? 'Phòng ban' : 'Đơn vị cơ sở';
      if (newOrgType === 'Phòng ban') deptSet.add(emp.department);
      else unitSet.add(emp.department);

      return { ...emp, orgType: newOrgType };
    });

    setEmployees(updated);
    setDepartmentsRegion1(Array.from(deptSet));
    setUnitsRegion2(Array.from(unitSet));
    alert('Đã phân loại lại xong. Đồng chí vào bảng bên dưới kiểm tra lại, nếu còn đơn vị nào sai thì bấm nút sửa riêng cho đơn vị đó.');
  };

  // Bulk-fix: reassign ALL employees of a given department/unit name to the correct orgType
  // (dùng khi tên đơn vị thực tế không được hệ thống tự nhận diện đúng là Phòng ban hay Đơn vị cơ sở)
  const handleReclassifyDepartment = (deptName: string, newOrgType: 'Phòng ban' | 'Đơn vị cơ sở') => {
    setEmployees(prev => prev.map(emp =>
      emp.department === deptName && !emp.isAdmin && emp.orgType !== 'Lãnh đạo' && emp.orgType !== 'Ban Lãnh Đạo'
        ? { ...emp, orgType: newOrgType }
        : emp
    ));

    setDepartmentsRegion1(prevDepts => {
      const withoutDept = prevDepts.filter(d => d !== deptName);
      return newOrgType === 'Phòng ban' ? [...withoutDept, deptName] : withoutDept;
    });

    setUnitsRegion2(prevUnits => {
      const withoutDept = prevUnits.filter(u => u !== deptName);
      return newOrgType === 'Đơn vị cơ sở' ? [...withoutDept, deptName] : withoutDept;
    });
  };

  // Delete or reset evaluation data for a specific individual
  const handleResetOrDeleteEmployeeData = (employeeId: string, actionType: 'reset' | 'delete') => {
    if (!employeeId) {
      triggerAlert('Thông báo', 'Vui lòng chọn một cán bộ.');
      return;
    }
    const target = employees.find(e => e.id === employeeId);
    if (!target) return;

    if (actionType === 'delete') {
      triggerConfirm(
        'Xác nhận xóa cán bộ',
        `Đồng chí có chắc chắn muốn XÓA HOÀN TOÀN cán bộ "${target.name}"? Thao tác này sẽ xóa vĩnh viễn cán bộ khỏi hệ thống và không thể khôi phục!`,
        async () => {
          const updated = employees.filter(emp => emp.id !== employeeId);
          if (selectedEmployeeId === employeeId) {
            const nextActive = updated.find(emp => emp.id !== employeeId) || null;
            setSelectedEmployeeId(nextActive ? nextActive.id : '');
          }
          setEmployees(updated);
          localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));
          
          setSyncStatus('loading');
          setSyncMessage('Đang cập nhật Cloud...');
          try {
            await deleteEmployeeFromFirestore(employeeId);
            setSyncStatus('success');
            setSyncMessage('Đã đồng bộ');
            triggerAlert('Thành công', `Đã xóa hoàn toàn cán bộ "${target.name}" thành công!`);
            setDeleteTargetEmployeeId('');
          } catch (err) {
            setSyncStatus('error');
            setSyncMessage('Lỗi xóa Cloud');
            console.error(err);
            triggerAlert('Cảnh báo đồng bộ', `Đã xóa cán bộ "${target.name}" cục bộ, nhưng gặp lỗi đồng bộ Cloud.`);
          }
        },
        'Xóa Hoàn Toàn',
        'Hủy bỏ'
      );
    } else {
      // Reset mode
      triggerConfirm(
        'Xác nhận khởi tạo lại đánh giá',
        `Đồng chí có chắc chắn muốn KHỞI TẠO LẠI (XÓA DỮ LIỆU ĐÁNH GIÁ) của cán bộ "${target.name}"? Thao tác này sẽ xóa sạch: Nhật ký thực tế hoàn thành (Biểu mẫu 01), các câu tự đánh giá, điểm tiêu chí chung và chữ ký số. Cán bộ vẫn tồn tại trong hệ thống.`,
        async () => {
          const updated = employees.map(emp => {
            if (emp.id === employeeId) {
              return {
                ...emp,
                selfAssessmentNote: "",
                departmentHeadAssessmentNote: "",
                managerAssessmentNote: "",
                tutuongChinhTri: undefined,
                phamChatDaoDuc: undefined,
                tacPhongLeLoi: undefined,
                yThucKyLuat: undefined,
                hanCheKhuyetDiem: undefined,
                bienPhapKhacPhuc: undefined,
                tuNhanXepLoai: undefined,
                diemI1: undefined,
                diemI2: undefined,
                diemII1: undefined,
                diemII2: undefined,
                diemII3: undefined,
                diemII4: undefined,
                diemIII1: undefined,
                diemIII2: undefined,
                diemIII3: undefined,
                diemIII4: undefined,
                selfSignedCA: false,
                selfSignedCADate: undefined,
                deptHeadSignedCA: false,
                deptHeadSignedCADate: undefined,
                managerSignedCA: false,
                managerSignedCADate: undefined,
                tasks: emp.tasks.map(t => ({
                  ...t,
                  actualQtyCount: 0,
                  actualQualityCount: 0,
                  actualProgressCount: 0,
                }))
              };
            }
            return emp;
          });
          setEmployees(updated);
          localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));
          
          setSyncStatus('loading');
          setSyncMessage('Đang cập nhật Cloud...');
          try {
            const resetTarget = updated.find(emp => emp.id === employeeId);
            if (resetTarget) {
              await pushEmployeeToFirestore(resetTarget);
            }
            setSyncStatus('success');
            setSyncMessage('Đã đồng bộ');
            triggerAlert('Thành công', `Đã khởi tạo lại dữ liệu đánh giá của cán bộ "${target.name}" thành công!`);
            setDeleteTargetEmployeeId('');
          } catch (err) {
            setSyncStatus('error');
            setSyncMessage('Lỗi cập nhật Cloud');
            console.error(err);
            triggerAlert('Cảnh báo đồng bộ', `Đã khởi tạo lại cục bộ của cán bộ "${target.name}", nhưng gặp lỗi đồng bộ Cloud.`);
          }
        },
        'Khởi Tạo Lại',
        'Hủy bỏ'
      );
    }
  };

  // Delete or reset data for a specific department/unit
  const handleResetOrDeleteDeptData = (deptName: string, actionType: 'reset' | 'delete') => {
    if (!deptName) {
      triggerAlert('Thông báo', 'Vui lòng chọn một phòng ban hoặc đơn vị.');
      return;
    }

    const affectedEmps = employees.filter(emp => emp.department === deptName);
    if (affectedEmps.length === 0) {
      triggerAlert('Thông báo', 'Không tìm thấy cán bộ nào thuộc phòng ban/đơn vị này.');
      return;
    }

    if (actionType === 'delete') {
      triggerConfirm(
        'Xác nhận xóa cả đơn vị',
        `Đồng chí có chắc chắn muốn XÓA HOÀN TOÀN toàn bộ ${affectedEmps.length} cán bộ thuộc phòng ban/đơn vị "${deptName}" không? Thao tác này sẽ xóa vĩnh viễn dữ liệu và tài khoản của họ!`,
        async () => {
          const updated = employees.filter(emp => emp.department !== deptName);
          
          // If selected employee was deleted, pick another
          if (employees.find(emp => emp.id === selectedEmployeeId)?.department === deptName) {
            const nextActive = updated[0] || null;
            setSelectedEmployeeId(nextActive ? nextActive.id : '');
          }

          setEmployees(updated);
          localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));

          setSyncStatus('loading');
          setSyncMessage('Đang cập nhật Cloud...');
          try {
            // Delete each from Firestore
            for (const emp of affectedEmps) {
              await deleteEmployeeFromFirestore(emp.id);
            }
            setSyncStatus('success');
            setSyncMessage('Đã đồng bộ');
            triggerAlert('Thành công', `Đã xóa hoàn toàn phòng ban/đơn vị "${deptName}" (${affectedEmps.length} cán bộ) thành công!`);
            setDeleteTargetDeptName('');
          } catch (err) {
            setSyncStatus('error');
            setSyncMessage('Lỗi xóa Cloud');
            console.error(err);
            triggerAlert('Cảnh báo đồng bộ', `Đã xóa phòng ban/đơn vị cục bộ, nhưng gặp lỗi đồng bộ Cloud.`);
          }
        },
        'Xóa Sạch Đơn Vị',
        'Hủy bỏ'
      );
    } else {
      // Reset mode
      triggerConfirm(
        'Xác nhận khởi tạo lại đánh giá đơn vị',
        `Đồng chí có chắc chắn muốn KHỞI TẠO LẠI (XÓA SẠCH ĐÁNH GIÁ) cho toàn bộ ${affectedEmps.length} cán bộ thuộc phòng ban/đơn vị "${deptName}" không? Tất cả nhật ký thực tế, đánh giá, điểm tiêu chí chung, chữ ký số sẽ bị xóa về mặc định.`,
        async () => {
          const updated = employees.map(emp => {
            if (emp.department === deptName) {
              return {
                ...emp,
                selfAssessmentNote: "",
                departmentHeadAssessmentNote: "",
                managerAssessmentNote: "",
                tutuongChinhTri: undefined,
                phamChatDaoDuc: undefined,
                tacPhongLeLoi: undefined,
                yThucKyLuat: undefined,
                hanCheKhuyetDiem: undefined,
                bienPhapKhacPhuc: undefined,
                tuNhanXepLoai: undefined,
                diemI1: undefined,
                diemI2: undefined,
                diemII1: undefined,
                diemII2: undefined,
                diemII3: undefined,
                diemII4: undefined,
                diemIII1: undefined,
                diemIII2: undefined,
                diemIII3: undefined,
                diemIII4: undefined,
                selfSignedCA: false,
                selfSignedCADate: undefined,
                deptHeadSignedCA: false,
                deptHeadSignedCADate: undefined,
                managerSignedCA: false,
                managerSignedCADate: undefined,
                tasks: emp.tasks.map(t => ({
                  ...t,
                  actualQtyCount: 0,
                  actualQualityCount: 0,
                  actualProgressCount: 0,
                }))
              };
            }
            return emp;
          });
          setEmployees(updated);
          localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));
          
          setSyncStatus('loading');
          setSyncMessage('Đang cập nhật Cloud...');
          try {
            const resetTargets = updated.filter(emp => emp.department === deptName);
            for (const emp of resetTargets) {
              await pushEmployeeToFirestore(emp);
            }
            setSyncStatus('success');
            setSyncMessage('Đã đồng bộ');
            triggerAlert('Thành công', `Đã khởi tạo lại toàn bộ dữ liệu đánh giá của phòng ban/đơn vị "${deptName}" thành công!`);
            setDeleteTargetDeptName('');
          } catch (err) {
            setSyncStatus('error');
            setSyncMessage('Lỗi cập nhật Cloud');
            console.error(err);
            triggerAlert('Cảnh báo đồng bộ', `Đã khởi tạo lại cục bộ phòng ban/đơn vị "${deptName}", nhưng gặp lỗi đồng bộ Cloud.`);
          }
        },
        'Khởi Tạo Lại Đơn Vị',
        'Hủy bỏ'
      );
    }
  };

  // Reset assessment data for all employees in the system
  const handleResetAllEmployeesAssessments = () => {
    triggerConfirm(
      'Xác nhận khởi tạo lại toàn bộ hệ thống',
      'CẢNH BÁO: Đồng chí có chắc chắn muốn KHỞI TẠO LẠI (XÓA SẠCH ĐÁNH GIÁ) cho TOÀN BỘ cán bộ trong hệ thống? Tất cả nhật ký thực tế hoàn thành, nhận xét, điểm tiêu chí chung, xếp loại tự động và chữ ký số của tất cả các cán bộ sẽ được trả về trống. Dữ liệu nhân sự và phân bổ đầu việc vẫn được giữ nguyên.',
      async () => {
        const updated = employees.map(emp => ({
          ...emp,
          selfAssessmentNote: "",
          departmentHeadAssessmentNote: "",
          managerAssessmentNote: "",
          tutuongChinhTri: undefined,
          phamChatDaoDuc: undefined,
          tacPhongLeLoi: undefined,
          yThucKyLuat: undefined,
          hanCheKhuyetDiem: undefined,
          bienPhapKhacPhuc: undefined,
          tuNhanXepLoai: undefined,
          diemI1: undefined,
          diemI2: undefined,
          diemII1: undefined,
          diemII2: undefined,
          diemII3: undefined,
          diemII4: undefined,
          diemIII1: undefined,
          diemIII2: undefined,
          diemIII3: undefined,
          diemIII4: undefined,
          selfSignedCA: false,
          selfSignedCADate: undefined,
          deptHeadSignedCA: false,
          deptHeadSignedCADate: undefined,
          managerSignedCA: false,
          managerSignedCADate: undefined,
          tasks: emp.tasks.map(t => ({
            ...t,
            actualQtyCount: 0,
            actualQualityCount: 0,
            actualProgressCount: 0,
          }))
        }));

        setEmployees(updated);
        localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(updated));

        setSyncStatus('loading');
        setSyncMessage('Đang đồng bộ Cloud...');
        try {
          for (const emp of updated) {
            await pushEmployeeToFirestore(emp);
          }
          setSyncStatus('success');
          setSyncMessage('Đã đồng bộ');
          triggerAlert('Thành công', 'Đã khởi tạo lại toàn bộ dữ liệu đánh giá của toàn hệ thống thành công và đồng bộ lên đám mây Firestore!');
        } catch (err) {
          setSyncStatus('error');
          setSyncMessage('Lỗi đồng bộ Cloud');
          console.error(err);
          triggerAlert('Cảnh báo đồng bộ', 'Đã reset dữ liệu đánh giá cục bộ thành công, nhưng gặp lỗi khi đồng bộ lên đám mây Firestore.');
        }
      },
      'Khởi Tạo Lại Toàn Đơn Vị',
      'Hủy bỏ'
    );
  };

  // Manually add new employee
  const handleManualAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      alert('Vui lòng nhập họ và tên cán bộ.');
      return;
    }
    if (!newEmpUsername.trim()) {
      alert('Vui lòng nhập tên đăng nhập.');
      return;
    }

    // Check username duplicates
    const isDuplicate = employees.some(emp => emp.username?.toLowerCase() === newEmpUsername.trim().toLowerCase());
    if (isDuplicate) {
      alert('Tên đăng nhập này đã được sử dụng. Vui lòng nhập tên khác.');
      return;
    }

    const newEmpId = `emp-manual-${Date.now()}`;
    const newEmployee: Employee = {
      id: newEmpId,
      name: newEmpName.trim(),
      role: newEmpRole.trim() || 'Cán bộ',
      department: newEmpDept.trim() || 'CTNE',
      avatar: newEmpAvatar,
      evaluationPeriod: 'Tháng 07 / Năm 2026',
      username: newEmpUsername.trim().toLowerCase(),
      password: newEmpPassword.trim() || '123456',
      isAdmin: false,
      orgType: newEmpOrgType,
      tasks: []
    };

    setEmployees(prev => [...prev, newEmployee]);
    
    // Clear form state
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpDept('');
    setNewEmpUsername('');
    setNewEmpPassword('123456');
    setIsAddingNewEmployee(false);
    
    // Select this employee immediately to make editing easier
    setSelectedEmployeeId(newEmpId);

    // Dynamic addition to department lists if not already existing
    if (newEmpOrgType === 'Phòng ban') {
      if (newEmpDept && !departmentsRegion1.includes(newEmpDept)) {
        const updatedDepts = [...departmentsRegion1, newEmpDept];
        setDepartmentsRegion1(updatedDepts);
        localStorage.setItem('civil_service_kpi_departments_v3', JSON.stringify(updatedDepts));
      }
    } else {
      if (newEmpDept && !unitsRegion2.includes(newEmpDept)) {
        const updatedUnits = [...unitsRegion2, newEmpDept];
        setUnitsRegion2(updatedUnits);
        localStorage.setItem('civil_service_kpi_units_v3', JSON.stringify(updatedUnits));
      }
    }

    alert(`Đã thêm thành công cán bộ ${newEmployee.name} vào hệ thống.`);
  };

  // Apply preset template form (Mẫu chấm điểm 1, 2, 3)
  const handleApplyTemplate = (templateKey: 'template1' | 'template2' | 'template3') => {
    if (isQuarterLocked || !canEditActiveEmployee) return;
    if (!activeEmployee) return;
    const templateName = templateKey === 'template1' ? 'Mẫu chấm điểm 1' : templateKey === 'template2' ? 'Mẫu chấm điểm 2' : 'Mẫu chấm điểm 3';
    if (window.confirm(`Đồng chí có chắc muốn tải lên và áp dụng nhanh "${templateName}" cho cán bộ ${activeEmployee.name} không? Các nhiệm vụ hiện tại của cán bộ này sẽ được thay thế.`)) {
      const template = SAMPLE_KPI_TEMPLATES[templateKey];
      // Generate unique IDs for the template tasks to avoid conflicts
      const mappedTasks = template.tasks.map((t, idx) => ({
        ...t,
        id: `applied-${templateKey}-${idx}-${Date.now()}`
      }));
      setEmployees(prev => prev.map(emp => {
        if (emp.id === activeEmployee.id) {
          return {
            ...emp,
            tasks: mappedTasks
          };
        }
        return emp;
      }));
    }
  };

  // Active Employee summary metrics
  const activeEmployeeSummary = useMemo(() => {
    if (!activeEmployee) return null;
    return calculateKPIResultSummary(activeEmployee.tasks);
  }, [activeEmployee]);

  // Handle login request
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const normalizedUsername = loginUsername.trim().toLowerCase();
    const normalizedPassword = loginPassword.trim();

    // Check pre-configured employees
    let matchedUser = employees.find(
      emp => emp.username?.toLowerCase() === normalizedUsername && emp.password === normalizedPassword
    );

    // Support generic 'admin' login shorthand or email
    if (!matchedUser && (normalizedUsername === 'admin' || normalizedUsername === 'admin@nso.gov.vn') && normalizedPassword === 'admin123') {
      matchedUser = employees.find(emp => emp.isAdmin);
      if (!matchedUser) {
        const adminFromDefaults = INITIAL_EMPLOYEES.find(e => e.isAdmin);
        if (adminFromDefaults) {
          matchedUser = adminFromDefaults;
          setEmployees(prev => [adminFromDefaults, ...prev]);
        }
      }
    }

    if (matchedUser) {
      setCurrentUser(matchedUser);
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại!');
    }
  };

  // Auto fill credentials for testing convenience
  const handleQuickLogin = (uname: string, pass: string) => {
    setLoginUsername(uname);
    setLoginPassword(pass);
    setLoginError('');
    
    let matchedUser = employees.find(
      emp => emp.username?.toLowerCase() === uname.toLowerCase() && emp.password === pass
    );

    // Dynamic recovery fallback for admin or other default test accounts if missing from localStorage
    if (!matchedUser) {
      const defaultMatch = INITIAL_EMPLOYEES.find(
        emp => emp.username?.toLowerCase() === uname.toLowerCase() && emp.password === pass
      );
      if (defaultMatch) {
        matchedUser = defaultMatch;
        setEmployees(prev => [defaultMatch, ...prev]);
      }
    }

    if (matchedUser) {
      setCurrentUser(matchedUser);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setIsViewingScorecard(false);
  };

  // Success Callback for Bulk Import Users Excel
  const handleSuccessImportUsers = (newUsers: Employee[]) => {
    // Collect all departments / units dynamically from newUsers first
    const deptSet = new Set<string>();
    const unitSet = new Set<string>();

    // 1. Process newUsers in order of appearance in Excel
    newUsers.forEach(nu => {
      if (!nu.isAdmin && nu.department) {
        if (nu.orgType === 'Phòng ban') {
          deptSet.add(nu.department);
        } else if (nu.orgType === 'Đơn vị cơ sở') {
          unitSet.add(nu.department);
        }
      }
    });

    // 2. Compute updated employees array
    const updatedEmployees = [...employees];
    newUsers.forEach(nu => {
      const existingIdx = updatedEmployees.findIndex(u => u.username?.toLowerCase() === nu.username?.toLowerCase());
      if (existingIdx >= 0) {
        updatedEmployees[existingIdx] = {
          ...updatedEmployees[existingIdx],
          ...nu,
          id: updatedEmployees[existingIdx].id, // Keep original stable ID
          // Keep tasks if they exist
          tasks: updatedEmployees[existingIdx].tasks.length > 0 ? updatedEmployees[existingIdx].tasks : nu.tasks
        };
      } else {
        updatedEmployees.push(nu);
      }
    });

    // 3. Process existing employees to ensure we don't lose any other departments/units, but they go to the end of the lists
    updatedEmployees.forEach(u => {
      if (!u.isAdmin && u.department) {
        if (u.orgType === 'Phòng ban') {
          deptSet.add(u.department);
        } else if (u.orgType === 'Đơn vị cơ sở') {
          unitSet.add(u.department);
        }
      }
    });

    // Update employees state
    setEmployees(updatedEmployees);

    // Save lists to state and localStorage
    if (deptSet.size > 0) {
      const depts = Array.from(deptSet);
      setDepartmentsRegion1(depts);
      localStorage.setItem('civil_service_kpi_departments_v3', JSON.stringify(depts));
    }
    if (unitSet.size > 0) {
      const units = Array.from(unitSet);
      setUnitsRegion2(units);
      localStorage.setItem('civil_service_kpi_units_v3', JSON.stringify(units));
    }
    
    // Auto-select the first imported user to show details
    if (newUsers.length > 0) {
      setSelectedEmployeeId(newUsers[0].id);
    }
    
    alert(`Đã thêm/cập nhật thành công ${newUsers.length} cán bộ công chức vào hệ thống. Các phòng ban và đơn vị cơ sở đã được tự động sắp xếp (7 cơ sở đầu tiên là Vùng 1, còn lại là Vùng 2).`);
    setUploadModalType(null);
  };

  // Success Callback for Monthly Task Import Excel
  const handleSuccessImportTasks = (newTasks: CivilServiceTask[]) => {
    if (!activeEmployee) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id === activeEmployee.id) {
        return {
          ...emp,
          tasks: newTasks
        };
      }
      return emp;
    }));
    
    alert(`Đã tải lên báo cáo và cập nhật thành công ${newTasks.length} nhiệm vụ công việc cho đồng chí ${activeEmployee.name}.`);
    setUploadModalType(null);
  };

  const handleSuccessImportMultiTasks = (tasksByEmployeeId: Record<string, CivilServiceTask[]>) => {
    setEmployees(prev => prev.map(emp => {
      if (tasksByEmployeeId[emp.id]) {
        return {
          ...emp,
          tasks: tasksByEmployeeId[emp.id]
        };
      }
      return emp;
    }));
    
    const totalCount = Object.values(tasksByEmployeeId).reduce((sum, tasks) => sum + tasks.length, 0);
    const numEmployees = Object.keys(tasksByEmployeeId).length;
    
    alert(`Đã tải lên báo cáo và phân bổ thành công ${totalCount} nhiệm vụ công việc cho ${numEmployees} cán bộ dựa trên kết quả so khớp tên.`);
    setUploadModalType(null);
  };

  // Render Login page if not authenticated
  if (!currentUser) {
    return (
      <div id="login-container" className="min-h-screen flex flex-col justify-center items-center bg-[#f1f5f9] px-4 py-12 selection:bg-red-100">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
          {/* Top aesthetic red banner standard for state apps */}
          <div className="bg-red-700 p-6 text-white text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400"></div>
            {/* Khối Logo mới thay thế cho Shield */}
              <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/20 p-2 overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              
            <h1 className="text-sm font-black uppercase tracking-wider">Hệ Thống Thông Tin Đánh Giá KPI Công Vụ</h1>
            <p className="text-[10px] text-yellow-300 font-bold tracking-widest uppercase mt-1">THỐNG KÊ TỈNH HƯNG YÊN</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-8 space-y-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Đăng nhập hệ thống</h2>

            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Tên đăng nhập / Email</label>
                <input 
                  type="text"
                  required
                  placeholder="VD: nvanhhye@nso.nov.vn hoặc admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-red-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Mật khẩu</label>
                <input 
                  type="password"
                  required
                  placeholder="Nhập mật khẩu"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-red-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 mb-[3cm]"
            >
              <LogIn className="w-4 h-4" />
              Đăng Nhập
            </button>
          </form>

          
        </div>
      </div>
    );
  }

  return (
    <div id="app-container" className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] text-slate-800 antialiased selection:bg-emerald-100">
      
      {/* LEFT SIDEBAR - Desktop - Styled exactly like the uploaded reference image (Haze Dashboard) */}
      <aside id="desktop-sidebar" className="hidden md:flex flex-col w-64 bg-[#0f172a] text-slate-300 border-r border-slate-800 shrink-0 fixed h-screen z-40 select-none shadow-sm">
        
        {/* Sidebar Brand Section */}
          <div className="p-5 border-b border-white/5 flex items-center gap-4 group transition-all duration-300">
            {/* Logo thay thế cho badge chữ K */}
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain shrink-0" 
            />
            
            {/* Brand Titles */}
            <div className="flex flex-col text-left truncate">
              <span className="text-[13px] font-extrabold text-white uppercase tracking-[0.02em] leading-tight">
                Hệ thống chỉ số KPI
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold tracking-[0.1em] uppercase opacity-80 mt-0.5">
                Thống kê Tỉnh Hưng Yên
              </span>
            </div>
          </div>

        {/* Sidebar Navigation & Action Buttons */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          
          {/* Section: Bảng điều khiển */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-2">CHUNG</span>
            <div className="space-y-1">
              {isLeaderOrAdmin && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('dashboard'); setIsViewingScorecard(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'dashboard' && !isViewingScorecard
                      ? 'bg-slate-800/90 text-emerald-400 shadow-sm border-l-4 border-emerald-500 font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'dashboard' ? 'text-emerald-400 scale-110' : 'text-slate-400'}`} />
                  <span>Tổng Quan</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => { setActiveTab('employees'); setIsViewingScorecard(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeTab === 'employees' && !isViewingScorecard
                    ? 'bg-slate-800/90 text-amber-300 shadow-sm border-l-4 border-amber-500 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Users className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'employees' ? 'text-amber-400 scale-110 animate-pulse' : 'text-slate-400'}`} />
                <span>{isLeaderOrAdmin ? 'Đánh Giá KPI' : 'KPI Cá Nhân'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('instructions'); setIsViewingScorecard(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeTab === 'instructions' && !isViewingScorecard
                    ? 'bg-slate-800/90 text-emerald-400 shadow-sm border-l-4 border-emerald-500 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <HelpCircle className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'instructions' ? 'text-emerald-400 scale-110' : 'text-slate-400'}`} />
                <span>Nội Dung Quy Chế</span>
              </button>
            </div>
          </div>

          {/* Section: Công cụ & Dữ liệu (Only shown for Admin/Leaders) */}
          {(canManageData || isLeadLeader) && (
            <div className="space-y-2 border-t border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => setIsDataDropdownOpen(!isDataDropdownOpen)}
                className="w-full flex items-center justify-between px-2 py-1 rounded-xl text-[10px] font-black text-slate-400 tracking-wider uppercase hover:text-white hover:bg-slate-800/20 transition-all cursor-pointer"
              >
                <span>{canManageData ? 'QUẢN TRỊ DỮ LIỆU' : 'CHỨC NĂNG LÃNH ĐẠO'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDataDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDataDropdownOpen && (
                <div className="space-y-1 pl-1 text-xs transition-all duration-200">
                  {/* Sổ khóa chốt điểm */}
                  <button
                    type="button"
                    onClick={toggleQuarterLock}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
                      isQuarterLocked
                        ? 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border-rose-900/50'
                        : 'bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border-emerald-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isQuarterLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Sổ Quý II: {isQuarterLocked ? 'Khóa' : 'Mở'}</span>
                    </div>
                  </button>

                  {canManageData && (
                    <>
                      {/* Tải dữ liệu cán bộ Excel */}
                      <button
                        type="button"
                        onClick={downloadUserDataExcel}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer text-left font-bold"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tải Excel Cán Bộ</span>
                      </button>

                      {/* Nhập cán bộ từ Excel */}
                      <button
                        type="button"
                        onClick={() => setUploadModalType('users')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer text-left font-bold"
                      >
                        <FileUp className="w-3.5 h-3.5 text-blue-400" />
                        <span>Nhập Excel Cán Bộ</span>
                      </button>

                      {/* Thêm cán bộ thủ công */}
                      <button
                        type="button"
                        onClick={() => setIsAddingNewEmployee(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer text-left font-bold"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                        <span>Thêm Cán Bộ Thủ Công</span>
                      </button>

                      {/* Xóa dữ liệu mẫu & nạp thật / Sửa phân loại Phòng ban - Đơn vị cơ sở */}
                      <button
                        type="button"
                        onClick={() => setIsDataManagementOpen(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-800/40 transition-colors cursor-pointer text-left font-bold relative"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Quản Lý & Sửa Dữ Liệu</span>
                        {hasMisclassifiedDepartments && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" title="Có đơn vị đang bị phân loại lẫn - cần kiểm tra" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section: Lịch Tháng Báo Cáo (Shown for everyone) */}
          <div className="space-y-2.5 border-t border-slate-800/60 pt-4 px-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">LỊCH THÁNG BÁO CÁO</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(prev => prev - 1);
                      } else {
                        setCalendarMonth(prev => prev - 1);
                      }
                      setSelectedCalendarDay(null); // Clear selected day when changing month
                    }}
                    className="px-1.5 py-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
                  >
                    &larr;
                  </button>
                  <span className="text-[10px] text-slate-300 font-extrabold font-mono">
                    Tháng {(calendarMonth + 1).toString().padStart(2, '0')} / {calendarYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(prev => prev + 1);
                      } else {
                        setCalendarMonth(prev => prev + 1);
                      }
                      setSelectedCalendarDay(null); // Clear selected day when changing month
                    }}
                    className="px-1.5 py-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
              <span className="text-[8px] text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/60 leading-none uppercase">
                {calendarMonth >= 0 && calendarMonth <= 2 ? 'Quý I' : 
                 calendarMonth >= 3 && calendarMonth <= 5 ? 'Quý II' : 
                 calendarMonth >= 6 && calendarMonth <= 8 ? 'Quý III' : 'Quý IV'}
              </span>
            </div>
            
            {/* Month Calendar Grid */}
            <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60 space-y-1.5 select-none">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(header => (
                  <span key={header} className="text-[8px] font-extrabold text-slate-500 uppercase leading-none py-1">
                    {header}
                  </span>
                ))}
              </div>
 
              {/* Day Numbers Grid (Dynamic month generation) */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const startDayOfWeek = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
                  const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                  const daysArray: (number | null)[] = [];
                  for (let i = 0; i < startDayOfWeek; i++) {
                    daysArray.push(null);
                  }
                  for (let d = 1; d <= totalDaysInMonth; d++) {
                    daysArray.push(d);
                  }

                  return daysArray.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="w-full aspect-square" />;
                    }

                    const hasDeadlines = checkDayHasDeadlines(day, calendarMonth, calendarYear);
                    const isSelected = selectedCalendarDay === day && selectedCalendarMonth === calendarMonth && selectedCalendarYear === calendarYear;
                    
                    const todayObj = new Date();
                    const isToday = day === todayObj.getDate() && calendarMonth === todayObj.getMonth() && calendarYear === todayObj.getFullYear();

                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        onClick={() => {
                          if (selectedCalendarDay === day && selectedCalendarMonth === calendarMonth && selectedCalendarYear === calendarYear) {
                            setSelectedCalendarDay(null);
                          } else {
                            setSelectedCalendarDay(day);
                            setSelectedCalendarMonth(calendarMonth);
                            setSelectedCalendarYear(calendarYear);
                            if (isLeaderOrAdmin) {
                              setActiveTab('dashboard');
                            }
                          }
                        }}
                        className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg transition-all relative ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-900 font-black shadow-md scale-105'
                            : isToday
                            ? 'bg-slate-800/80 text-amber-300 font-extrabold border border-amber-500/30'
                            : hasDeadlines
                            ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200 hover:bg-amber-900/60 hover:text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                        }`}
                        title={hasDeadlines ? `Ngày ${day}/${(calendarMonth + 1).toString().padStart(2, '0')}/${calendarYear}: Có báo cáo/nhiệm vụ` : undefined}
                      >
                        <span className="text-[10px] font-bold leading-none">{day}</span>
                        
                        {/* Beautiful golden/yellow indicator dot for deadlines */}
                        {hasDeadlines && (
                          <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                            isSelected 
                              ? 'bg-slate-950' 
                              : 'bg-amber-400 border border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
                          }`} />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Micro status or hint */}
            <div className="text-[8px] text-slate-500 italic text-left pl-1">
              * Nhấn ngày có <span className="inline-block w-1 h-1 bg-amber-400 rounded-full"></span> để lọc nhanh báo cáo đến hạn.
            </div>
          </div>
        </div>

        {/* Sidebar Footer - Profile Summary */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 truncate">
            <img 
              src={currentUser?.avatar} 
              alt={currentUser?.name} 
              className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="text-left truncate">
              <p className="text-xs font-black text-white truncate leading-tight">{currentUser?.name}</p>
              <p className="text-[9px] text-slate-500 truncate mt-0.5">{currentUser?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-950 rounded-lg transition-all cursor-pointer shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR NAVIGATION */}
      <header id="mobile-header" className="md:hidden flex items-center justify-between bg-[#0f172a] text-white py-3 px-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-display text-white font-black text-xs shadow-md shrink-0">
            K
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">KPI Hub</h1>
            <p className="text-[8px] text-emerald-400 font-extrabold tracking-wide">
              {currentUser?.department || 'Ban Ngành Nhà Nước'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLeaderOrAdmin && (
            <button
              type="button"
              onClick={toggleQuarterLock}
              className={`p-1.5 rounded-lg border text-[9px] font-bold ${
                isQuarterLocked ? 'bg-rose-950/40 text-rose-300 border-rose-900/50' : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50'
              }`}
            >
              {isQuarterLocked ? 'Khóa' : 'Mở'}
            </button>
          )}
          <img 
            src={currentUser?.avatar} 
            alt={currentUser?.name} 
            className="w-7 h-7 rounded-full object-cover border border-slate-700" 
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={handleLogout}
            className="p-1 text-rose-400 hover:text-white"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER (Shifted on Desktop because of fixed sidebar) */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        
        {/* DESKTOP TOP BAR HEADER (Styled exactly like references) */}
        <header id="desktop-top-bar" className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-30 shadow-3xs select-none">
          
          {/* Breadcrumbs Left Side - Modernized */}
          <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-400">
            {/* Icon Trang Chủ (Bạn cần đảm bảo đã cài lucide-react hoặc tương tự) */}
            <span className="hover:text-emerald-500 transition-colors duration-200 cursor-pointer">
              Trang chủ
            </span>
            
            <span className="text-slate-600">/</span>
            
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="uppercase tracking-[0.1em]">
                {activeTab === 'dashboard' 
                  ? 'Tổng Quan Báo Cáo' 
                  : activeTab === 'employees' 
                    ? 'Đánh Giá & Chấm Điểm KPI' 
                    : 'Nội Dung Quy Chế'}
              </span>
            </div>
          </div>

          {/* Decorative Tools & User Info Right Side matching reference */}
          <div className="flex items-center space-x-4">
            
            {/* Search, Book, Moon and Language icons matching the reference image */}
            <div className="flex items-center space-x-2.5 text-slate-400 border-r border-slate-200 pr-4">
              <button className="p-1 hover:text-slate-600 transition-colors" title="Tìm kiếm"><Search className="w-4 h-4" /></button>
              <button className="p-1 hover:text-slate-600 transition-colors" title="Tài liệu quy định"><FileText className="w-4 h-4" /></button>
              <button className="p-1 hover:text-slate-600 transition-colors" title="Thời gian"><Clock className="w-4 h-4" /></button>
              <div className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-600 cursor-pointer transition-colors" title="Ngôn ngữ">
                <span>🇻🇳</span>
                <span className="text-[9px] uppercase font-bold text-slate-700">VI</span>
              </div>
            </div>

            {/* Cloud Sync State Indicators */}
            <div className={`flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              syncStatus === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : syncStatus === 'loading'
                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'success' ? 'bg-emerald-500' : syncStatus === 'loading' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'}`} />
              <span>{syncMessage}</span>
            </div>

            {/* User Profile display */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1 pr-3 rounded-full">
              <img 
                src={currentUser?.avatar} 
                alt={currentUser?.name} 
                className="w-7 h-7 rounded-full object-cover border border-slate-300 shadow-3xs" 
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-700 leading-tight truncate max-w-[120px]">{currentUser?.name}</p>
                <p className="text-[8px] text-slate-400 truncate mt-0.5 leading-none">{currentUser?.department}</p>
              </div>
            </div>
          </div>
        </header>

        {/* MOBILE BOTTOM NAVIGATION TABS */}
        <nav id="mobile-tabs" className="md:hidden bg-white border-t border-slate-200 flex p-1.5 fixed bottom-0 left-0 w-full z-30 justify-around shadow-lg">
          {isLeaderOrAdmin && (
            <button
              onClick={() => { setActiveTab('dashboard'); setIsViewingScorecard(false); }}
              className={`flex-1 flex flex-col items-center py-1 text-[9px] font-bold transition-colors cursor-pointer ${
                activeTab === 'dashboard' && !isViewingScorecard ? 'text-emerald-600 font-bold' : 'text-slate-400'
              }`}
            >
              <BarChart3 className="w-4 h-4 mb-0.5" />
              Tổng Quan
            </button>
          )}
          <button
            onClick={() => { setActiveTab('employees'); setIsViewingScorecard(false); }}
            className={`flex-1 flex flex-col items-center py-1 text-[9px] font-bold transition-colors cursor-pointer ${
              activeTab === 'employees' && !isViewingScorecard ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            {isLeaderOrAdmin ? 'Đánh Giá' : 'KPI Cá Nhân'}
          </button>
          <button
            onClick={() => { setActiveTab('instructions'); setIsViewingScorecard(false); }}
            className={`flex-1 flex flex-col items-center py-1 text-[9px] font-bold transition-colors cursor-pointer ${
              activeTab === 'instructions' && !isViewingScorecard ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}
          >
            <HelpCircle className="w-4 h-4 mb-0.5" />
            Quy Chế
          </button>
        </nav>

        {/* MAIN BODY CONTENT AREA */}
        <main className="flex-1 w-full mx-auto p-4 md:p-6 pb-20 md:pb-12 text-slate-700 select-text">
          
          {/* VIEW 1: Formal State-Style Report Export Screen */}
          {isViewingScorecard && activeEmployee ? (
            <ScorecardExport 
              employee={activeEmployee} 
              onBack={() => setIsViewingScorecard(false)} 
              isQuarterLocked={isQuarterLocked}
            />
          ) : (
            <>
              {/* WELCOME BANNER - Styled exactly like the Pine-Green Banner in the reference image */}
              <div 
                id="welcome-dashboard-banner" 
                className="bg-[#054a37] text-white p-5 md:p-6 rounded-3xl mb-6 border border-emerald-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none relative overflow-hidden"
              >
                {/* Visual subtle wave pattern overlay simulation */}
                <div className="space-y-1.5 z-10 text-left">
                  {/* Tiêu đề chính: Sử dụng font đậm, khoảng cách chữ hẹp để tạo cảm giác uy quyền */}
                  <h2 className="text-lg md:text-1xl font-extrabold tracking-tight text-white/95">
                    Xin chào, {currentUser?.name}!
                  </h2>
                  
                  {/* Đoạn mô tả: Sử dụng font chữ mảnh hơn (light/medium), tăng khoảng cách dòng để dễ đọc */}
                  <p className="text-[13px] text-emerald-100/70 font-medium tracking-wide leading-relaxed">
                    {isLeaderOrAdmin 
                      ? (
                        <>
                          Hệ thống Thống kê tỉnh Hưng Yên với 
                          <span className="text-emerald-400 font-bold"> {employees.filter(e => !e.isAdmin).length} cán bộ</span>. 
                          Ghi nhận tổng số <span className="text-emerald-400 font-bold">{globalStats.totalTasks} đầu việc</span>.
                        </>
                      ) 
                      : (
                        <>
                          Hồ sơ thuộc <span className="text-emerald-300 font-semibold">{currentUser?.department}</span>. 
                          Bạn đang có <span className="text-emerald-300 font-semibold">{currentUser?.tasks.length || 0} mục tiêu</span> công việc cần thực hiện.
                        </>
                      )
                    }
                  </p>
                </div>
                
                <div className="z-10 flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={forceSyncWithCloud}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer border border-white/10 flex items-center gap-1"
                    title="Nhấp để đồng bộ hóa dữ liệu với đám mây Firestore"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đồng bộ Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeEmployee) {
                        setIsViewingScorecard(true);
                      } else {
                        setActiveTab('employees');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm border border-emerald-400/30 flex items-center gap-1"
                  >
                    <span>Xem báo cáo</span>
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
              </div>

            {/* VIEW 2: General Dashboard Section (Admin & Leaders & Dept Heads) */}
            {activeTab === 'dashboard' && canViewDashboard && (
              <DashboardOverview 
                employees={isDeptHead && !isLeaderOrAdmin ? employees.filter(e=> e.department===currentUser?.department) : employees} 
                departmentsRegion1={departmentsRegion1}
                unitsRegion2={unitsRegion2}
                onSelectEmployee={(id) => {
                  setSelectedEmployeeId(id);
                  setActiveTab('employees');
                }} 
                directives={directives}
                setDirectives={setDirectives}
                isLeaderOrAdmin={!!isLeaderOrAdmin}
                selectedCalendarDay={selectedCalendarDay}
                setSelectedCalendarDay={setSelectedCalendarDay}
                selectedCalendarMonth={selectedCalendarMonth}
                selectedCalendarYear={selectedCalendarYear}
                getTasksForDay={getTasksForDay}
              />
            )}

            {/* VIEW 3: Detailed Employee KPI evaluation panel */}
            {activeTab === 'employees' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Employee List Sidebar styled with Clean Warm Gray */}
                <div id="employee-list-sidebar" className="lg:col-span-3 xl:col-span-3 bg-slate-50 text-slate-800 p-5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] lg:sticky lg:top-24 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                        {isLeaderOrAdmin ? 'Chọn' : 'Hồ Sơ Cán Bộ Đăng Nhập'}
                      </h3>
                      <p className="text-[10px] text-amber-900/85 mt-1 leading-normal">
                        {isLeaderOrAdmin ? 'Nhấp chọn đồng chí để rà soát báo cáo tháng.' : 'Thông tin chi bộ và phân loại xếp cấp.'}
                      </p>
                    </div>

                    {/* Admin bulk import users from Excel */}
                    {currentUser.isAdmin && (
                      <button
                        type="button"
                        onClick={() => setUploadModalType('users')}
                        className="p-1.5 text-white bg-amber-600 hover:bg-amber-700 rounded-xl border border-amber-500 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
                        title="Tải lên danh sách cán bộ từ tệp Excel chuẩn"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        Nhập cán bộ
                      </button>
                    )}
                  </div>

                  {/* Region & Unit Filters (Only shown for Admin & Leaders) */}
                  {isLeaderOrAdmin && (
                    <div className="mt-3.5 p-3 bg-white/80 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phân vùng lọc đơn vị</label>
                        <div className="grid grid-cols-5 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter('all');
                              setSelectedDeptUnitFilter('all');
                            }}
                            className={`px-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              selectedRegionFilter === 'all'
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter('ban_lanh_dao');
                              setSelectedDeptUnitFilter('all');
                            }}
                            className={`px-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              selectedRegionFilter === 'ban_lanh_dao'
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Lọc Ban Lãnh Đạo"
                          >
                            Lãnh đạo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter('phong_ban');
                              setSelectedDeptUnitFilter('all');
                            }}
                            className={`px-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              selectedRegionFilter === 'phong_ban'
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Lọc theo các phòng ban"
                          >
                            Phòng ban
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter('vung_1');
                              setSelectedDeptUnitFilter('all');
                            }}
                            className={`px-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              selectedRegionFilter === 'vung_1'
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Lọc theo 7 đơn vị cơ sở thuộc Vùng 1"
                          >
                            Vùng 1
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter('vung_2');
                              setSelectedDeptUnitFilter('all');
                            }}
                            className={`px-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              selectedRegionFilter === 'vung_2'
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Lọc theo 7 đơn vị cơ sở thuộc Vùng 2"
                          >
                            Vùng 2
                          </button>
                        </div>
                      </div>

                      {selectedRegionFilter !== 'all' && selectedRegionFilter !== 'ban_lanh_dao' && (
                        <div className="flex flex-col space-y-1 animate-fade-in">
                          <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                            {selectedRegionFilter === 'phong_ban' ? 'Danh sách Phòng ban' : selectedRegionFilter === 'vung_1' ? 'Danh sách Vùng 1 (Cơ sở)' : 'Danh sách Vùng 2 (Cơ sở)'}
                          </label>
                          <select
                            value={selectedDeptUnitFilter}
                            onChange={(e) => setSelectedDeptUnitFilter(e.target.value)}
                            className="w-full text-xs p-2 bg-white text-amber-950 border border-amber-300 rounded-lg focus:outline-hidden focus:border-amber-500 font-bold"
                          >
                            <option value="all">-- Tất cả trong phân vùng --</option>
                            {selectedRegionFilter === 'phong_ban'
                              ? departmentsRegion1.filter(d => d !== 'Lãnh đạo').map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))
                              : selectedRegionFilter === 'vung_1'
                              ? unitsRegion2.slice(0, 7).map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))
                              : unitsRegion2.slice(7).map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {!isLeaderOrAdmin && (
                    <div className="mt-3 p-3 bg-amber-100/80 border border-amber-300/60 rounded-2xl shadow-inner">
                      <p className="text-[10px] text-amber-900 font-black flex items-center gap-1 uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Chế độ xem đơn vị của mình
                      </p>
                      <p className="text-xs font-black text-amber-950 mt-1">{currentUser?.department}</p>
                    </div>
                  )}

                  {/* Search box (Only shown for Admin with multiple employees) */}
                  {isLeaderOrAdmin && (
                    <div className="relative my-4">
                      <Search className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                      <input 
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Tìm tên cán bộ, chi bộ..."
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:border-amber-500 text-amber-950 placeholder:text-amber-800/60 font-semibold shadow-3xs"
                      />
                    </div>
                  )}

                  {/* Staff List Scroller - Distinct items blocks as requested */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-2">
                    {filteredEmployees.map(emp => {
                      const isActive = emp.id === selectedEmployeeId;
                      const summary = calculateKPIResultSummary(emp.tasks);
                      const ratingVal = summary.overallTaskPerformanceScore;
                      
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (canViewDashboard) {
                              setSelectedEmployeeId(emp.id);
                            }
                          }}
                          className={`p-3.5 rounded-2xl transition-all duration-200 flex items-center justify-between shadow-3xs border ${
                            canViewDashboard ? 'cursor-pointer' : ''
                          } ${
                            isActive 
                              ? 'bg-amber-50/90 text-amber-950 font-black border-amber-400 ring-1 ring-amber-400/50' 
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <img 
                              src={emp.avatar} 
                              alt={emp.name} 
                              className="w-9 h-9 rounded-full object-cover border border-amber-300 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <p className={`text-xs font-bold leading-tight ${isActive ? 'text-amber-950' : 'text-slate-800'}`}>
                                {emp.name}
                              </p>
                              <p className={`text-[10px] mt-0.5 truncate font-medium ${isActive ? 'text-slate-500' : 'text-amber-800'}`}>
                                {emp.role}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center space-x-2">
                            <div>
                              <span className={`text-[10px] font-mono font-black block ${isActive ? 'text-amber-950' : 'text-amber-900'}`}>
                                {ratingVal.toFixed(2)}%
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full block mt-1 ${
                                ratingVal >= 99.5 
                                  ? (isActive ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900')
                                  : ratingVal >= 90 
                                  ? (isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800')
                                  : (isActive ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-500 border border-slate-200')
                              }`}>
                                {ratingVal >= 99.5 ? 'Xuất Sắc' : ratingVal >= 90 ? 'Tốt' : 'Khá'}
                              </span>
                            </div>

                            {isLeaderOrAdmin && emp.id !== 'emp-admin' && (!currentUser || currentUser.id !== emp.id) && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteEmployee(emp.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa cán bộ này khỏi danh sách và đám mây"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredEmployees.length === 0 && (
                      <div className="p-6 text-center text-xs text-amber-700 font-bold">
                        Không tìm thấy kết quả phù hợp.
                      </div>
                    )}
                  </div>

                  {/* Sidebar bottom summary */}
                  <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col gap-2 w-full shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-amber-800 font-semibold">
                      <span>Đảng bộ: {employees.filter(e => !e.isAdmin).length} cán bộ</span>
                      <button
                        type="button"
                        onClick={() => setIsDataManagementOpen(true)}
                        className="text-white hover:bg-amber-700 font-bold flex items-center gap-1 cursor-pointer bg-amber-600 px-2.5 py-1 rounded-lg transition-all border border-amber-500 shadow-3xs"
                        title="Quản lý dữ liệu thực tế: Xóa dữ liệu mẫu, thêm cán bộ thủ công hoặc qua Excel"
                      >
                        <Trash2 className="w-3 h-3 text-amber-100" />
                        Nhập Dữ Liệu Thực Tế
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleResetData}
                        className="text-[10px] text-amber-700 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                        title="Khôi phục cài đặt gốc ban đầu"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Khôi phục mẫu demo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Detailed KPI Grading Center */}
                <div id="kpi-grading-center" className="lg:col-span-9 xl:col-span-9 space-y-6">
                  {activeEmployee && activeEmployeeSummary ? (
                    <>
                      {/* Active Employee Hero Profile Card */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="relative group/avatar cursor-pointer shrink-0 rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs"
                            onClick={() => handleOpenEditAvatar(activeEmployee.id)}
                            title="Đồng chí bấm vào đây để thay đổi ảnh đại diện hoặc dán link ảnh mới"
                          >
                            <img 
                              src={activeEmployee.avatar} 
                              alt={activeEmployee.name} 
                              className="w-16 h-16 object-cover transition-transform group-hover/avatar:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-all">
                              <Plus className="w-4 h-4 text-white animate-pulse" />
                              <span className="text-[8px] text-white font-bold uppercase tracking-wider mt-0.5">Sửa ảnh</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-sm font-bold text-amber-950">{activeEmployee.name}</h2>
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-md border border-amber-200">
                                {activeEmployee.department}
                              </span>
                              <span className="text-[9px] bg-amber-100/50 text-amber-850 px-2 py-0.5 rounded-md font-mono font-medium border border-amber-200/50">
                                {activeEmployee.evaluationPeriod || 'Tháng 07 / Năm 2026'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-amber-800 font-medium">{activeEmployee.role}</p>
                              <span className="text-amber-400">•</span>
                              <button 
                                onClick={() => handleOpenEditAvatar(activeEmployee.id)}
                                className="text-[11px] text-amber-900 hover:text-amber-950 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                                title="Thay đổi ảnh đại diện cán bộ"
                              >
                                <FileUp className="w-3 h-3" /> Đổi ảnh
                              </button>
                            </div>
                            
                            {/* Summary score ring */}
                            <p className="text-[11px] text-amber-800 mt-2 flex items-center gap-1.5">
                              <span>Sản phẩm & Đầu việc chuẩn:</span>
                              <span className="font-mono font-bold text-amber-950">
                                {activeEmployee.tasks.length} danh mục
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Overall calculation & actions */}
                        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 items-stretch sm:items-center justify-end shrink-0">
                          <div className="text-center md:text-right bg-amber-100 px-4 py-2.5 rounded-xl border border-amber-300">
                            <span className="text-[10px] text-amber-900 font-medium uppercase tracking-wider block">Hiệu Suất Đạt Chuẩn</span>
                            <span className="text-xl font-black text-amber-950 font-mono">
                              {activeEmployeeSummary.overallTaskPerformanceScore.toFixed(2)}%
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5 justify-center">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  import('./lib/excelExport').then(module => {
                                    module.downloadFullReportExcel(activeEmployee);
                                  });
                                }}
                                className="flex-1 px-3.5 py-2 text-[11px] font-bold text-teal-900 hover:bg-teal-100 rounded-lg border border-teal-300 bg-teal-50 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-3xs"
                              >
                                <Download className="w-3.5 h-3.5 text-teal-700" />
                                Xuất Excel
                              </button>
                              <button
                                onClick={() => setIsViewingScorecard(true)}
                                className="flex-1 px-3.5 py-2 text-[11px] font-bold text-amber-950 hover:bg-amber-100 rounded-lg border border-amber-300 bg-white flex items-center justify-center gap-1 cursor-pointer transition-all shadow-3xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-600" />
                                In Báo Cáo
                              </button>
                            </div>
                            
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setUploadModalType('tasks')}
                                className="flex-1 px-3.5 py-2 text-[11px] font-bold text-amber-950 hover:bg-amber-100 bg-amber-100/50 rounded-lg border border-amber-300 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-3xs"
                                title="Tải lên tệp báo cáo công việc tháng"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                Nhập từ Excel
                              </button>
                              <button
                                onClick={() => setIsAddingTask(true)}
                                className="flex-1 px-3.5 py-2 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-3xs border border-amber-700 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Thêm Việc
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Banner cảnh báo lọc Lịch tháng */}
                      {selectedCalendarDay !== null && (
                        <div className="bg-emerald-50 border-2 border-emerald-400/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-fade-in shadow-3xs mb-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 mt-0.5">
                              <Calendar className="w-5 h-5 shrink-0" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                Đang lọc theo lịch báo cáo ngày {selectedCalendarDay.toString().padStart(2, '0')}/{(selectedCalendarMonth + 1).toString().padStart(2, '0')}/{selectedCalendarYear}
                              </h4>
                              <p className="text-[11px] text-emerald-900 font-semibold leading-normal mt-0.5">
                                Các bảng biểu mẫu bên dưới đang chỉ hiển thị các đầu việc / báo cáo có thời hạn đúng vào ngày {selectedCalendarDay} tháng {(selectedCalendarMonth + 1).toString().padStart(2, '0')} năm {selectedCalendarYear}.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCalendarDay(null)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-3xs shrink-0 self-start sm:self-auto"
                          >
                            Hiển thị tất cả đầu việc
                          </button>
                        </div>
                      )}

                      {/* CHỌN KHỐI BIỂU MẪU CHÍNH (BIỂU MẪU 01 VS CHẤM ĐIỂM KPI) */}
                      <div className="flex border-b border-slate-200 mb-6 bg-slate-50/50 rounded-t-2xl">
                        <button
                          type="button"
                          onClick={() => setActiveKpiBlock('mau01')}
                          className={`flex-1 py-4 px-6 text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                            activeKpiBlock === 'mau01'
                              ? 'bg-white text-indigo-700 border-indigo-600 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.1)]'
                              : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <FileText className="w-4.5 h-4.5" />
                          Bản Word (Mẫu 01)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveKpiBlock('cham_diem');
                            setActiveKpiSheet('sheet1');
                          }}
                          className={`flex-1 py-4 px-6 text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                            activeKpiBlock === 'cham_diem'
                              ? 'bg-white text-emerald-700 border-emerald-600 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.1)]'
                              : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                          Bản Excel (3 Sheet)
                        </button>
                      </div>

                      {/* CHỌN CÁC SỔ/SHEETS CHẤM ĐIỂM (CHỈ KHI CHỌN KHỐI CHẤM ĐIỂM) */}
                      {activeKpiBlock === 'cham_diem' && (
                        <div className="bg-slate-100/70 p-1.5 rounded-xl flex flex-col md:flex-row gap-1.5 shadow-inner mb-6 max-w-fit animate-fade-in">
                          <button
                            type="button"
                            onClick={() => setActiveKpiSheet('sheet1')}
                            className={`py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                              activeKpiSheet === 'sheet1'
                                ? 'bg-white text-emerald-800 border-emerald-200/60 shadow-sm'
                                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border-transparent'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${activeKpiSheet === 'sheet1' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            Sheet 1: Công việc
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveKpiSheet('sheet2')}
                            className={`py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                              activeKpiSheet === 'sheet2'
                                ? 'bg-white text-amber-800 border-amber-200/60 shadow-sm'
                                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border-transparent'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${activeKpiSheet === 'sheet2' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                            Sheet 2: Tính điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveKpiSheet('sheet3')}
                            className={`py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                              activeKpiSheet === 'sheet3'
                                ? 'bg-white text-sky-800 border-sky-200/60 shadow-sm'
                                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border-transparent'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${activeKpiSheet === 'sheet3' ? 'bg-sky-500' : 'bg-slate-400'}`}></span>
                            Sheet 3: Kết quả
                          </button>
                        </div>
                      )}

                       {/* Render Active Biểu mẫu Tab */}
                       <div className="space-y-6">
                         {(() => {
                           const filteredTasks = selectedCalendarDay !== null
                             ? activeEmployee.tasks.filter(task => {
                                 const d = getTaskDeadlineDate(task.id, task.timeline, task);
                                 if (!d) return false;
                                 return d.getFullYear() === selectedCalendarYear && d.getMonth() === selectedCalendarMonth && d.getDate() === selectedCalendarDay;
                               })
                             : activeEmployee.tasks;

                           return (
                             <>
                               {activeKpiBlock === 'mau01' && (
                                 <BieuMauOne
                                   tasks={filteredTasks}
                                   employee={activeEmployee}
                                   mode="form01"
                                   onNavigateToGrading={() => {
                                     setActiveKpiBlock('cham_diem');
                                     setActiveKpiSheet('sheet1');
                                   }}
                                   onUpdateEmployeeFields={(fields) => {
                                     if (isQuarterLocked || !canEditActiveEmployee) return;
                                     // Nếu đây không phải chính thao tác "Lưu" thì mọi chỉnh sửa (điểm 10 tiêu chí,
                                     // tự nhận xét...) sẽ tự đưa Biểu 01 về trạng thái "chưa lưu".
                                     const patch = 'form1Saved' in fields ? fields : { ...fields, form1Saved: false };
                                     setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, ...patch } : emp));
                                   }}
                                   onUpdateTask={handleUpdateTask}
                                   onAddTask={handleAddTask}
                                   onDeleteTask={handleDeleteTask}
                                   onOpenAddModal={() => setIsAddingTask(true)}
                                   onOpenUploadModal={() => setUploadModalType('tasks')}
                                   onApplyTemplate={handleApplyTemplate}
                                   isQuarterLocked={isQuarterLocked || !canEditActiveEmployee}
                                 />
                               )}

                               {activeKpiBlock === 'cham_diem' && activeKpiSheet === 'sheet1' && (
                                 <BieuMauOne
                                   tasks={filteredTasks}
                                   employee={activeEmployee}
                                   mode="kpi_list"
                                   onUpdateEmployeeFields={(fields) => {
                                     if (isQuarterLocked || !canEditActiveEmployee) return;
                                     const patch = 'form1Saved' in fields ? fields : { ...fields, form1Saved: false };
                                     setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, ...patch } : emp));
                                   }}
                                   onUpdateTask={handleUpdateTask}
                                   onAddTask={handleAddTask}
                                   onDeleteTask={handleDeleteTask}
                                   onOpenAddModal={() => setIsAddingTask(true)}
                                   onOpenUploadModal={() => setUploadModalType('tasks')}
                                   onApplyTemplate={handleApplyTemplate}
                                   isQuarterLocked={isQuarterLocked || !canEditActiveEmployee}
                                 />
                               )}

                               {activeKpiBlock === 'cham_diem' && activeKpiSheet === 'sheet2' && (
                                 <BieuMauTwo
                                   tasks={filteredTasks}
                                   employee={activeEmployee}
                                   onUpdateEmployeeFields={(fields) => {
                                     if (isQuarterLocked || !canEditActiveEmployee) return;
                                     setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, ...fields } : emp));
                                   }}
                                   onUpdateTask={handleUpdateTask}
                                   isQuarterLocked={isQuarterLocked || !canEditActiveEmployee}
                                 />
                               )}
                             </>
                           );
                         })()}

                         {activeKpiBlock === 'cham_diem' && activeKpiSheet === 'sheet3' && (
                           <BieuMauThree
                            employee={activeEmployee}
                            summary={activeEmployeeSummary}
                            currentUser={currentUser}
                            onUpdateSelfAssessment={(val) => {
                              if (isQuarterLocked || !canEditActiveEmployee) return;
                              setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, selfAssessmentNote: val } : emp));
                            }}
                            onUpdateDepartmentHeadAssessment={(val) => {
                              if (isQuarterLocked || !(canEditActiveEmployee || canEvaluateActiveEmployee)) return;
                              setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, departmentHeadAssessmentNote: val } : emp));
                            }}
                            onUpdateManagerAssessment={(val) => {
                              if (isQuarterLocked || !(canEditActiveEmployee || canEvaluateActiveEmployee)) return;
                              setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? { ...emp, managerAssessmentNote: val } : emp));
                            }}
                            onSignCA={(level, signed, date) => {
                              if (isQuarterLocked || !(canEditActiveEmployee || canEvaluateActiveEmployee)) return;
                              setEmployees(prev => prev.map(emp => {
                                if (emp.id === activeEmployee.id) {
                                  if (level === 'self') {
                                    return { ...emp, selfSignedCA: signed, selfSignedCADate: date };
                                  } else if (level === 'deptHead') {
                                    return { ...emp, deptHeadSignedCA: signed, deptHeadSignedCADate: date };
                                  } else if (level === 'manager') {
                                    return { ...emp, managerSignedCA: signed, managerSignedCADate: date };
                                  }
                                }
                                return emp;
                              }));
                            }}
                            onOpenPrintView={() => setIsViewingScorecard(true)}
                            isQuarterLocked={isQuarterLocked || !(canEditActiveEmployee || canEvaluateActiveEmployee)}
                          />
                        )}
                      </div>

                      {/* Smart Diagnostics Advisor Widget */}
                      <SmartCoach employee={activeEmployee} />
                    </>
                  ) : (
                    <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
                      Vui lòng chọn cán bộ ở danh sách bên trái để bắt đầu đánh giá hiệu suất.
                    </div>
                  )}
                </div>



              </div>
            )}

            {/* VIEW 3.5: Approve Page */}
            {activeTab === 'approve' && canViewDashboard && (
              <ApprovePage
                pendingEmployees={employees.filter(e => !e.isAdmin && e.form1Saved && e.form2Saved && e.selfSignedCA && !e.deptHeadSignedCA && (isDeptHead && !isLeaderOrAdmin ? e.department === currentUser?.department : true))}
                onSelectEmployee={(id) => { setSelectedEmployeeId(id); setActiveTab('employees'); }}
                currentUser={currentUser}
              />
            )}

            {/* VIEW 4: Helpful User Guide / Manual Instructions */}
            {activeTab === 'instructions' && (
              <div id="instructions-panel" className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xs max-w-4xl mx-auto space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5.5 h-5.5 text-red-600" />
                    Nội Dung Quy Chế & Quy Trình Đánh Giá Xếp Loại
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Hướng dẫn tra cứu quy chuẩn kỹ thuật tính điểm và quy trình kiểm điểm xếp loại theo đúng quy định mẫu.</p>
                </div>

                {/* Sub-tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveInstructionTab('kpi')}
                    className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeInstructionTab === 'kpi'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    1. Quy chế tính điểm (Giữ nguyên)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInstructionTab('eval')}
                    className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeInstructionTab === 'eval'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    2. Quy trình đánh giá xếp loại
                  </button>
                </div>

                {/* Tab content 1: KPI calculation */}
                {activeInstructionTab === 'kpi' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Step 1 */}
                    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 font-mono font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                        01
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Hiểu về Hệ số Quy đổi</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Hệ số quy đổi của mỗi đầu việc được xác định bởi công thức: <strong className="text-indigo-600">Hệ số = Điểm chấm công việc / 5</strong>. Ví dụ: Nếu một báo cáo được chấm công việc là 90 điểm, hệ số quy đổi sẽ là 18.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 font-mono font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                        02
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Quy đổi Mục tiêu & Thực tế</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Mỗi nhiệm vụ có 3 tiêu chí đo lường chính: Số lượng, Chất lượng và Tiến độ. Số lượng quy đổi tương ứng bằng cách nhân mục tiêu hoặc thực tế hoàn thành với hệ số quy đổi của đầu việc đó.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 font-mono font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                        03
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Tỷ lệ hoàn thành công việc chung</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Tỷ lệ hoàn thành được tính bằng trung bình cộng tỷ lệ đạt của 3 chỉ số khung: 
                          <br />
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-sm block mt-1">
                            Hiệu suất = (Tỷ lệ Đạt Số lượng + Tỷ lệ Đạt Chất lượng + Tỷ lệ Đạt Tiến độ) / 3
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 font-mono font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                        04
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Xếp loại đánh giá cán bộ</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Từ 99.5% trở lên: Hoàn thành xuất sắc nhiệm vụ. Từ 90% đến dưới 99.5%: Hoàn thành tốt nhiệm vụ. Từ 80% đến dưới 90%: Hoàn thành nhiệm vụ. Dưới 80%: Không hoàn thành nhiệm vụ.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content 2: 6 sections of official evaluation process */}
                {activeInstructionTab === 'eval' && (
                  <div className="space-y-6 animate-fade-in text-slate-700">
                    
                    {/* Item 1: Nguyên tắc chính */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">1</span>
                        Nguyên tắc chính
                      </h3>
                      <ul className="space-y-2 text-xs pl-1">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">&bull;</span>
                          <span><strong>Tính liên kết:</strong> Đánh giá hằng quý là cơ sở cho đánh giá cuối năm.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">&bull;</span>
                          <span><strong>Hiệu quả thực chất:</strong> Phải căn cứ trên sản phẩm cuối cùng.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">&bull;</span>
                          <span><strong>Tiêu chuẩn "Xuất sắc":</strong> Chỉ dành cho cá nhân có kết quả nổi trội, sản phẩm chất lượng cao, vượt mức yêu cầu.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">&bull;</span>
                          <span><strong>Trách nhiệm:</strong> Người đứng đầu chịu trách nhiệm về kết quả của tập thể và việc đề xuất đánh giá công chức thuộc quyền quản lý.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Item 2: Quy trình đánh giá (4 bước) */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">2</span>
                        Quy trình đánh giá (4 bước)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block">Bước 1</span>
                          <p className="text-[11px] leading-relaxed text-slate-600">Cá nhân xác định mục tiêu, nhiệm vụ và kết quả cần đạt trong quý.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block">Bước 2</span>
                          <p className="text-[11px] leading-relaxed text-slate-600">Cá nhân tự nhận xét, tự chấm điểm theo mẫu và các tiêu chí cụ thể.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block">Bước 3</span>
                          <p className="text-[11px] leading-relaxed text-slate-600">Cấp có thẩm quyền nhận xét, đánh giá và đề xuất mức xếp loại.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block">Bước 4</span>
                          <p className="text-[11px] leading-relaxed text-slate-600">Trưởng cơ quan tỉnh quyết định, phê duyệt mức xếp loại cuối cùng.</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 3: Công thức tính điểm */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">3</span>
                        Công thức tính điểm (Kết quả thực hiện nhiệm vụ)
                      </h3>
                      <p className="text-xs text-slate-500">Điểm số được tính dựa trên tỷ lệ phần trăm các yếu tố:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Đối với công chức lãnh đạo, quản lý</span>
                          <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg inline-block">
                            Điểm = a + b + c + d + đ + e
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed italic mt-1">
                            (Gồm: số lượng, chất lượng, tiến độ nhiệm vụ; kết quả hoạt động lĩnh vực phụ trách; khả năng triển khai; năng lực tập hợp, đoàn kết công chức).
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Đối với công chức (không chức vụ)</span>
                          <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg inline-block">
                            Điểm = a + b + c
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed italic mt-1">
                            (Gồm: số lượng, chất lượng, tiến độ nhiệm vụ).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Item 4: Bảng xếp loại chất lượng */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">4</span>
                        Bảng xếp loại chất lượng (Theo điểm)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="py-2 font-bold text-slate-600">Mức xếp loại</th>
                              <th className="py-2 font-bold text-slate-600 text-right">Điểm số chuẩn</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-2.5 font-semibold text-emerald-700 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Hoàn thành xuất sắc
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 text-right font-bold">Từ 90 điểm trở lên</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-2.5 font-semibold text-blue-700 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Hoàn thành tốt
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 text-right font-bold">Từ 70 đến dưới 90 điểm</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-2.5 font-semibold text-amber-700 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Hoàn thành nhiệm vụ
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 text-right font-bold">Từ 50 đến dưới 70 điểm</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 font-semibold text-red-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Không hoàn thành
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 text-right font-bold">Dưới 50 điểm</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-semibold leading-relaxed">
                        Lưu ý: Tỷ lệ "Hoàn thành xuất sắc" không vượt quá 20% tổng số công chức "Hoàn thành tốt" trong đơn vị.
                      </div>
                    </div>

                    {/* Item 5: Các trường hợp đặc biệt & Xếp loại cuối năm */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">5</span>
                        Các trường hợp đặc biệt & Xếp loại cuối năm
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                            Không hoàn thành nhiệm vụ:
                          </span>
                          <ul className="pl-4 space-y-1 list-disc text-slate-600 text-[11px]">
                            <li>Cá nhân hoàn thành dưới 100% nhiệm vụ trong quý (trừ trường hợp bất khả kháng).</li>
                            <li>Tập thể hoàn thành dưới 70% nhiệm vụ: Người đứng đầu xếp loại "Không hoàn thành nhiệm vụ".</li>
                          </ul>
                        </div>
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                            Hệ quả cuối năm:
                          </span>
                          <ul className="pl-4 space-y-1 list-disc text-slate-600 text-[11px]">
                            <li>Có <strong>01 quý</strong> bị xếp loại "Không hoàn thành" &rarr; Không được xếp loại "Hoàn thành xuất sắc" cả năm.</li>
                            <li>Có <strong>02 quý liên tiếp</strong> bị xếp loại "Không hoàn thành" &rarr; Báo cáo thay thế cán bộ.</li>
                            <li><strong>Ưu tiên xét "Xuất sắc" cuối năm:</strong> Dành cho người có nhiều quý được đề xuất "Hoàn thành xuất sắc" nhất.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Item 6: Thẩm quyền đánh giá */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-wide">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-mono">6</span>
                        Thẩm quyền đánh giá
                      </h3>
                      <ul className="space-y-2.5 text-[11px] text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5">Tỉnh</span>
                          <span><strong>Trưởng cơ quan tỉnh:</strong> Đánh giá Phó Trưởng cơ quan, Trưởng phòng, Trưởng cơ quan cơ sở, công chức thuộc cơ quan tỉnh.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5">Lãnh đạo</span>
                          <span><strong>Lãnh đạo cơ quan tỉnh:</strong> Đánh giá Trưởng phòng/Trưởng cơ quan cơ sở (trong lĩnh vực được phân công phụ trách).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5">Phòng/Cơ sở</span>
                          <span><strong>Trưởng phòng/Trưởng cơ quan cơ sở:</strong> Đánh giá Phó Trưởng phòng, công chức không giữ chức vụ lãnh đạo và người lao động của đơn vị.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Auto-save Widget footer */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 text-xs">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-bold text-indigo-900">Tính năng lưu trữ tự động</p>
                    <p className="text-slate-600 leading-relaxed">
                      Hệ thống tự động lưu trữ mọi dữ liệu của đồng chí lên localStorage của trình duyệt. Không lo bị mất mát khi đóng hoặc tải lại trang web.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer copyright */}
      <footer id="app-footer" className="py-6 mt-12 shrink-0 border-t border-emerald-900/40">
        <div className="max-w-[1600px] mx-auto px-4 text-center text-[10px] text-emerald-400/60 font-semibold uppercase tracking-wider">
          &copy; 2026 Hệ Thống đánh giá chỉ số KPI. Bản quyền thuộc Thống kê tỉnh Hưng Yên.
        </div>
      </footer>

      {/* Adding KPI Modal Trigger */}
      {isAddingTask && (
        <KPIModal 
          onClose={() => setIsAddingTask(false)} 
          onAddTask={handleAddTask} 
        />
      )}

      {/* Bulk Upload Excel / CSV modal */}
      {uploadModalType && (
        <ExcelUploadModal
          type={uploadModalType}
          onClose={() => setUploadModalType(null)}
          onSuccessUsers={uploadModalType === 'users' ? handleSuccessImportUsers : undefined}
          onSuccessTasks={uploadModalType === 'tasks' ? handleSuccessImportTasks : undefined}
          onSuccessMultiTasks={uploadModalType === 'tasks' ? handleSuccessImportMultiTasks : undefined}
          currentEmployeeName={activeEmployee?.name}
          isLeaderOrAdmin={currentUser?.isAdmin || !!currentUser?.role.toLowerCase().includes('trưởng') || !!currentUser?.role.toLowerCase().includes('phó') || !!currentUser?.role.toLowerCase().includes('lãnh đạo')}
          employees={employees}
          currentUser={currentUser}
        />
      )}

      {/* 1. Modal thay đổi ảnh đại diện */}
      {isEditingAvatar && (
        <div id="edit-avatar-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cập nhật ảnh đại diện</h3>
                  <p className="text-[10px] text-slate-400">Thay đổi ảnh chân dung của cán bộ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingAvatar(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image Preview & URL Input */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <img 
                  src={avatarUrlInput || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face'} 
                  alt="Xem trước" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face';
                  }}
                />
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đường dẫn ảnh trực tiếp (URL)</label>
                  <input 
                    type="text"
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                    placeholder="Dán link ảnh (https://...)"
                    className="w-full text-xs p-2 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Local File Selection */}
              <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-xl space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hoặc tải lên ảnh từ máy tính của đồng chí:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="local-avatar-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setAvatarUrlInput(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('local-avatar-upload')?.click()}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 hover:border-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  >
                    <FileUp className="w-4 h-4 text-indigo-500" />
                    Chọn tệp ảnh (.png, .jpg, .jpeg)
                  </button>
                </div>
              </div>

              {/* Preset Avatar Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Hoặc chọn nhanh từ thư viện cán bộ:</span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Nam cán bộ 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face' },
                    { label: 'Nam cán bộ 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face' },
                    { label: 'Nam cán bộ 3', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face' },
                    { label: 'Nữ cán bộ 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face' },
                    { label: 'Nữ cán bộ 2', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face' },
                    { label: 'Nữ cán bộ 3', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrlInput(item.url)}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        avatarUrlInput === item.url 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-200 hover:border-slate-350 bg-white text-slate-600'
                      }`}
                    >
                      <img src={item.url} alt={item.label} className="w-10 h-10 rounded-full object-cover mb-1" />
                      <span className="truncate max-w-[80px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingAvatar(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAvatar(avatarUrlInput)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Cập nhật ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal quản lý dữ liệu và thiết lập thực tế */}
      {isDataManagementOpen && (
        <div id="data-management-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Quản Lý & Thiết Lập Dữ Liệu Thực Tế</h3>
                  <p className="text-[10px] text-slate-400">Xóa dữ liệu demo, sửa phân loại Phòng ban/Đơn vị cơ sở, thêm cán bộ thủ công</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDataManagementOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Option 1.5: Fix mis-classified Phòng ban / Đơn vị cơ sở by department name */}
              {departmentOrgTypeStats.length > 0 && (
                <div className="p-5 border border-amber-200 bg-amber-50/30 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Sửa phân loại Phòng ban / Đơn vị cơ sở</h4>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        Nếu tên đơn vị (VD: tên huyện, xã...) khiến hệ thống phân loại nhầm, bấm nút bên dưới để chuyển <strong>toàn bộ cán bộ của tên đơn vị đó</strong> sang đúng khối, không cần upload lại Excel.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoReclassifyAll}
                    className="w-full px-4 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Phân loại lại toàn bộ cán bộ một lần dựa trên tên phòng/đơn vị"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tự Động Phân Loại Lại Toàn Bộ
                  </button>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {departmentOrgTypeStats.map(stat => {
                      const currentType = stat.phongBanCount >= stat.donViCoSoCount ? 'Phòng ban' : 'Đơn vị cơ sở';
                      const isMixed = stat.phongBanCount > 0 && stat.donViCoSoCount > 0;
                      return (
                        <div key={stat.dept} className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                          <div className="truncate">
                            <span className="font-bold text-slate-800">{stat.dept}</span>
                            <span className="text-slate-400 ml-1.5">
                              ({stat.total} người{isMixed ? ` — ${stat.phongBanCount} Phòng ban / ${stat.donViCoSoCount} Đơn vị cơ sở` : ''})
                            </span>
                            {isMixed && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold text-[9px] uppercase">Đang lẫn</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReclassifyDepartment(stat.dept, 'Phòng ban')}
                              disabled={currentType === 'Phòng ban' && !isMixed}
                              className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                            >
                              → Phòng ban
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReclassifyDepartment(stat.dept, 'Đơn vị cơ sở')}
                              disabled={currentType === 'Đơn vị cơ sở' && !isMixed}
                              className="px-2.5 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                            >
                              → Đơn vị cơ sở
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 1.8: Delete/Reset individual or department data if there are errors */}
              <div className="p-5 border border-rose-200 bg-rose-50/10 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide">Xóa hoặc Khởi tạo lại dữ liệu sai sót</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Nếu đồng chí phát hiện sai sót dữ liệu sau khi nhập hoặc chấm điểm, đồng chí có thể xóa hoàn toàn hoặc khởi tạo lại (reset dữ liệu đánh giá về trống) theo 3 cấp độ xử lý dưới đây:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                  {/* Cấp độ 1: Toàn đơn vị */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-rose-950 uppercase tracking-wider block">1. Toàn bộ đơn vị (Hệ thống)</span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Tác động lên toàn bộ cán bộ và cơ sở dữ liệu hiện có trong hệ thống (bao gồm cả dữ liệu trên đám mây Firestore).
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={handleResetAllEmployeesAssessments}
                        className="w-full py-2 text-[10px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250 rounded-lg transition-colors cursor-pointer animate-pulse"
                        title="Khởi tạo sạch toàn bộ đánh giá, chữ ký về trống cho tất cả cán bộ, giữ nguyên danh sách cán bộ"
                      >
                        Khởi tạo lại toàn bộ đánh giá
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleClearSampleData();
                        }}
                        className="w-full py-2 text-[10px] font-extrabold text-white bg-rose-600 hover:bg-rose-750 border border-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Xóa sạch toàn bộ cán bộ khỏi hệ thống (giữ lại duy nhất tài khoản hiện hành của bạn)"
                      >
                        Xóa sạch toàn bộ cán bộ
                      </button>
                    </div>
                  </div>

                  {/* Cấp độ 2: Phòng ban / Đơn vị */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-rose-950 uppercase tracking-wider block">2. Theo phòng ban / đơn vị</span>
                      <div className="mt-2">
                        <select
                          value={deleteTargetDeptName}
                          onChange={(e) => setDeleteTargetDeptName(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden"
                        >
                          <option value="">-- Chọn đơn vị/phòng ban --</option>
                          {allDepartmentNames.map(dept => (
                            <option key={dept} value={dept}>
                              {dept} ({employees.filter(emp => emp.department === dept).length} cán bộ)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!deleteTargetDeptName) {
                            triggerAlert('Chưa chọn phòng ban/đơn vị', 'Đồng chí vui lòng chọn một đơn vị hoặc phòng ban cụ thể từ danh sách thả xuống ở trên trước khi bấm nút.');
                            return;
                          }
                          handleResetOrDeleteDeptData(deleteTargetDeptName, 'reset');
                        }}
                        className={`flex-1 py-2 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                          deleteTargetDeptName 
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250' 
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Reset sạch đánh giá cho toàn bộ nhân sự thuộc đơn vị đã chọn"
                      >
                        Khởi tạo lại đánh giá
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!deleteTargetDeptName) {
                            triggerAlert('Chưa chọn phòng ban/đơn vị', 'Đồng chí vui lòng chọn một đơn vị hoặc phòng ban cụ thể từ danh sách thả xuống ở trên trước khi bấm nút.');
                            return;
                          }
                          handleResetOrDeleteDeptData(deleteTargetDeptName, 'delete');
                        }}
                        className={`flex-1 py-2 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                          deleteTargetDeptName 
                            ? 'text-white bg-rose-600 hover:bg-rose-750 border border-rose-700' 
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Xóa vĩnh viễn tất cả cán bộ thuộc phòng ban/đơn vị đã chọn"
                      >
                        Xóa sạch cả đơn vị
                      </button>
                    </div>
                  </div>

                  {/* Cấp độ 3: Từng cá nhân */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-rose-950 uppercase tracking-wider block">3. Theo từng cá nhân</span>
                      <div className="mt-2">
                        <select
                          value={deleteTargetEmployeeId}
                          onChange={(e) => setDeleteTargetEmployeeId(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden"
                        >
                          <option value="">-- Chọn cán bộ cần xử lý --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.department || 'Chưa xếp phòng'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!deleteTargetEmployeeId) {
                            triggerAlert('Chưa chọn cán bộ', 'Đồng chí vui lòng chọn một cán bộ cụ thể từ danh sách thả xuống ở trên trước khi bấm nút.');
                            return;
                          }
                          handleResetOrDeleteEmployeeData(deleteTargetEmployeeId, 'reset');
                        }}
                        className={`flex-1 py-2 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                          deleteTargetEmployeeId 
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250' 
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Khởi tạo sạch đánh giá & chữ ký về trống, giữ nguyên thông tin nhân sự cán bộ đã chọn"
                      >
                        Khởi tạo lại đánh giá
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!deleteTargetEmployeeId) {
                            triggerAlert('Chưa chọn cán bộ', 'Đồng chí vui lòng chọn một cán bộ cụ thể từ danh sách thả xuống ở trên trước khi bấm nút.');
                            return;
                          }
                          handleResetOrDeleteEmployeeData(deleteTargetEmployeeId, 'delete');
                        }}
                        className={`flex-1 py-2 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                          deleteTargetEmployeeId 
                            ? 'text-white bg-rose-600 hover:bg-rose-750 border border-rose-700' 
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Xóa vĩnh viễn cán bộ này ra khỏi hệ thống và đám mây"
                      >
                        Xóa hoàn toàn cán bộ
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Add single employee manually */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-indigo-600" />
                    Đăng ký, thêm mới cán bộ thủ công
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewEmployee(!isAddingNewEmployee)}
                    className="px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                  >
                    {isAddingNewEmployee ? 'Đóng form' : '+ Thêm cán bộ thủ công'}
                  </button>
                </div>

                {isAddingNewEmployee && (
                  <form onSubmit={handleManualAddEmployee} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Họ và tên cán bộ <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          required
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn Hải"
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>

                      {/* Role */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chức vụ / Chức danh</label>
                        <input 
                          type="text"
                          value={newEmpRole}
                          onChange={(e) => setNewEmpRole(e.target.value)}
                          placeholder="Ví dụ: Phó Trưởng phòng, Nhân viên"
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>

                      {/* OrgType */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Loại hình tổ chức công tác <span className="text-red-500">*</span></label>
                        <select 
                          value={newEmpOrgType}
                          onChange={(e) => {
                            setNewEmpOrgType(e.target.value as 'Phòng ban' | 'Đơn vị cơ sở');
                            setNewEmpDept('');
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-bold"
                        >
                          <option value="Phòng ban">Phòng ban Vùng 1 (Đơn vị thuộc cấp tỉnh)</option>
                          <option value="Đơn vị cơ sở">Đơn vị cơ sở Vùng 2 (Chi bộ/Đơn vị phụ thuộc)</option>
                        </select>
                      </div>

                      {/* Department */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phòng ban / Đơn vị cụ thể <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          required
                          value={newEmpDept}
                          onChange={(e) => setNewEmpDept(e.target.value)}
                          placeholder={newEmpOrgType === 'Phòng ban' ? "Ví dụ: Văn phòng Tổng hợp" : "Ví dụ: TKCSDH"}
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-semibold"
                          list="departments-suggest"
                        />
                        <datalist id="departments-suggest">
                          {(newEmpOrgType === 'Phòng ban' ? departmentsRegion1.filter(d => d !== 'Lãnh đạo') : unitsRegion2).map(dept => (
                            <option key={dept} value={dept} />
                          ))}
                        </datalist>
                      </div>

                      {/* Username */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tên đăng nhập (Email/Username) <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          required
                          value={newEmpUsername}
                          onChange={(e) => setNewEmpUsername(e.target.value)}
                          placeholder="Ví dụ: hainv@nso.gov.vn"
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mật khẩu đăng nhập</label>
                        <input 
                          type="text"
                          value={newEmpPassword}
                          onChange={(e) => setNewEmpPassword(e.target.value)}
                          placeholder="Mặc định: 123456"
                          className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 font-mono font-semibold"
                        />
                      </div>
                    </div>

                    {/* Avatar Selection */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ảnh chân dung đại diện</label>
                      <div className="flex items-center gap-3">
                        <img src={newEmpAvatar} alt="Xem trước" className="w-12 h-12 rounded-full object-cover border border-slate-250" />
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={newEmpAvatar}
                            onChange={(e) => setNewEmpAvatar(e.target.value)}
                            placeholder="Nhập đường dẫn ảnh trực tiếp..."
                            className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg text-slate-700"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {[
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&fit=crop&crop=face',
                        ].map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewEmpAvatar(url)}
                            className={`p-0.5 rounded-full border-2 cursor-pointer shrink-0 ${newEmpAvatar === url ? 'border-indigo-600' : 'border-transparent'}`}
                          >
                            <img src={url} alt={`Preset ${idx}`} className="w-8 h-8 rounded-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Lưu và Thêm Cán Bộ
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Option 3: Bulk Import via Excel (Sẵn có) */}
              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-green-600" />
                    Đồng bộ nhập dữ liệu hàng loạt từ tệp Excel
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Sử dụng tệp danh sách Excel chuẩn để nạp hàng chục cán bộ cùng một lúc vào phần mềm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDataManagementOpen(false);
                    setUploadModalType('users');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 rounded-xl shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  Mở Trình Nhập Excel
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDataManagementOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />

      {/* 3. Custom Alert / Confirm Dialog to bypass sandbox window.confirm restrictions */}
      {customDialog.isOpen && (
        <div id="custom-dialog-overlay" className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{customDialog.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">{customDialog.message}</p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 justify-end">
              {customDialog.isConfirm && (
                <button
                  type="button"
                  onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-750 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {customDialog.cancelText || 'Hủy bỏ'}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  setCustomDialog(prev => ({ ...prev, isOpen: false }));
                  if (customDialog.onConfirm) {
                    await customDialog.onConfirm();
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {customDialog.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
