import React, { useState, useMemo, useEffect } from 'react';
import { 
  ListChecks, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Eye, 
  ArrowRight,
  FileText,
  UserCheck,
  Award,
  Lock,
  RotateCcw,
  Trash2,
  Undo2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { WorkflowSubmission, User, KpiTask, SelfAssessmentDoc, EvaluationPeriodConfig, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getActualUserKpiTaskData } from '../utils/kpiLogic';

interface EvaluationListManagerProps {
  submissions: WorkflowSubmission[];
  users: User[];
  tasks: KpiTask[];
  docs?: SelfAssessmentDoc[];
  periodConfig: EvaluationPeriodConfig;
  onNavigateToWorkflow?: (userId: string) => void;
  selectedDepartment?: string;
  currentUser?: User | null;
  globalRole?: string;
  onUpdateSubmission?: (id: string, updates: Partial<WorkflowSubmission>) => Promise<void> | void;
  onDeleteSubmission?: (id: string) => Promise<void> | void;
  onClearAllSubmissions?: () => Promise<void> | void;
  addToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

const normStr = (x?: string): string =>
  (x || '').normalize('NFC').replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');

const getClassificationFromScore = (score: number): string => {
  if (score >= 90) return 'Hoàn thành xuất sắc nhiệm vụ';
  if (score >= 70) return 'Hoàn thành tốt nhiệm vụ';
  if (score >= 50) return 'Hoàn thành nhiệm vụ';
  return 'Không hoàn thành nhiệm vụ';
};

const getClassificationBadgeClass = (classification?: string | null): string => {
  if (!classification) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  const c = classification.toLowerCase();
  if (c.includes('xuất sắc') || c.includes('xuat sac')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 font-bold';
  }
  if (c.includes('tốt') || c.includes('tot')) {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 font-bold';
  }
  if (c.includes('không hoàn thành') || c.includes('khong hoan thanh')) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 font-bold';
  }
  if (c.includes('hoàn thành') || c.includes('hoan thanh')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 font-semibold';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200';
};

export const EvaluationListManager: React.FC<EvaluationListManagerProps> = ({
  submissions,
  users,
  tasks,
  docs = [],
  periodConfig,
  onNavigateToWorkflow,
  selectedDepartment = 'ALL',
  currentUser,
  globalRole = 'DEPT_HEAD',
  onUpdateSubmission,
  onDeleteSubmission,
  onClearAllSubmissions,
  addToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>(selectedDepartment);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeActionSub, setActiveActionSub] = useState<WorkflowSubmission | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [subToDelete, setSubToDelete] = useState<WorkflowSubmission | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Lắng nghe cập nhật thực tế từ Menu "Điểm thực hiện nhiệm vụ"
  useEffect(() => {
    const handleUpdate = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('kpi_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('kpi_data_updated', handleUpdate);
    };
  }, []);

  // Handle row click to navigate to workflow with pre-selected user
  const handleRowClick = (userId: string) => {
    if (onNavigateToWorkflow) {
      onNavigateToWorkflow(userId);
    }
  };

  // Revert Approval Handlers
  const handleRevertLeader = (sub: WorkflowSubmission, e: React.MouseEvent) => {
    e.stopPropagation();
    if (periodConfig.isLocked) {
      addToast?.('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể bỏ phê duyệt khi kỳ đánh giá đã khóa sổ.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn BỎ PHÊ DUYỆT LÃNH ĐẠO cho đồng chí ${sub.userName}?\nĐiểm chốt Lãnh đạo sẽ bị xóa và chuyển về trạng thái Trưởng phòng đã duyệt.`)) {
      return;
    }

    if (onUpdateSubmission) {
      onUpdateSubmission(sub.id, {
        status: 'APPROVED_DEPT',
        finalScore: undefined,
        finalClassification: undefined,
        finalApprovedAt: undefined,
        provinceLeaderComment: '',
      });
      addToast?.('warning', 'Đã Bỏ Phê Duyệt Lãnh Đạo', `Đã hủy kết quả phê duyệt Lãnh đạo cho ${sub.userName}.`);
    }
  };

  const handleRevertDept = (sub: WorkflowSubmission, e: React.MouseEvent) => {
    e.stopPropagation();
    if (periodConfig.isLocked) {
      addToast?.('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể bỏ phê duyệt khi kỳ đánh giá đã khóa sổ.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn BỎ PHÊ DUYỆT TRƯỞNG PHÒNG cho đồng chí ${sub.userName}?\nĐiểm Trưởng phòng sẽ bị xóa và chuyển về trạng thái Chờ duyệt.`)) {
      return;
    }

    if (onUpdateSubmission) {
      onUpdateSubmission(sub.id, {
        status: 'PENDING_DEPT',
        deptHeadScore: undefined,
        deptHeadClassification: undefined,
        deptApprovedAt: undefined,
        deptHeadComment: '',
        finalScore: undefined,
        finalClassification: undefined,
        finalApprovedAt: undefined,
        provinceLeaderComment: '',
      });
      addToast?.('warning', 'Đã Bỏ Phê Duyệt Cấp Phòng', `Đã hủy kết quả duyệt của Trưởng phòng cho ${sub.userName}.`);
    }
  };

  const handleRevertToDraft = (sub: WorkflowSubmission, e: React.MouseEvent) => {
    e.stopPropagation();
    if (periodConfig.isLocked) {
      addToast?.('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thu hồi khi kỳ đánh giá đã khóa sổ.');
      return;
    }
    if (!window.confirm(`Chuyển phiếu đánh giá của ${sub.userName} về TRẠNG THÁI NHÁP / THU HỒI?\nNgười dùng sẽ có thể mở lại phiếu để chỉnh sửa điểm, tiêu chí hoặc xóa làm lại.`)) {
      return;
    }

    if (onUpdateSubmission) {
      onUpdateSubmission(sub.id, {
        status: 'DRAFT',
        deptHeadScore: undefined,
        deptHeadClassification: undefined,
        deptApprovedAt: undefined,
        deptHeadComment: '',
        finalScore: undefined,
        finalClassification: undefined,
        finalApprovedAt: undefined,
        provinceLeaderComment: '',
        recalledAt: new Date().toLocaleString('vi-VN'),
        recalledBy: currentUser?.fullName || 'Lãnh đạo',
      });
      addToast?.('success', 'Đã Chuyển Về Bản Nháp', `Phiếu của ${sub.userName} đã được đưa về bản nháp để chỉnh sửa/xóa.`);
    }
  };

  const handleDeleteSub = (sub: WorkflowSubmission, e: React.MouseEvent) => {
    e.stopPropagation();
    if (periodConfig.isLocked) {
      addToast?.('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể xóa phiếu khi kỳ đánh giá đã khóa sổ.');
      return;
    }
    setSubToDelete(sub);
  };

  const confirmDeleteSingleSub = () => {
    if (!subToDelete) return;
    if (onDeleteSubmission) {
      onDeleteSubmission(subToDelete.id);
    } else if (onUpdateSubmission) {
      onUpdateSubmission(subToDelete.id, {
        status: 'DELETED',
        deletedAt: new Date().toLocaleString('vi-VN'),
        deletedBy: currentUser?.fullName || 'Quản trị viên',
      });
    }
    addToast?.('success', 'Đã Xóa Phiếu Đánh Giá', `Phiếu đánh giá của ${subToDelete.userName} đã được xóa thành công.`);
    setSubToDelete(null);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (periodConfig.isLocked) {
      addToast?.('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể xóa dữ liệu khi kỳ đánh giá đã khóa sổ.');
      return;
    }
    const count = submissions.filter(s => s.status !== 'DELETED').length;
    if (count === 0) {
      addToast?.('info', 'Dữ Liệu Đã Trống', 'Hiện tại không có phiếu đánh giá nào trong hệ thống.');
      return;
    }
    setShowClearModal(true);
  };

  const confirmClearAll = () => {
    if (onClearAllSubmissions) {
      onClearAllSubmissions();
    }
    setShowClearModal(false);
  };

  // Build a consolidated list per user (excluding system admin accounts)
  const combinedList = useMemo(() => {
    const evaluatableUsers = users.filter(u => u.role !== 'ADMIN' && (u.username || '').toLowerCase() !== 'admin');
    return evaluatableUsers.map((user, idx) => {
      // Find submissions for this user (filtering out DELETED)
      const userSubs = submissions
        .filter(s => s.status !== 'DELETED')
        .filter(s => 
          s.userId === user.id || 
          normStr(s.userName) === normStr(user.fullName) ||
          s.userName === user.username
        );
      
      const latestSub = userSubs[0]; // most recent active submission

      // User tasks KPI: lấy số lượng công việc thực tế từ Menu Điểm Thực hiện nhiệm vụ (KHÔNG GÁN CỨNG)
      const actualKpi = getActualUserKpiTaskData(user, latestSub);
      const dynamicTaskCount = actualKpi.taskCount;
      const dynamicCompletedCount = actualKpi.completedTaskCount;

      // Scores
      // 1. Điểm tự chấm của cán bộ
      let selfScoreTotal: number | null = null;
      if (latestSub) {
        if (latestSub.criteria && latestSub.criteria.length > 0) {
          const nonRedundant = latestSub.criteria.filter(c => c.id !== 'crit_classification' && c.id !== 'crit_final_eval');
          const sum = nonRedundant.reduce((a, b) => a + (Number(b.selfScore) || 0), 0);
          if (sum > 0) {
            selfScoreTotal = Number(sum.toFixed(1));
          } else if (latestSub.selfScoreTotal !== undefined && latestSub.selfScoreTotal !== null) {
            selfScoreTotal = Number(latestSub.selfScoreTotal);
          }
        } else if (latestSub.selfScoreTotal !== undefined && latestSub.selfScoreTotal !== null && Number(latestSub.selfScoreTotal) > 0) {
          selfScoreTotal = Number(latestSub.selfScoreTotal);
        } else if (latestSub.deptHeadScore !== undefined && latestSub.deptHeadScore !== null) {
          selfScoreTotal = Number(latestSub.deptHeadScore);
        } else {
          selfScoreTotal = 0;
        }
      }

      // 2. Điểm Trưởng phòng: CHỈ hiển thị khi Trưởng phòng ĐÃ DUYỆT hoặc Lãnh đạo đã duyệt
      const isDeptApproved = latestSub?.status === 'APPROVED_DEPT' || latestSub?.status === 'APPROVED_FINAL';
      const deptScore = isDeptApproved && latestSub?.deptHeadScore !== undefined && latestSub?.deptHeadScore !== null
        ? Number(latestSub.deptHeadScore)
        : null;

      // 3. Điểm Lãnh đạo Cục: CHỈ hiển thị khi Lãnh đạo Cục ĐÃ PHÊ DUYỆT (status === 'APPROVED_FINAL')
      const isLeaderApproved = latestSub?.status === 'APPROVED_FINAL';
      const finalScore = isLeaderApproved && latestSub?.finalScore !== undefined && latestSub?.finalScore !== null
        ? Number(latestSub.finalScore)
        : null;

      // 4. Kết Quả Xếp Loại Đánh Giá
      let classification: string = 'Chưa đánh giá';
      if (latestSub) {
        if (latestSub.status === 'APPROVED_FINAL') {
          classification = latestSub.finalClassification || (finalScore !== null ? getClassificationFromScore(finalScore) : 'Hoàn thành tốt nhiệm vụ');
        } else if (latestSub.status === 'APPROVED_DEPT') {
          classification = latestSub.deptHeadClassification || latestSub.selfClassification || (deptScore !== null ? getClassificationFromScore(deptScore) : 'Chờ Lãnh đạo duyệt');
        } else if (latestSub.status === 'PENDING_DEPT') {
          classification = latestSub.selfClassification || (selfScoreTotal !== null && selfScoreTotal > 0 ? getClassificationFromScore(selfScoreTotal) : 'Chờ Trưởng phòng duyệt');
        } else if (latestSub.status === 'DRAFT' || latestSub.status === 'RECALLED') {
          classification = latestSub.selfClassification || 'Bản nháp / Đã thu hồi';
        } else if (latestSub.status === 'REJECTED') {
          classification = 'Yêu cầu làm lại';
        } else {
          classification = latestSub.selfClassification || (selfScoreTotal !== null && selfScoreTotal > 0 ? getClassificationFromScore(selfScoreTotal) : 'Đã nộp phiếu');
        }
      }

      // Status
      let statusText = 'Chưa nộp phiếu';
      let statusBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      let statusKey = 'NOT_SUBMITTED';

      if (latestSub) {
        if (latestSub.status === 'APPROVED_FINAL') {
          statusText = 'Lãnh đạo đã duyệt';
          statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300';
          statusKey = 'APPROVED_FINAL';
        } else if (latestSub.status === 'APPROVED_DEPT') {
          statusText = 'Trưởng phòng đã duyệt (Chờ Cục)';
          statusBadgeClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300';
          statusKey = 'APPROVED_DEPT';
        } else if (latestSub.status === 'PENDING_DEPT') {
          statusText = 'Chờ Trưởng phòng duyệt';
          statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300';
          statusKey = 'PENDING_DEPT';
        } else if (latestSub.status === 'REJECTED') {
          statusText = 'Yêu cầu làm lại';
          statusBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300';
          statusKey = 'REJECTED';
        } else if (latestSub.status === 'DRAFT' || latestSub.status === 'RECALLED') {
          statusText = latestSub.status === 'RECALLED' ? 'Đã thu hồi' : 'Bản nháp';
          statusBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300';
          statusKey = latestSub.status;
        } else {
          statusText = 'Đã nộp phiếu';
          statusBadgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300';
          statusKey = 'SUBMITTED';
        }
      }

      // Find Department Head name dynamically from users list
      const normDept = normStr(user.department);
      const isCoSo = normDept.includes('thong ke co so') || normDept.includes('co so');

      const isHeadOfUnit = (u?: User | null) => {
        if (!u) return false;
        const pos = (u.position || '').toLowerCase().trim();
        if (pos.includes('phó') || pos.includes('pho')) return false;
        return (
          u.role === 'DEPT_HEAD' ||
          pos.includes('trưởng') ||
          pos.includes('chi cục trưởng') ||
          pos.includes('phụ trách') ||
          pos.includes('đội trưởng') ||
          pos.includes('q.') ||
          pos.includes('quyền')
        );
      };

      const isUserHead = isHeadOfUnit(user);

      let resolvedDeptHead = latestSub?.deptHeadName || '';
      let resolvedApprover = latestSub?.approverName || '';

      if (!resolvedDeptHead) {
        if (isUserHead || user.role === 'PROVINCE_LEADER') {
          const leader = (users || []).find((u) => 
            u.role === 'PROVINCE_LEADER' || 
            u.department === 'Lãnh đạo' ||
            (u.position && (u.position.toLowerCase().includes('cục trưởng') || u.position.toLowerCase().includes('phó cục trưởng')))
          );
          resolvedDeptHead = leader ? leader.fullName : 'Lãnh đạo Cục Thống kê';
        } else {
          const deptHead = (users || []).find((u) => {
            const uDept = normStr(u.department);
            if (uDept !== normDept) return false;
            return isHeadOfUnit(u);
          });
          if (deptHead && deptHead.fullName) {
            resolvedDeptHead = deptHead.fullName;
          } else {
            resolvedDeptHead = user.department ? (isCoSo ? `Trưởng ${user.department}` : `Trưởng ${user.department}`) : '';
          }
        }
      }

      if (!resolvedApprover) {
        resolvedApprover = resolvedDeptHead;
      }

      return {
        stt: idx + 1,
        user,
        period: latestSub?.period || periodConfig.periodName,
        taskCount: dynamicTaskCount,
        completedTaskCount: dynamicCompletedCount,
        submission: latestSub,
        selfScoreTotal,
        deptScore,
        finalScore,
        classification,
        statusText,
        statusBadgeClass,
        statusKey,
        submittedAt: latestSub?.submittedAt || '',
        deptHeadName: resolvedDeptHead,
        approverName: resolvedApprover
      };
    });
  }, [users, submissions, tasks, periodConfig, refreshTrigger]);

  // Filtered list
  const filteredList = useMemo(() => {
    return combinedList.filter(item => {
      // Dept filter
      if (deptFilter !== 'ALL' && item.user.department !== deptFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SUBMITTED' && item.statusKey === 'NOT_SUBMITTED') return false;
        if (statusFilter === 'NOT_SUBMITTED' && item.statusKey !== 'NOT_SUBMITTED') return false;
        if (statusFilter === 'APPROVED' && item.statusKey !== 'APPROVED_FINAL' && item.statusKey !== 'APPROVED_DEPT') return false;
        if (statusFilter === 'PENDING' && item.statusKey !== 'PENDING_DEPT') return false;
        if (statusFilter === 'DRAFT' && item.statusKey !== 'DRAFT' && item.statusKey !== 'RECALLED') return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.user.fullName.toLowerCase().includes(q);
        const matchDept = (item.user.department || '').toLowerCase().includes(q);
        const matchPos = (item.user.position || '').toLowerCase().includes(q);
        if (!matchName && !matchDept && !matchPos) return false;
      }
      return true;
    });
  }, [combinedList, deptFilter, statusFilter, searchTerm]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = combinedList.length;
    const submitted = combinedList.filter(i => i.statusKey !== 'NOT_SUBMITTED').length;
    const approved = combinedList.filter(i => i.statusKey === 'APPROVED_FINAL').length;
    const pending = combinedList.filter(i => i.statusKey === 'PENDING_DEPT' || i.statusKey === 'APPROVED_DEPT').length;
    return { total, submitted, approved, pending };
  }, [combinedList]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredList.map((item, i) => ({
      'STT': i + 1,
      'Kỳ Đánh Giá': item.period,
      'Họ và Tên': item.user.fullName,
      'Phòng Ban': item.user.department,
      'Chức Vụ': item.user.position,
      'Số lượng công việc': item.taskCount,
      'Đã hoàn thành': item.completedTaskCount,
      'Điểm tự chấm': item.selfScoreTotal !== null ? item.selfScoreTotal : '',
      'Điểm Trưởng phòng': item.deptScore !== null ? item.deptScore : '',
      'Điểm Lãnh đạo Cục': item.finalScore !== null ? item.finalScore : '',
      'Kết Quả Xếp Loại': item.classification,
      'Trạng thái': item.statusText,
      'Trưởng phòng duyệt': item.deptHeadName || '',
      'Lãnh đạo phê duyệt': item.approverName || '',
      'Thời gian nộp': item.submittedAt || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Danh_Gia');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Danh_Sach_Danh_Gia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isAdminOrLeader = globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER';
  const isDeptHeadOrAdmin = globalRole === 'DEPT_HEAD' || globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER';

  return (
    <div id="evaluation-list-container" className="space-y-5 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Danh Sách Theo Dõi & Đánh Giá Cán Bộ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {periodConfig.periodName} • Tổng hợp điểm tự chấm, điểm duyệt và kết quả xếp loại thi đua cán bộ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {periodConfig.isLocked && (
            <span className="px-3 py-2 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Đã khóa sổ — chỉ xem
            </span>
          )}
          {onNavigateToWorkflow && (
            <button
              onClick={() => onNavigateToWorkflow('')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Màn hình Phê duyệt KPI
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Xuất Excel Danh Sách
          </button>
          {isAdminOrLeader && onClearAllSubmissions && (
            <button
              onClick={handleClearAll}
              disabled={periodConfig.isLocked}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Xóa toàn bộ các phiếu tự chấm và kết quả phê duyệt để bắt đầu kỳ mới sạch 100%"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa sạch dữ liệu đánh giá</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng số cán bộ</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">100% nhân sự</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">Đã nộp phiếu</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400">{stats.submitted}</span>
            <span className="text-xs font-semibold text-sky-600">
              {stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Đang chờ duyệt</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.pending}</span>
            <span className="text-xs font-semibold text-amber-600">Cần xử lý</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Đã duyệt hoàn tất</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.approved}</span>
            <span className="text-xs font-semibold text-emerald-600">Chốt chính thức</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, chức vụ, phòng ban..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Dept Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Tất cả Phòng ban / Đơn vị</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="SUBMITTED">Đã nộp phiếu</option>
              <option value="PENDING">Đang chờ duyệt</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="DRAFT">Bản nháp / Thu hồi</option>
              <option value="NOT_SUBMITTED">Chưa nộp phiếu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[680px] custom-scrollbar">
          <table className="w-full border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-[#1e3a8a] text-white font-bold">
                <th className="px-2.5 py-3 w-10 text-center border-b-2 border-indigo-950 border-r border-indigo-900">STT</th>
                <th className="px-3 py-3 min-w-[170px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Họ và Tên</th>
                <th className="px-3 py-3 min-w-[160px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Phòng Ban / Đơn Vị</th>
                <th className="px-2.5 py-3 min-w-[120px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Chức Vụ</th>
                <th className="px-2.5 py-3 min-w-[100px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Nhiệm Vụ (KPI)</th>
                <th className="px-2.5 py-3 min-w-[125px] text-center border-b-2 border-indigo-950 border-r border-indigo-900" title="Tổng điểm kết quả theo dõi đánh giá (Tiêu chí chung 30đ + Điểm thực hiện nhiệm vụ 70đ)">Kết Quả TĐĐG (Tự chấm)</th>
                <th className="px-2.5 py-3 min-w-[110px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Điểm Trưởng Phòng</th>
                <th className="px-2.5 py-3 min-w-[110px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Điểm Lãnh Đạo</th>
                <th className="px-3 py-3 min-w-[170px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Kết Quả Xếp Loại</th>
                <th className="px-3 py-3 min-w-[150px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Trạng Thái</th>
                <th className="px-3 py-3 min-w-[140px] text-center border-b-2 border-indigo-950 border-r border-indigo-900">Người Duyệt</th>
                <th className="px-3 py-3 min-w-[150px] text-center border-b-2 border-indigo-950">Thao Tác Quản Lý</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Không tìm thấy dữ liệu đánh giá phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const sub = item.submission;
                  const isOwner = currentUser && (item.user.id === currentUser.id || normStr(item.user.fullName) === normStr(currentUser.fullName));
                  const canRevertLeader = (globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER') && sub && sub.status === 'APPROVED_FINAL';
                  const canRevertDept = (globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD') && sub && (sub.status === 'APPROVED_DEPT' || sub.status === 'APPROVED_FINAL');
                  const canRevertToDraft = (globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER') && sub && ['APPROVED_DEPT', 'APPROVED_FINAL', 'PENDING_DEPT', 'REJECTED'].includes(sub.status);
                  const canDelete = sub && (globalRole === 'ADMIN' || (isOwner && ['DRAFT', 'PENDING_DEPT', 'RECALLED', 'REJECTED'].includes(sub.status)));

                  return (
                    <tr 
                      key={item.user.id} 
                      onClick={() => handleRowClick(item.user.id)}
                      className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40'} border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50/40 dark:hover:bg-slate-700/40 transition-colors cursor-pointer`}
                    >
                      {/* STT */}
                      <td className="px-2.5 py-2 w-10 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {item.stt}
                      </td>

                      {/* Họ Tên */}
                      <td className="px-3 py-2 min-w-[170px] font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.user.fullName}</span>
                          {isOwner && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-normal">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal font-mono">
                          @{item.user.username}
                        </div>
                      </td>

                      {/* Phòng Ban */}
                      <td className="px-3 py-2 min-w-[160px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {item.user.department || 'Chưa phân phòng'}
                      </td>

                      {/* Chức Vụ */}
                      <td className="px-2.5 py-2 min-w-[120px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {item.user.position || 'Chuyên viên'}
                      </td>

                      {/* Nhiệm Vụ */}
                      <td className="px-2.5 py-2 min-w-[100px] text-center border-r border-slate-100 dark:border-slate-800">
                        {item.taskCount > 0 ? (
                          <>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {item.completedTaskCount}/{item.taskCount}
                            </span>
                            <span className="text-[10px] text-slate-500 block">công việc</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            0 công việc
                          </span>
                        )}
                      </td>

                      {/* Điểm Tự Chấm */}
                      <td className="px-2.5 py-2 min-w-[110px] text-center border-r border-slate-100 dark:border-slate-800">
                        {item.selfScoreTotal !== null && item.selfScoreTotal >= 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-mono font-bold border border-amber-200 dark:border-amber-900 rounded">
                            {item.selfScoreTotal} đ
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>
                        )}
                      </td>

                      {/* Điểm Trưởng Phòng */}
                      <td className="px-2.5 py-2 min-w-[110px] text-center font-bold border-r border-slate-100 dark:border-slate-800">
                        {item.deptScore !== null ? (
                          <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-mono font-bold border border-sky-200 dark:border-sky-900 rounded">
                            {item.deptScore} đ
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Điểm Lãnh Đạo */}
                      <td className="px-2.5 py-2 min-w-[110px] text-center font-bold border-r border-slate-100 dark:border-slate-800">
                        {item.finalScore !== null ? (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono font-black border border-emerald-300 dark:border-emerald-900 rounded">
                            {item.finalScore} đ
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Kết Quả Xếp Loại */}
                      <td className="px-3 py-2 min-w-[170px] text-center border-r border-slate-100 dark:border-slate-800">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${getClassificationBadgeClass(item.classification)}`}>
                          {item.classification}
                        </span>
                      </td>

                      {/* Trạng Thái */}
                      <td className="px-3 py-2 min-w-[150px] text-center border-r border-slate-100 dark:border-slate-800">
                        <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold ${item.statusBadgeClass} rounded`}>
                          {item.statusText}
                        </span>
                      </td>

                      {/* Người Duyệt */}
                      <td className="px-3 py-2 min-w-[140px] text-center text-slate-700 dark:text-slate-300 text-xs border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {item.approverName || item.deptHeadName || (
                          <span className="text-slate-400 italic">Chờ chỉ định</span>
                        )}
                      </td>

                      {/* Thao Tác Quản Lý (Bỏ duyệt, Thu hồi, Xóa) */}
                      <td className="px-3 py-2 min-w-[150px] text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {/* Nút Xem / Thẩm định */}
                          <button
                            type="button"
                            onClick={() => handleRowClick(item.user.id)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors"
                            title="Xem chi tiết & thẩm định phiếu"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Bỏ duyệt Lãnh đạo */}
                          {canRevertLeader && sub && (
                            <button
                              type="button"
                              onClick={(e) => handleRevertLeader(sub, e)}
                              disabled={periodConfig.isLocked}
                              className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 text-[10px] font-bold rounded hover:bg-rose-100 transition-colors flex items-center gap-0.5 disabled:opacity-50"
                              title="Bỏ phê duyệt Lãnh đạo (Chuyển về Trưởng phòng đã duyệt)"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-600" />
                              <span>Bỏ duyệt Cục</span>
                            </button>
                          )}

                          {/* Bỏ duyệt Trưởng phòng */}
                          {canRevertDept && sub && sub.status === 'APPROVED_DEPT' && (
                            <button
                              type="button"
                              onClick={(e) => handleRevertDept(sub, e)}
                              disabled={periodConfig.isLocked}
                              className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 text-[10px] font-bold rounded hover:bg-amber-100 transition-colors flex items-center gap-0.5 disabled:opacity-50"
                              title="Bỏ phê duyệt Trưởng phòng (Chuyển về Chờ duyệt)"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-600" />
                              <span>Bỏ duyệt Phòng</span>
                            </button>
                          )}

                          {/* Thu hồi về Nháp */}
                          {canRevertToDraft && sub && (
                            <button
                              type="button"
                              onClick={(e) => handleRevertToDraft(sub, e)}
                              disabled={periodConfig.isLocked}
                              className="p-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Đưa về bản Nháp để cán bộ chỉnh sửa/xóa"
                            >
                              <Undo2 className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          )}

                          {/* Xóa phiếu */}
                          {canDelete && sub && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSub(sub, e)}
                              disabled={periodConfig.isLocked}
                              className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                              title="Xóa phiếu nộp sai hoàn toàn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: XÁC NHẬN XÓA TẤT CẢ DỮ LIỆU ĐÁNH GIÁ */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Xóa Sạch Dữ Liệu Đánh Giá</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Cảnh báo: Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn <span className="font-bold text-rose-600">xóa toàn bộ các phiếu đánh giá</span> trong kỳ này? Hệ thống sẽ làm sạch dữ liệu để các đơn vị nộp lại từ đầu.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận xóa sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA 1 PHIẾU NỘP SAI */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Xóa Phiếu Nộp Sai</h3>
                <p className="text-xs text-slate-500">Cán bộ: <span className="font-bold text-slate-700 dark:text-slate-200">{subToDelete.userName}</span></p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn <span className="font-bold text-rose-600">xóa hoàn toàn</span> phiếu đánh giá này? Dữ liệu tự chấm và kết quả phê duyệt của đồng chí này sẽ được xóa để làm lại phiếu mới.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingleSub}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xóa phiếu này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
