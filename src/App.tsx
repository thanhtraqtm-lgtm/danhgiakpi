import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getStoredUsers, 
  saveUsers, 
  getStoredTasks, 
  saveTasks, 
  getStoredLateConfig, 
  saveLateConfig, 
  getStoredDocs, 
  saveDocs, 
  getStoredSubmissions,
  saveSubmissions,
  getStoredPeriodConfig,
  savePeriodConfig,
  resetAllData,
  getStoredWeeklySchedules,
  saveWeeklySchedules
} from './utils/storage';
import { 
  User, 
  KpiTask, 
  LateRuleConfig, 
  SelfAssessmentDoc, 
  WorkflowSubmission, 
  EvaluationPeriodConfig, 
  ActiveTab,
  DEPARTMENTS,
  WeeklySchedule
} from './types';
import { evaluateTaskKpi, normalizeTaskStatus } from './utils/kpiLogic';

import { Sidebar } from './components/Sidebar';
import ConfirmModal from './components/ConfirmModal';
import { Header } from './components/Header';
import { ToastContainer, ToastMessage } from './components/Toast';
import { RulesDocumentViewer } from './components/RulesDocumentViewer';
import { EvaluationListManager } from './components/EvaluationListManager';
import { EvaluationResults } from './components/EvaluationResults';
import { EvaluationLockManager } from './components/EvaluationLockManager';
import { UserManagement } from './components/UserManagement';
import { LateRuleConfigComponent } from './components/LateRuleConfigComponent';
import { TaskDataViewer } from './components/TaskDataViewer';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

import { DashboardOverview } from './components/DashboardOverview';
import { OfficialWordAssessmentForm } from './components/OfficialWordAssessmentForm';
import { ExcelThreeSheetKpiForm } from './components/ExcelThreeSheetKpiForm';
import { WorkflowApproval } from './components/WorkflowApproval';
import { OrgChartAndPersonnel } from './components/OrgChartAndPersonnel';
import { PeriodManagement } from './components/PeriodManagement';
import { TaskCatalogManager } from './components/TaskCatalogManager';
import { MeetingRegistration } from './components/MeetingRegistration';
import { MeetingCalendar } from './components/MeetingCalendar';
import { WeeklyWorkSchedule } from './components/WeeklyWorkSchedule';
import { Meeting } from './types';
import { getStoredMeetings, saveMeetings } from './utils/storage';
import { db, OperationType, handleFirestoreError } from './firebase';
import {
  fsLoadUsers,
  fsSaveUsers,
  fsLoadTasks,
  fsSaveTasks,
  fsWatchUsers,
  fsWatchTasks,
  fsSaveLateConfig,
  fsSavePeriodConfig,
  fsLoadMeetings,
  fsSaveMeetings,
  fsWatchMeetings,
  fsLoadWeeklySchedules,
  fsSaveWeeklySchedules,
  fsWatchWeeklySchedules,
} from './utils/firestoreSync';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { resolveCanonicalDepartment } from './utils/departmentClassification';

export type UserRole = 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER' | 'ADMIN';

// Normalize a department string for canonical matching (accent-insensitive, NFC, collapsed spaces)
const normDeptStr = (x: string): string =>
  (x || '').normalize('NFC').replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');

export default function App() {
  const [globalRole, setGlobalRole] = useState<UserRole>('ADMIN');
  const [resetKey, setResetKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsersState] = useState<User[]>([]);
  const [tasks, setTasksState] = useState<KpiTask[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [weeklySchedules, setWeeklySchedulesState] = useState<WeeklySchedule[]>([]);

  // Guarded setters that prevent accidental wipes. If something tries to set
  // users/tasks to an EMPTY array while we already have data, we treat it as an
  // accidental/stale wipe (e.g. a Firestore echo or stale-closure effect) and
  // REFUSE the wipe — keeping the existing data. This is the final guard rail
  // for the "tự nhiên xóa trắng hết / nạp 10s xong mất" bug: no matter what
  // code path tries to clear the list, the data stays.
  // Explicit clears (handleClearUsers/handleClearTasks/handleResetAllData) call
  // the raw setUsersState/setTasksState directly to bypass this guard, so the
  // user can still intentionally clear data.
  const setUsers: React.Dispatch<React.SetStateAction<User[]>> = (val) => {
    setUsersState((prev) => {
      const next = typeof val === 'function' ? (val as (p: User[]) => User[])(prev) : val;
      if (Array.isArray(next) && next.length === 0 && prev.length > 0) {
        // Refuse accidental wipe: keep existing data.
        return prev;
      }
      return next;
    });
  };
  const setTasks: React.Dispatch<React.SetStateAction<KpiTask[]>> = (val) => {
    setTasksState((prev) => {
      const next = typeof val === 'function' ? (val as (p: KpiTask[]) => KpiTask[])(prev) : val;
      if (Array.isArray(next) && next.length === 0 && prev.length > 0) {
        // Refuse accidental wipe: keep existing data.
        return prev;
      }
      return next;
    });
  };

  // Echo suppression for the Firestore onSnapshot watchers is handled inside
  // firestoreSync (a 2.5s pause window after each write drops our own echoes).
  // The watchers below follow a LOCAL-FIRST policy (read localStorage directly)
  // so no extra refs are needed here.

  // Function to robustly map any string to a department
  const mapToDepartment = (text) => {
    if (!text) return null;
    const norm = text.toLowerCase();
    if (norm.includes('lãnh đạo')) return 'Lãnh đạo';
    if (norm.includes('tổng hợp')) return 'Phòng Thống kê Tổng hợp';
    if (norm.includes('tchc') || norm.includes('hành chính')) return 'Phòng TCHC';
    if (norm.includes('tmdv') || norm.includes('thương mại')) return 'Phòng Thống kê TMDV & Giá';
    if (norm.includes('cnxd') || norm.includes('công nghiệp')) return 'Phòng Thống kê CNXD';
    if (norm.includes('nn&xh') || norm.includes('nông nghiệp') || norm.includes('xã hội')) return 'Phòng Thống kê NN&XH';
    if (norm.includes('phố hiến') || norm.includes('pho hien')) return 'Thống kê cơ sở Phố Hiến';
    if (norm.includes('như quỳnh') || norm.includes('nhu quynh')) return 'Thống kê cơ sở Như Quỳnh';
    if (norm.includes('yên mỹ') || norm.includes('yen my')) return 'Thống kê cơ sở Yên Mỹ';
    if (norm.includes('mỹ hào') || norm.includes('my hao')) return 'Thống kê cơ sở Mỹ Hào';
    if (norm.includes('khoái châu') || norm.includes('khoai chau')) return 'Thống kê cơ sở Khoái Châu';
    if (norm.includes('lương bằng') || norm.includes('luong bang') || norm.includes('kim động')) return 'Thống kê cơ sở Lương Bằng';
    if (norm.includes('hoàng hoa thám') || norm.includes('hoang hoa tham') || norm.includes('ân thi')) return 'Thống kê cơ sở Hoàng Hoa Thám';
    if (norm.includes('quỳnh phụ') || norm.includes('quynh phu')) return 'Thống kê cở sở Quỳnh Phụ';
    if (norm.includes('hưng hà') || norm.includes('hung ha')) return 'Thống kê cở sở Hưng Hà';
    if (norm.includes('đông hưng') || norm.includes('dong hung')) return 'Thống kê cơ sở Đông Hưng';
    if (norm.includes('thái thụy') || norm.includes('thai thuy')) return 'Thống kê cơ sở Thái Thụy';
    if (norm.includes('tiền hải') || norm.includes('tien hai')) return 'Thống kê cơ sở Tiền Hải';
    if (norm.includes('kiến xương') || norm.includes('kien xuong')) return 'Thống kê cơ sở Kiến Xương';
    if (norm.includes('vũ thư') || norm.includes('vu thu')) return 'Thống kê cơ sở Vũ Thư';
    return null;
  };

      // State restored
  const [lateConfig, setLateConfig] = useState<LateRuleConfig>(getStoredLateConfig());
  const [docs, setDocs] = useState<SelfAssessmentDoc[]>([]);
  const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([]);
  const [periodConfig, setPeriodConfig] = useState<EvaluationPeriodConfig>(getStoredPeriodConfig());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [isFirstLoginChange, setIsFirstLoginChange] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForWorkflow, setSelectedUserForWorkflow] = useState<string | null>(null);

  // Toast handlers - must be defined first since other handlers depend on them
  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, desc?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description: desc }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const handleDataUploadedFromForm = useCallback((formName: string, data: any[]) => {
    addToast('success', 'Thành công', `Đã nhận ${data.length} dòng dữ liệu từ biểu mẫu ${formName}`);
  }, [addToast]);

  const handleAddUser = useCallback((user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...user,
      id: 'usr_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const updated = [newUser, ...users];
    setUsers(updated);
    saveUsers(updated);
    fsSaveUsers(updated);
  }, [users]);

  const handleDeleteUser = useCallback((id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
    fsSaveUsers(updated);
  }, [users]);

  const handleUpdateUser = useCallback((id: string, updatedUser: Partial<User>) => {
    const updated = users.map((u) => (u.id === id ? { ...u, ...updatedUser } : u));
    setUsers(updated);
    saveUsers(updated);
    fsSaveUsers(updated);
  }, [users]);

  const handleImportUsers = useCallback((data: any[]) => {
    const getVal = (row: Record<string, any>, ...colNames: string[]) => {
    const keys = Object.keys(row);
    const normalize = (s) => (s || '').normalize('NFC').trim().toLowerCase();
    const normalizeNoAccents = (s) => normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    for (const name of colNames) {
      const normName = normalize(name);
      const noAccentName = normalizeNoAccents(name);
      
      const foundKey = keys.find(k => {
        const normK = normalize(k);
        return normK === normName || normalizeNoAccents(k) === noAccentName || normK.includes(normName) || normName.includes(normK);
      });
      
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };
    
    const newUsers = data.map((r, i) => {
      const uName = getVal(r, 'họ và tên', 'họ tên', 'cán bộ', 'nhân viên', 'nhân sự', 'người', 'người chủ trì', 'người thực hiện');
      const uPos = getVal(r, 'chức vụ', 'chức danh', 'vị trí');
      const uDept = getVal(r, 'phòng ban/đơn vị', 'phòng ban / đơn vị', 'phòng ban', 'phòng', 'ban', 'đơn vị', 'đơn vị công tác', 'khối');
      const uWorkUnit = getVal(r, 'đơn vị công tác', 'đơn vị công tác', 'cơ quan');
      const uUsername = getVal(r, 'tên đăng nhập', 'tên tài khoản', 'email', 'thư điện tử');
      const uPassword = getVal(r, 'mật khẩu', 'password', 'pass');

      // Phân quyền vai trò: Phó phòng không được gán Trưởng phòng mà để là Chuyên viên (STAFF)
      // Q. Trưởng Thống kê cơ sở, Trưởng phòng, Trưởng Thống kê cơ sở -> DEPT_HEAD
      const normPos = (uPos || '').toLowerCase().trim();
      let derivedRole: UserRole = 'STAFF';
      if (normPos.includes('cục trưởng') || normPos.includes('phó cục trưởng') || (uDept || '').toLowerCase().includes('lãnh đạo')) {
        derivedRole = 'PROVINCE_LEADER';
      } else if (normPos.includes('phó') || normPos.includes('pho')) {
        derivedRole = 'STAFF';
      } else if (
        normPos.includes('trưởng') || 
        normPos.includes('chi cục') || 
        normPos.includes('phụ trách') || 
        normPos.includes('q.') || 
        normPos.includes('quyền') ||
        normPos.includes('đội trưởng')
      ) {
        derivedRole = 'DEPT_HEAD';
      }

      return {
        id: 'usr_' + Date.now() + '_' + i,
        fullName: uName || 'Người dùng mới',
        position: uPos || 'Chuyên viên',
        department: uDept || 'Phòng Thống kê Tổng hợp',
        workUnit: uWorkUnit || '',
        username: uUsername || '',
        password: uPassword || '',
        role: derivedRole,
        createdAt: new Date().toISOString()
      };
    });
    
    // Replace list with newly imported unique users (or deduplicate)
    const uniqueMap = new Map<string, User>();
    newUsers.forEach(u => {
      const k = (u.fullName || '').trim().toLowerCase();
      if (k) uniqueMap.set(k, u);
    });
    // Keep existing admin accounts so admins are never wiped on Excel import
    const existingAdmins = users.filter(u => u.role === 'ADMIN' || (u.username || '').toLowerCase() === 'admin');
    const updated = [...existingAdmins, ...Array.from(uniqueMap.values())];
    setUsers(updated);
    saveUsers(updated);
    fsSaveUsers(updated);
    addToast('success', 'Nhập dữ liệu thành công', `Đã cập nhật danh sách gồm ${Array.from(uniqueMap.values()).length} nhân sự.`);
  }, [users, addToast]);

  const handleClearUsers = useCallback(() => {
    // Keep admin accounts so the administrator is not locked out
    const adminAccounts = users.filter(u => u.role === 'ADMIN' || (u.username || '').toLowerCase() === 'admin');
    setUsersState(adminAccounts);  // bypass guard: intentional clear
    saveUsers(adminAccounts);
    fsSaveUsers(adminAccounts);
    addToast('success', 'Thành công', 'Đã xoá danh sách nhân sự (tài khoản Quản trị viên được bảo lưu an toàn).');
  }, [users, addToast]);

  const handleSavePassword = useCallback((userId: string, newPass: string) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, password: newPass, isFirstLogin: false } : u);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    fsSaveUsers(updatedUsers);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, password: newPass, isFirstLogin: false });
    }
    setIsFirstLoginChange(false);
    addToast('success', 'Đổi mật khẩu thành công', 'Mật khẩu mới đã được cập nhật.');

    // Save to Firestore users if exists
    try {
      const userRef = doc(db, 'users', userId);
      updateDoc(userRef, { password: newPass, isFirstLogin: false }).catch(() => {});
    } catch (e) {}
  }, [users, currentUser, addToast]);

  const handleLoginUser = useCallback((user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('kpi_current_user_v1', JSON.stringify(user));
    } catch {}
    setGlobalRole(user.role as UserRole || 'STAFF');
    setSelectedDepartment(user.department || 'ALL');
    
    // Check if user is logging in with default password (123456) or has isFirstLogin flag
    const isDefaultPass = !user.password || user.password === '123456' || user.isFirstLogin === true;
    if (isDefaultPass) {
      setIsFirstLoginChange(true);
      setShowChangePassModal(true);
      addToast('warning', 'Yêu cầu đổi mật khẩu', 'Lần đầu đăng nhập, vui lòng đổi mật khẩu mới để bảo mật.');
    } else {
      setIsFirstLoginChange(false);
      addToast('success', 'Đăng nhập thành công', `Chào mừng ${user.fullName} (${user.position || user.role})`);
    }
  }, [addToast]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('kpi_current_user_v1');
    } catch {}
    setGlobalRole('STAFF');
    setSelectedDepartment('ALL');
    addToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất khỏi hệ thống.');
  }, [addToast]);

  useEffect(() => {
    // Check connection first
    const checkConnection = async () => {
      try {
        await getDocs(query(collection(db, 'evaluation_periods'), where('__name__', '==', 'test')));
      } catch {
        // Silently ignore connection check failures
      }
    };
    checkConnection();

    // Setup snapshot listener for cloud-stored assessment documents
    const unsubscribeDocs = onSnapshot(collection(db, 'evaluation_docs'), (snapshot) => {
      const loadedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SelfAssessmentDoc));
      setDocs(prev => {
        const cloudIds = loadedDocs.map(d => d.id);
        const localOnly = prev.filter(p => !cloudIds.includes(p.id));
        return [...loadedDocs, ...localOnly];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'evaluation_docs');
    });

    // Setup snapshot listener for cloud-stored workflow submissions
    const unsubscribeSubmissions = onSnapshot(collection(db, 'workflow_submissions'), (snapshot) => {
      const loadedSubs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as WorkflowSubmission));
      if (loadedSubs.length > 0) {
        setSubmissions(prev => {
          const cloudIds = loadedSubs.map(d => d.id);
          const localOnly = prev.filter(p => !cloudIds.includes(p.id));
          const combined = [...loadedSubs, ...localOnly];
          saveSubmissions(combined);
          return combined;
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workflow_submissions');
    });

    return () => {
      if (unsubscribeDocs) unsubscribeDocs();
      if (unsubscribeSubmissions) unsubscribeSubmissions();
    };
  }, []);

  // Listen for navigation to workflow from evaluation screens
  useEffect(() => {
    const handleNavigateToWorkflow = (event: CustomEvent<string>) => {
      const userId = event.detail;
      setSelectedUserForWorkflow(userId);
      setActiveTab('self_eval_workflow');
    };
    window.addEventListener('navigate-to-workflow', handleNavigateToWorkflow as EventListener);
    return () => {
      window.removeEventListener('navigate-to-workflow', handleNavigateToWorkflow as EventListener);
    };
  }, []);

  // Listen for navigation to specific tabs from anywhere in the app
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent<string>) => {
      const tab = event.detail;
      if (tab) {
        setActiveTab(tab as ActiveTab);
      }
    };
    window.addEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    return () => {
      window.removeEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    };
  }, []);

  useEffect(() => {
    const rawUsers = getStoredUsers();
    let usersUpdated = false;
    const loadedUsers = rawUsers.map(u => {
      const posLower = (u.position || '').toLowerCase();
      // Phó phòng / Phó trưởng phòng / Phó chi cục trưởng must be STAFF (Chuyên viên), not DEPT_HEAD
      if (u.role === 'DEPT_HEAD' && (posLower.includes('phó') || posLower.includes('pho'))) {
        usersUpdated = true;
        return { ...u, role: 'STAFF' as const };
      }
      // Q. Trưởng Thống kê cơ sở / Quyền Trưởng / Trưởng phòng -> DEPT_HEAD
      if (
        u.role !== 'PROVINCE_LEADER' && 
        u.role !== 'ADMIN' && 
        (posLower.includes('q.') || posLower.includes('quyền') || posLower.includes('trưởng') || posLower.includes('phụ trách')) && 
        !posLower.includes('phó') && 
        !posLower.includes('pho') &&
        u.role !== 'DEPT_HEAD'
      ) {
        usersUpdated = true;
        return { ...u, role: 'DEPT_HEAD' as const };
      }
      return u;
    });
    if (usersUpdated) {
      saveUsers(loadedUsers);
      fsSaveUsers(loadedUsers);
    }
    setUsers(loadedUsers);

    let loadedTasks = getStoredTasks();
    let updatedTasks = false;
    loadedTasks = loadedTasks.map(t => {
      if (!t.userName) return t;
      const normUName = t.userName.normalize('NFC').trim().toLowerCase();
      const normUNameNoAccent = normUName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      
      let matchingUser = loadedUsers.find(u => {
        const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
        return n === normUName;
      });
      if (!matchingUser) {
        matchingUser = loadedUsers.find(u => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          const n2 = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
          return n2 === normUNameNoAccent;
        });
      }
      if (!matchingUser) {
        matchingUser = loadedUsers.find(u => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          return n.includes(normUName) || normUName.includes(n);
        });
      }

      let newDept = t.department;
      if (matchingUser && matchingUser.department) {
        newDept = matchingUser.department;
      } else if (t.department) {
        const canonical = resolveCanonicalDepartment(t.department, t.userName, loadedUsers);
        if (canonical) newDept = canonical;
      }
      const newStatus = normalizeTaskStatus(t.status);
      if (newDept !== t.department || newStatus !== t.status) {
        updatedTasks = true;
        return { ...t, department: newDept, status: newStatus };
      }
      return t;
    });

    setTasks(loadedTasks);
    if (updatedTasks) {
      saveTasks(loadedTasks);
      fsSaveTasks(loadedTasks);
    }

    // Phát hiện data bị corrupt: nếu có > 100 tasks mà không có task nào
    // "Chưa hoàn thành" hoặc "Chưa hoàn thành trễ hạn" → có thể bị override bởi saveLateConfig cũ
    if (loadedTasks.length > 100) {
      const hasUnfinished = loadedTasks.some(t =>
        t.status === 'Chưa hoàn thành' || t.status === 'Chưa hoàn thành trễ hạn'
      );
      if (!hasUnfinished) {
        setTimeout(() => {
          addToast(
            'warning',
            'Cảnh báo: Dữ liệu trạng thái có thể bị lỗi',
            'Không tìm thấy task nào có trạng thái "Chưa hoàn thành". Vui lòng xóa dữ liệu công việc và import lại file Excel để khôi phục đúng trạng thái.'
          );
        }, 2000);
      }
    }

    setDocs(getStoredDocs());
    setSubmissions(getStoredSubmissions());
    setMeetings(getStoredMeetings());
    setWeeklySchedulesState(getStoredWeeklySchedules());
  }, [resetKey]);

  // ---- Firestore sync: load users + tasks from cloud (fallback localStorage),
  //      and subscribe to realtime updates so data persists across logins/devices.
  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    let unsubTasks: (() => void) | null = null;
    let unsubMeetings: (() => void) | null = null;
    let unsubWeekly: (() => void) | null = null;
    let active = true;

    (async () => {
      // Initial cloud load (merge: cloud wins if present, else keep localStorage)
      const cloudUsers = await fsLoadUsers();
      const cloudTasks = await fsLoadTasks();
      const cloudMeetings = await fsLoadMeetings();
      const cloudWeekly = await fsLoadWeeklySchedules();
      if (!active) return;

      const localUsers = getStoredUsers();
      const localTasks = getStoredTasks();
      const localMeetings = getStoredMeetings();
      const localWeekly = getStoredWeeklySchedules();

      // USERS: cloud wins only if localStorage is empty (first run on a new
      // device). Otherwise trust the local cache we already loaded — this
      // avoids clobbering a freshly-cleared/imported list with stale cloud data.
      if (cloudUsers && cloudUsers.length > 0 && localUsers.length === 0) {
        setUsers(cloudUsers);
        saveUsers(cloudUsers);
      } else if (cloudUsers && cloudUsers.length === 0 && localUsers.length > 0) {
        // Cloud was cleared elsewhere -> push local up so they stay in sync.
        fsSaveUsers(localUsers);
      } else if (!cloudUsers && localUsers.length > 0) {
        fsSaveUsers(localUsers);
      }

      // TASKS: same logic as users.
      if (cloudTasks && cloudTasks.length > 0 && localTasks.length === 0) {
        setTasks(cloudTasks);
        saveTasks(cloudTasks);
      } else if (cloudTasks && cloudTasks.length === 0 && localTasks.length > 0) {
        fsSaveTasks(localTasks);
      } else if (!cloudTasks && localTasks.length > 0) {
        fsSaveTasks(localTasks);
      }

      // MEETINGS: sync with cloud
      if (cloudMeetings && cloudMeetings.length > 0 && localMeetings.length === 0) {
        setMeetings(cloudMeetings);
        saveMeetings(cloudMeetings);
      } else if (cloudMeetings && cloudMeetings.length === 0 && localMeetings.length > 0) {
        fsSaveMeetings(localMeetings);
      } else if (!cloudMeetings && localMeetings.length > 0) {
        fsSaveMeetings(localMeetings);
      }

      // WEEKLY SCHEDULES: sync with cloud
      if (cloudWeekly && cloudWeekly.length > 0 && localWeekly.length === 0) {
        setWeeklySchedulesState(cloudWeekly);
        saveWeeklySchedules(cloudWeekly);
      } else if (cloudWeekly && cloudWeekly.length === 0 && localWeekly.length > 0) {
        fsSaveWeeklySchedules(localWeekly);
      } else if (!cloudWeekly && localWeekly.length > 0) {
        fsSaveWeeklySchedules(localWeekly);
      }

      // Realtime subscriptions.
      unsubUsers = fsWatchUsers((u) => {
        const localUsers = getStoredUsers();
        if (localUsers.length > 0) {
          fsSaveUsers(localUsers);
          return;
        }
        if (u.length === 0) return;
        setUsers(u);
        saveUsers(u);
      });
      unsubTasks = fsWatchTasks((t) => {
        const localTasks = getStoredTasks();
        if (localTasks.length > 0) {
          return;
        }
        if (t.length === 0) return;
        setTasks(t);
        saveTasks(t);
      });
      unsubMeetings = fsWatchMeetings((m) => {
        const localMeetings = getStoredMeetings();
        if (localMeetings.length > 0) return;
        if (m.length === 0) return;
        setMeetings(m);
        saveMeetings(m);
      });
      unsubWeekly = fsWatchWeeklySchedules((ws) => {
        const localWeekly = getStoredWeeklySchedules();
        if (localWeekly.length > 0) return;
        if (ws.length === 0) return;
        setWeeklySchedulesState(ws);
        saveWeeklySchedules(ws);
      });
    })();

    return () => {
      active = false;
      if (unsubUsers) unsubUsers();
      if (unsubTasks) unsubTasks();
      if (unsubMeetings) unsubMeetings();
      if (unsubWeekly) unsubWeekly();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ---- Re-sync task departments whenever the user list or task list changes.
  //      This fixes the "Chưa phân bổ phòng" bug: when a user is deleted or the
  //      whole list is cleared then re-imported, existing tasks may be left with
  //      a stale or missing department. We re-derive each task's department from
  //      the (possibly new) matching user, and only persist if something changed.
  //      Depends on BOTH users and tasks so it always sees the latest tasks
  //      (no stale closure). It converges: after one sync, changed===false.
  useEffect(() => {
    if (users.length === 0 || tasks.length === 0) return;
    let changed = false;
    const synced = tasks.map((t) => {
      const normUName = (t.userName || '').normalize('NFC').trim().toLowerCase();
      const normUNameNoAccent = normUName
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');
      let matchingUser = users.find((u) => {
        const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
        return n === normUName;
      });
      if (!matchingUser && t.userName) {
        matchingUser = users.find((u) => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          const n2 = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');
          return n2 === normUNameNoAccent;
        });
      }
      if (!matchingUser && t.userName) {
        matchingUser = users.find((u) => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          return n.includes(normUName) || normUName.includes(n);
        });
      }
      let newDept = t.department;
      if (matchingUser && matchingUser.department) {
        newDept = matchingUser.department;
      } else if (t.department) {
        const canonical = resolveCanonicalDepartment(t.department, t.userName, users);
        if (canonical) newDept = canonical;
      }
      if (newDept !== t.department) {
        changed = true;
        return { ...t, department: newDept };
      }
      return t;
    });
    if (changed) {
      setTasks(synced);
      saveTasks(synced);
      fsSaveTasks(synced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, tasks]);

  const handleAddTask = useCallback((t: KpiTask) => {
    const updated = [t, ...tasks];
    setTasks(updated);
    saveTasks(updated);
    fsSaveTasks(updated);
    addToast('success', 'Thêm thành công', 'Đã thêm công việc.');
  }, [tasks, addToast]);
  
  const handleDeleteTask = useCallback((id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
    fsSaveTasks(updated);
    addToast('success', 'Xóa thành công', 'Đã xóa công việc.');
  }, [tasks, addToast]);
  
  const handleUpdateTask = useCallback((id: string, updatedTask: Partial<KpiTask>) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, ...updatedTask } : t));
    setTasks(updated);
    saveTasks(updated);
    fsSaveTasks(updated);
    addToast('success', 'Cập nhật thành công', 'Đã cập nhật công việc.');
  }, [tasks, addToast]);
  
  const handleClearTasks = useCallback(() => {
    setTasksState([]);  // bypass guard: intentional clear
    saveTasks([]);
    fsSaveTasks([]);
    addToast('success', 'Thành công', 'Đã xoá toàn bộ dữ liệu công việc.');
  }, [addToast]);

  const handleAddMeeting = useCallback((meeting: Meeting) => {
    const updated = [meeting, ...meetings];
    setMeetings(updated);
    saveMeetings(updated);
    fsSaveMeetings(updated);
    addToast('success', 'Thành công', 'Đã tạo cuộc họp mới.');
    setActiveTab('meeting_calendar');
  }, [meetings, addToast]);

  const handleUpdateMeeting = useCallback((meeting: Meeting) => {
    const updated = meetings.map(m => m.id === meeting.id ? meeting : m);
    setMeetings(updated);
    saveMeetings(updated);
    fsSaveMeetings(updated);
  }, [meetings]);

  const handleDeleteMeeting = useCallback((meetingId: string) => {
    const updated = meetings.filter(m => m.id !== meetingId);
    setMeetings(updated);
    saveMeetings(updated);
    fsSaveMeetings(updated);
  }, [meetings]);

  const handleAddWeeklySchedule = useCallback((schedule: WeeklySchedule) => {
    setWeeklySchedulesState(prev => {
      const updated = [schedule, ...prev];
      saveWeeklySchedules(updated);
      fsSaveWeeklySchedules(updated);
      return updated;
    });
    addToast('success', 'Thành công', 'Đã thêm lịch công tác mới.');
    setActiveTab('weekly_schedule');
  }, [addToast]);

  const handleUpdateWeeklySchedule = useCallback((id: string, updatedSchedule: any) => {
    setWeeklySchedulesState(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updatedSchedule } : s);
      saveWeeklySchedules(updated);
      fsSaveWeeklySchedules(updated);
      return updated;
    });
  }, []);

  const handleDeleteWeeklySchedule = useCallback((scheduleId: string) => {
    setWeeklySchedulesState(prev => {
      const updated = prev.filter(s => s.id !== scheduleId);
      saveWeeklySchedules(updated);
      fsSaveWeeklySchedules(updated);
      return updated;
    });
  }, []);

  const handleBatchSaveWeeklySchedules = useCallback((items: any[]) => {
    setWeeklySchedulesState(prev => {
      const newItems = items.map((item, idx) => ({
        id: item.id || `ws_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        ...item
      }));
      // Filter out existing schedules that match same week, person, day, session if replaced
      const newKeys = new Set(newItems.map(n => `${n.weekStartDate}_${n.personName}_${n.dayOfWeek}_${n.session}`));
      const filteredOld = prev.filter(p => !newKeys.has(`${p.weekStartDate}_${(p as any).personName || p.userName}_${p.dayOfWeek}_${(p as any).session}`));
      const combined = [...newItems, ...filteredOld];
      saveWeeklySchedules(combined);
      fsSaveWeeklySchedules(combined);
      return combined;
    });
  }, []);

  const handleClearWeekSchedules = useCallback((weekStartDate: string) => {
    setWeeklySchedulesState(prev => {
      const filtered = prev.filter(s => s.weekStartDate !== weekStartDate);
      saveWeeklySchedules(filtered);
      fsSaveWeeklySchedules(filtered);
      return filtered;
    });
  }, []);

  const handleSyncDepartments = useCallback(() => {
    let updated = false;
    let matchCount = 0;
    
    // Normalization helper
    const norm = (s) => (s || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
    const normNoAccent = (s) => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    const synced = tasks.map(t => {
      if (!t.userName) return t;
      const tName = norm(t.userName);
      const tNameNoAccent = normNoAccent(t.userName);
      
      let matchingUser = users.find(u => {
        const uName = norm(u.fullName);
        return uName === tName;
      });
      
      if (!matchingUser) {
        matchingUser = users.find(u => {
          const uNameNoAcc = normNoAccent(u.fullName);
          return uNameNoAcc === tNameNoAccent;
        });
      }
      
      if (!matchingUser) {
        matchingUser = users.find(u => {
          const uName = norm(u.fullName);
          return tName.includes(uName) || uName.includes(tName);
        });
      }

      if (matchingUser && matchingUser.department) {
        if (matchingUser.department !== t.department) {
          updated = true;
        }
        matchCount++;
        return { ...t, department: matchingUser.department };
      }
      return t;
    });

    if (updated) {
      setTasks(synced);
      saveTasks(synced);
      fsSaveTasks(synced);
      addToast('success', 'Đồng bộ hoàn tất', `Đã tìm thấy và cập nhật phòng ban cho ${matchCount} công việc.`);
    } else {
      if (users.length === 0) {
        addToast('error', 'Lỗi đồng bộ', 'Danh sách nhân sự trống. Hãy tải file Danh sách nhân sự lên trước.');
      } else {
        const sampleU = users[0]?.fullName + ' (' + (users[0]?.department || 'Trống') + ')';
        const sampleT = tasks[0]?.userName + ' (' + (tasks[0]?.department || 'Trống') + ')';
        
        let msg = `Đã quét ${tasks.length} CV và ${users.length} NS nhưng không có gì thay đổi.`;
        if (matchCount > 0) {
           msg = `Đã tìm thấy ${matchCount} người khớp, nhưng phòng ban của họ đã giống sẵn trong bảng CV. (VD NS1: ${sampleU}, CV1: ${sampleT})`;
        } else {
           msg = `Không tìm thấy tên nào khớp. (VD NS1: ${sampleU}, CV1: ${sampleT})`;
        }
        addToast('warning', 'Không có thay đổi', msg);
      }
    }
  }, [tasks, users, addToast]);


  const handleImportTasks = useCallback((data: any[]) => {
    const getVal = (row: Record<string, any>, ...colNames: string[]) => {
      const keys = Object.keys(row);
      const normalize = (s) => (s || '').normalize('NFC').trim().toLowerCase();
      const normalizeNoAccents = (s) => normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      for (const name of colNames) {
        const normName = normalize(name);
        const noAccentName = normalizeNoAccents(name);
        
        const foundKey = keys.find(k => {
          const normK = normalize(k);
          return normK === normName || normalizeNoAccents(k) === noAccentName || normK.includes(normName) || normName.includes(normK);
        });
        
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    const parseDateString2 = (ds: string) => {
      if (!ds) return '';
      if (/^\d+(\.\d+)?$/.test(ds)) {
        const num = parseFloat(ds);
        if (num > 20000 && num < 60000) {
           const excelEpoch = new Date(1899, 11, 30);
           const dateObj = new Date(excelEpoch.getTime() + num * 86400000);
           const d = String(dateObj.getDate()).padStart(2, '0');
           const m = String(dateObj.getMonth() + 1).padStart(2, '0');
           const y = dateObj.getFullYear();
           return `${y}-${m}-${d}`;
        }
      }
      if (ds.includes('/')) {
        const parts = ds.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return ds;
    };

    let newTasks = [];
    try {
      newTasks = data.map((r, i) => {
      const uName = getVal(r, 'Người/ đơn vị chủ trì', 'Người chủ trì', 'Họ và tên', 'Cán bộ', 'Người thực hiện', 'Nhân sự', 'Tên nhân sự', 'Chủ trì', 'Người phụ trách');
      const tName = getVal(r, 'Tên công việc', 'Công việc', 'Nhiệm vụ', 'Tên nhiệm vụ', 'Công việc chi tiết');
      const typeVal = getVal(r, 'Loại công việc', 'Phân loại', 'Loại');
      const coopUnit = getVal(r, 'Đơn vị phối hợp', 'Phối hợp');
      const assignedDate = parseDateString2(getVal(r, 'Ngày giao việc', 'Ngày giao'));
      const pDeadline = parseDateString2(getVal(r, 'Hạn hoàn thành', 'Hạn kế hoạch', 'Hạn chót', 'Thời hạn', 'Hạn', 'Deadline')) || new Date().toISOString().split('T')[0];
      const statusVal = getVal(r, 'Tình trạng', 'Trạng thái') || 'Chưa hoàn thành';
      const lateReason = getVal(r, 'Lý do trễ hạn', 'Lý do', 'Nguyên nhân');
      const aDeadlineRaw = parseDateString2(getVal(r, 'Hạn thực tế', 'Thực tế', 'Ngày xong'));
      // Only inject planDeadline as actual date when Excel EXPLICITLY says
      // "Hoàn thành" (on-time) AND there is no real actual-deadline column.
      // Never inject for "Hoàn thành trễ hạn" (that would zero out daysLate and
      // wrongly reclassify it as on-time). Keep aDeadline empty otherwise so the
      // Excel "Tình trạng" stays the single source of truth for status.
      const normStatusPeek = normalizeTaskStatus(statusVal);
      const aDeadline = aDeadlineRaw || (normStatusPeek === 'Hoàn thành' ? pDeadline : '');
      let deptStr = getVal(r, 'Phòng ban/đơn vị', 'Phòng ban', 'Đơn vị', 'Phòng ban / Đơn vị', 'Đơn vị công tác', 'Khối', 'Bộ phận');
      
      const normUName = (uName || '').normalize('NFC').trim().toLowerCase();
      const normUNameNoAccent = normUName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      let matchingUser = users.find(u => {
        const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
        return n === normUName;
      });
      if (!matchingUser && uName) {
        matchingUser = users.find(u => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          const n2 = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
          return n2 === normUNameNoAccent;
        });
      }
      if (!matchingUser && uName) {
        matchingUser = users.find(u => {
          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
          return n.includes(normUName) || normUName.includes(n);
        });
      }
      if (matchingUser) {
        deptStr = matchingUser.department;
      } else if (!deptStr) {
        deptStr = 'Chưa phân bổ';
      } else {
        const canonical = resolveCanonicalDepartment(deptStr, uName, users);
        if (canonical) deptStr = canonical;
      }
      
      const weightStr = getVal(r, 'Trọng số', 'Điểm', 'Tỷ trọng') || '20';
      const wVal = Number(weightStr) || 20;

      const evalRes = evaluateTaskKpi(
        { weight: wVal, planDeadline: pDeadline, actualDeadline: aDeadline },
        lateConfig
      );

      // The Excel "Tình trạng" column is the SINGLE SOURCE OF TRUTH for status.
      // We only normalize it to one of the 4 canonical values. We NEVER let
      // evaluateTaskKpi (date-based) override a real Excel status, because that
      // caused counts to diverge from the user's Excel totals.
      // evaluateTaskKpi is still called (above) only to derive daysLate for
      // scoring — its .status is ignored when Excel provided a status.
      const normStatus = normalizeTaskStatus(statusVal);
      const excelStatusEmpty =
        !statusVal || /^\s*$/.test(statusVal.normalize('NFC').trim());
      const finalStatus: string =
        excelStatusEmpty
          ? (aDeadline ? evalRes.status : normStatus)   // no Excel status → derive from dates
          : normStatus;                                  // Excel status present → use it verbatim (normalized)

      return {
        id: 'task_' + Date.now() + '_' + i,
        userName: uName || 'Không xác định',
        department: deptStr,
        taskName: tName || `Công việc ${i + 1}`,
        jobType: typeVal || 'Kế hoạch tổng cục',
        coopUnit,
        assignedDate,
        planDeadline: pDeadline,
        actualDeadline: aDeadline,
        status: finalStatus,
        lateReason,
        weight: wVal,
        daysLate: evalRes.daysLate,
        notes: ''
      };
    });
    } catch (err: any) {
      addToast('error', 'Lỗi phân tích dữ liệu công việc', err.message);
      return;
    }
    
    const updated = [...newTasks, ...tasks];
    setTasks(updated);
    saveTasks(updated);
    fsSaveTasks(updated);
    addToast('success', 'Nhập dữ liệu thành công', `Đã thêm ${newTasks.length} công việc mới.`);
  }, [tasks, users, lateConfig, addToast]);


  // Word Doc Parsed
  const handleWordDocParsed = useCallback((doc: SelfAssessmentDoc) => {
    const updated = [doc, ...docs];
    setDocs(updated);
    saveDocs(updated);
  }, [docs]);

  const handleDeleteDoc = useCallback((id: string) => {
    const updated = docs.filter((d) => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
  }, [docs]);

  // Config Update
  const handleSaveLateConfig = useCallback((newConfig: LateRuleConfig) => {
    setLateConfig(newConfig);
    saveLateConfig(newConfig); // re-evaluates tasks và saveTasks vào localStorage
    fsSaveLateConfig(newConfig); // đồng bộ config lên Firebase
    const updatedTasks = getStoredTasks(); // lấy tasks đã được re-evaluate
    setTasks(updatedTasks);
    fsSaveTasks(updatedTasks); // đồng bộ tasks đã re-evaluate lên Firebase
  }, []);

  // Reset Data Action
  const handleResetAllData = useCallback(() => {
    resetAllData();
    const freshUsers = getStoredUsers();
    const freshTasks = getStoredTasks();
    const freshLateConfig = getStoredLateConfig();
    const freshPeriodConfig = getStoredPeriodConfig();

    setUsersState(freshUsers);        // bypass guard: intentional reset
    setTasksState(freshTasks);        // bypass guard: intentional reset
    setLateConfig(freshLateConfig);
    setDocs(getStoredDocs());
    setSubmissions(getStoredSubmissions());
    setPeriodConfig(freshPeriodConfig);
    setMeetings(getStoredMeetings());
    setWeeklySchedulesState(getStoredWeeklySchedules());

    // Đồng bộ trạng thái reset lên Firebase để các thiết bị khác cũng nhận
    const freshMeetings = getStoredMeetings();
    const freshWeekly = getStoredWeeklySchedules();
    fsSaveUsers(freshUsers);
    fsSaveTasks(freshTasks);
    fsSaveLateConfig(freshLateConfig);
    fsSavePeriodConfig(freshPeriodConfig);
    fsSaveMeetings(freshMeetings);
    fsSaveWeeklySchedules(freshWeekly);

    addToast(
      'warning',
      'Đã đặt lại toàn bộ dữ liệu!',
      'Kho dữ liệu đã được khôi phục về trạng thái ban đầu.'
    );
    setShowResetConfirm(false);
  }, [addToast]);

  // Workflow handlers
  const handleAddDoc = useCallback(async (docData: Omit<SelfAssessmentDoc, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'evaluation_docs'), {
        ...docData,
        userId: currentUser?.id || 'unknown',
        periodId: periodConfig.periodName,
        status: 'draft',
        docType: docData.docType || 'WORD_OFFICIAL',
        createdAt: new Date().toISOString()
      });
      
      const newDoc: SelfAssessmentDoc = {
        ...docData,
        id: docRef.id,
      };
      const updated = [newDoc, ...docs];
      setDocs(updated);
      saveDocs(updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'evaluation_docs');
    }
  }, [currentUser, periodConfig, docs]);

  const handleSubmitWorkflow = useCallback(async (sub: Omit<WorkflowSubmission, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'workflow_submissions'), {
        ...sub,
        createdAt: new Date().toISOString()
      });
      const newSub: WorkflowSubmission = {
        ...sub,
        id: docRef.id,
      };
      // Check if submission already exists for this user/period
      const existingIdx = submissions.findIndex(s => 
        (s.userId === newSub.userId || s.userName?.toLowerCase() === newSub.userName?.toLowerCase()) && 
        s.period === newSub.period
      );
      let updated: WorkflowSubmission[];
      if (existingIdx >= 0) {
        updated = [...submissions];
        updated[existingIdx] = newSub;
      } else {
        updated = [newSub, ...submissions];
      }
      setSubmissions(updated);
      saveSubmissions(updated);
    } catch {
      const newSub: WorkflowSubmission = {
        ...sub,
        id: 'sub_' + Date.now(),
      };
      const existingIdx = submissions.findIndex(s => 
        (s.userId === newSub.userId || s.userName?.toLowerCase() === newSub.userName?.toLowerCase()) && 
        s.period === newSub.period
      );
      let updated: WorkflowSubmission[];
      if (existingIdx >= 0) {
        updated = [...submissions];
        updated[existingIdx] = newSub;
      } else {
        updated = [newSub, ...submissions];
      }
      setSubmissions(updated);
      saveSubmissions(updated);
    }
  }, [submissions, currentUser, periodConfig, addToast]);

  const handleUpdateSubmission = useCallback(async (id: string, updates: Partial<WorkflowSubmission>) => {
    const updated = submissions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSubmissions(updated);
    saveSubmissions(updated);

    // Update in Firestore cloud
    try {
      const docRef = doc(db, 'workflow_submissions', id);
      await updateDoc(docRef, updates);
    } catch {
      // Silently fail - local update already succeeded
    }
  }, [submissions]);

  const handleDeleteSubmission = useCallback(async (id: string) => {
    const updated = submissions.filter((s) => s.id !== id);
    setSubmissions(updated);
    saveSubmissions(updated);

    // Delete in Firestore cloud
    try {
      const docRef = doc(db, 'workflow_submissions', id);
      await deleteDoc(docRef);
    } catch {
      // Silently handle
    }
    addToast('success', 'Đã xóa phiếu đánh giá', 'Phiếu đánh giá đã được xóa hoàn toàn khỏi hệ thống.');
  }, [submissions, addToast]);

  const handleClearAllSubmissions = useCallback(async () => {
    setSubmissions([]);
    saveSubmissions([]);
    setDocs([]);
    saveDocs([]);

    // Delete all from Firestore collection workflow_submissions
    try {
      const snap = await getDocs(collection(db, 'workflow_submissions'));
      const batchPromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Error clearing workflow_submissions from Firestore:', err);
    }

    // Delete all from Firestore collection evaluation_docs
    try {
      const snapDocs = await getDocs(collection(db, 'evaluation_docs'));
      const batchPromises = snapDocs.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Error clearing evaluation_docs from Firestore:', err);
    }

    addToast('success', 'Đã xóa sạch toàn bộ dữ liệu đánh giá!', 'Toàn bộ phiếu tự chấm và kết quả phê duyệt đã được dọn sạch để bắt đầu kỳ mới.');
  }, [addToast]);

  const handleUpdatePeriodConfig = useCallback((cfg: EvaluationPeriodConfig) => {
    setPeriodConfig(cfg);
    savePeriodConfig(cfg);
    fsSavePeriodConfig(cfg); // đồng bộ lên Firebase
  }, []);

  // Export Data JSON
  const handleExportData = useCallback(() => {
    const exportObj = {
      system: 'KPI EVALUATION SYSTEM',
      exportDate: new Date().toISOString(),
      usersCount: users.length,
      tasksCount: tasks.length,
      lateRuleConfig: lateConfig,
      periodConfig,
      users,
      tasks,
      selfAssessmentDocs: docs,
      submissions,
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_KPI_Export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('success', 'Xuất dữ liệu thành công!', 'Tệp JSON báo cáo KPI đã được tải về máy tính.');
  }, [users, tasks, lateConfig, periodConfig, docs, submissions, addToast]);

  const departmentsList = Array.from(DEPARTMENTS);

  return (
    <div className="min-h-screen bg-[#f0f5f1] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetAllData={() => setShowResetConfirm(true)}
        userCount={users.length}
        taskCount={tasks.length}
        docCount={docs.length}
        globalRole={globalRole}
        setGlobalRole={setGlobalRole}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        setSelectedDepartment={setSelectedDepartment}
        users={users}
        meetings={meetings}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onOpenChangePassword={() => setShowChangePassModal(true)}
        onLogout={handleLogout}
      />

      {/* Fixed Top Header (Bright Red & Full Width) */}
      <Header />

      {/* Main Workspace Area (Full Width) */}
      <main className="ml-72 pt-16 px-4 py-4 min-h-screen w-[calc(100%-18rem)]">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            tasks={tasks}
            schedules={weeklySchedules}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            addToast={addToast}
            onNavigateToTasks={() => setActiveTab('kpi_assign')}
            users={users}
            submissions={submissions}
            periodConfig={periodConfig}
          />
        )}
        {activeTab === 'users_list' && (
          <UserManagement
            users={users}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onImportUsers={handleImportUsers}
            onClearUsers={handleClearUsers}
            addToast={addToast}
            globalRole={globalRole}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'org_chart' && (
          <OrgChartAndPersonnel
            users={users}
            addToast={addToast}
            globalRole={globalRole}
            currentUser={currentUser}
            onUsersUpdate={(newUsers) => {
              setUsers(newUsers);
              saveUsers(newUsers);
              fsSaveUsers(newUsers);
              setTasks(prevTasks => {
                const updatedTasks = prevTasks.map(t => {
                  if (!t.userName) return t;
                  const normUName = t.userName.normalize('NFC').trim().toLowerCase();
                  const normUNameNoAccent = normUName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                  
                  let matchingUser = newUsers.find(u => {
                    const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                    return n === normUName;
                  });
                  if (!matchingUser) {
                    matchingUser = newUsers.find(u => {
                      const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                      const n2 = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                      return n2 === normUNameNoAccent;
                    });
                  }
                  if (!matchingUser) {
                    matchingUser = newUsers.find(u => {
                      const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                      return n.includes(normUName) || normUName.includes(n);
                    });
                  }
                  if (matchingUser && matchingUser.department && matchingUser.department !== t.department) {
                    return { ...t, department: matchingUser.department };
                  }
                  return t;
                });
                saveTasks(updatedTasks);
                fsSaveTasks(updatedTasks);
                return updatedTasks;
              });
            }}
          />
        )}
        
        {(activeTab === 'kpi_catalog' || activeTab === 'kpi_catalog_lookup') && (
          <TaskCatalogManager key={`catalog-${resetKey}`}
            tasks={tasks}
            users={users}
            selectedDepartment={selectedDepartment}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            addToast={addToast}
            viewMode={activeTab === 'kpi_catalog_lookup' ? 'catalog' : 'assignment'}
            onNavigate={(tab) => setActiveTab(tab === 'catalog' ? 'kpi_catalog_lookup' : 'kpi_catalog')}
            globalRole={globalRole}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'kpi_assign' && (
          <PeriodManagement
            tasks={tasks}
            users={users}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onImportTasks={handleImportTasks}
            onClearTasks={handleClearTasks}
            onSyncDepartments={handleSyncDepartments}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            addToast={addToast}
            onNavigateTab={setActiveTab}
            periodConfig={periodConfig}
            onUpdatePeriodConfig={handleUpdatePeriodConfig}
            globalRole={globalRole}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'kpi_late_rules' && (
          <LateRuleConfigComponent
            config={lateConfig}
            onSaveConfig={handleSaveLateConfig}
            addToast={addToast}
            globalRole={globalRole}
          />
        )}
        {activeTab === 'kpi_rules_doc' && (
          <RulesDocumentViewer />
        )}
        {activeTab === 'self_eval_30' && (
          <OfficialWordAssessmentForm
            users={users}
            currentUser={currentUser}
            selectedDepartment={selectedDepartment}
            periodConfig={periodConfig}
            submissions={submissions}
            tasks={tasks}
            docs={docs}
            onSaveDoc={handleAddDoc}
            onSubmitWorkflow={handleSubmitWorkflow}
            addToast={addToast}
          />
        )}
        {activeTab === 'self_eval_70' && (
          <ExcelThreeSheetKpiForm
            users={users}
            currentUser={currentUser}
            selectedDepartment={selectedDepartment}
            periodConfig={periodConfig}
            submissions={submissions}
            docs={docs}
            tasks={tasks}
            addToast={addToast}
            onSubmitWorkflow={handleSubmitWorkflow}
            onSaveDoc={handleAddDoc}
          />
        )}
        {activeTab === 'self_eval_workflow' && (
          <WorkflowApproval
            submissions={submissions}
            periodConfig={periodConfig}
            onUpdateSubmission={handleUpdateSubmission}
            onDeleteSubmission={handleDeleteSubmission}
            onClearAllSubmissions={handleClearAllSubmissions}
            onUpdatePeriodConfig={handleUpdatePeriodConfig}
            addToast={addToast}
            globalRole={globalRole}
            currentUser={currentUser}
            users={users}
            preSelectedUserId={selectedUserForWorkflow}
          />
        )}
        {activeTab === 'eval_list' && (
          <EvaluationListManager 
            submissions={submissions}
            users={users}
            tasks={tasks}
            docs={docs}
            periodConfig={periodConfig}
            selectedDepartment={selectedDepartment}
            onNavigateToWorkflow={(userId) => {
              setSelectedUserForWorkflow(userId);
              setActiveTab('self_eval_workflow');
            }}
            currentUser={currentUser}
            globalRole={globalRole}
            onUpdateSubmission={handleUpdateSubmission}
            onDeleteSubmission={handleDeleteSubmission}
            onClearAllSubmissions={handleClearAllSubmissions}
            addToast={addToast}
          />
        )}
        {activeTab === 'eval_results' && (
          <EvaluationResults 
            submissions={submissions}
            users={users}
            tasks={tasks}
            periodConfig={periodConfig}
            selectedDepartment={selectedDepartment}
          />
        )}
        {activeTab === 'eval_lock' && (
          <EvaluationLockManager
            periodConfig={periodConfig}
            onUpdatePeriodConfig={handleUpdatePeriodConfig}
            currentUser={currentUser}
            globalRole={globalRole}
            addToast={addToast}
          />
        )}
        {activeTab === 'meeting_register' && (
          <MeetingRegistration 
            users={users}
            onAddMeeting={handleAddMeeting}
            onCancel={() => setActiveTab('meeting_calendar')}
            addToast={addToast}
          />
        )}
        {activeTab === 'meeting_calendar' && (
          <MeetingCalendar 
            meetings={meetings}
            users={users}
            onUpdateMeeting={handleUpdateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            addToast={addToast}
            globalRole={globalRole}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'weekly_schedule' && (
          <WeeklyWorkSchedule 
            schedules={weeklySchedules}
            users={users}
            currentUser={currentUser}
            globalRole={globalRole}
            onAddSchedule={handleAddWeeklySchedule}
            onUpdateSchedule={handleUpdateWeeklySchedule}
            onDeleteSchedule={handleDeleteWeeklySchedule}
            onBatchSaveSchedules={handleBatchSaveWeeklySchedules}
            onClearWeekSchedules={handleClearWeekSchedules}
            addToast={addToast}
          />
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLoginUser}
        users={users}
      />

      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={showChangePassModal}
          onClose={() => setShowChangePassModal(false)}
          isFirstLogin={isFirstLoginChange}
          currentUser={currentUser}
          onSavePassword={handleSavePassword}
        />
      )}
    
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Xóa toàn bộ dữ liệu?"
        message="Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu local để khôi phục về trạng thái ban đầu? Hành động này không thể hoàn tác."
        onConfirm={handleResetAllData}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}