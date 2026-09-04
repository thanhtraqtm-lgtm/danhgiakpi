import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User as UserIcon, 
  Building2, 
  Crown, 
  Eye, 
  Check, 
  MessageSquare, 
  FileCheck, 
  BadgeCheck,
  Sparkles,
  ChevronRight,
  FileText,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  Award,
  Layers,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  UploadCloud,
  Download,
  Trash2,
  Undo2,
  Flag,
  Printer
} from 'lucide-react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableCell, 
  TableRow, 
  TextRun, 
  AlignmentType, 
  WidthType, 
  BorderStyle 
} from 'docx';
import { saveAs } from 'file-saver';
import { WorkflowSubmission, User, EvaluationPeriodConfig, SelfEvalCriterion, CLASSIFICATION_OPTIONS } from '../types';

interface WorkflowApprovalProps {
  submissions: WorkflowSubmission[];
  periodConfig: EvaluationPeriodConfig;
  onUpdateSubmission: (id: string, updates: Partial<WorkflowSubmission>) => void;
  onDeleteSubmission?: (id: string) => void;
  onClearAllSubmissions?: () => Promise<void> | void;
  onUpdatePeriodConfig: (cfg: EvaluationPeriodConfig) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  globalRole: string;
  currentUser?: User | null;
  users?: User[];
  preSelectedUserId?: string;
}

export const WorkflowApproval: React.FC<WorkflowApprovalProps> = ({
  submissions = [],
  periodConfig,
  onUpdateSubmission,
  onDeleteSubmission,
  onClearAllSubmissions,
  onUpdatePeriodConfig,
  addToast,
  globalRole = 'DEPT_HEAD',
  currentUser,
  users = [],
  preSelectedUserId,
}) => {
  const [selectedSub, setSelectedSub] = useState<WorkflowSubmission | null>(null);
  const [viewMode, setViewMode] = useState<'CONSOLE' | 'WORD_DOC'>('CONSOLE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State for Dept Head review
  const [deptComment, setDeptComment] = useState('');
  const [deptScore, setDeptScore] = useState<number | ''>(95);
  const [deptClassification, setDeptClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');

  // Form State for Province Leader review
  const [leaderComment, setLeaderComment] = useState('');
  const [leaderFinalScore, setLeaderFinalScore] = useState<number | ''>(95);
  const [leaderClassification, setLeaderClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');

  // Lock Confirmation Modal
  const [showLockModal, setShowLockModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [subToDelete, setSubToDelete] = useState<WorkflowSubmission | null>(null);

  // Determine effective user role
  const isStaff = React.useMemo(() => {
    if (globalRole === 'STAFF') return true;
    if (currentUser) {
      if (currentUser.role === 'STAFF') return true;
      if (currentUser.role === 'ADMIN' || currentUser.role === 'PROVINCE_LEADER' || currentUser.role === 'DEPT_HEAD') {
        return false;
      }
      const pos = (currentUser.position || '').toLowerCase();
      if ((pos.includes('nhân viên') || pos.includes('chuyên viên') || pos.includes('thống kê viên')) && !pos.includes('trưởng')) {
        return true;
      }
    }
    return false;
  }, [globalRole, currentUser]);

  const isDeptHead = React.useMemo(() => {
    if (globalRole === 'DEPT_HEAD') return true;
    if (currentUser) {
      if (currentUser.role === 'DEPT_HEAD') return true;
      const pos = (currentUser.position || '').toLowerCase().trim();
      if (pos.includes('phó') || pos.includes('pho')) return false;
      if (
        pos.includes('trưởng') || 
        pos.includes('chi cục') || 
        pos.includes('phụ trách') || 
        pos.includes('q.') || 
        pos.includes('quyền') ||
        pos.includes('đội trưởng')
      ) {
        return true;
      }
    }
    return false;
  }, [globalRole, currentUser]);

  const isProvinceLeader = React.useMemo(() => {
    if (globalRole === 'PROVINCE_LEADER' || globalRole === 'ADMIN') return true;
    if (currentUser) {
      if (currentUser.role === 'PROVINCE_LEADER' || currentUser.role === 'ADMIN') return true;
      const pos = (currentUser.position || '').toLowerCase();
      if (pos.includes('cục trưởng') || pos.includes('phó cục trưởng') || currentUser.department === 'Lãnh đạo') {
        return true;
      }
    }
    return false;
  }, [globalRole, currentUser]);

  // Dynamic Approver (Trưởng phòng / Trưởng Thống kê cơ sở) lookup from users (Danh sách nhân sự)
  const approverInfo = React.useMemo(() => {
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

    if (!selectedSub) {
      const isCoSoUser = (currentUser?.department || '').toLowerCase().includes('thống kê cơ sở') || 
        (currentUser?.department || '').toLowerCase().includes('cơ sở') ||
        (currentUser?.position || '').toLowerCase().includes('thống kê cơ sở');
      return {
        name: isCoSoUser ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng',
        title: isCoSoUser ? 'TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : 'TRƯỞNG PHÒNG PHÊ DUYỆT',
        roleLabel: isCoSoUser ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng',
        isLeader: false
      };
    }

    const targetDept = selectedSub.department || '';
    const staffName = selectedSub.userName || '';
    const normDept = targetDept.normalize('NFC').trim().toLowerCase();
    const isCoSo = normDept.includes('thống kê cơ sở') || normDept.includes('cơ sở');
    const defaultTitle = isCoSo ? 'TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : 'TRƯỞNG PHÒNG PHÊ DUYỆT';
    const defaultRoleLabel = isCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng';

    // Check if the staff being evaluated is already a Dept Head or Province Leader
    const staffObj = (users || []).find((u) => 
      u.fullName?.normalize('NFC').trim().toLowerCase() === staffName.normalize('NFC').trim().toLowerCase()
    );

    const isStaffHead = isHeadOfUnit(staffObj);

    if (isStaffHead || staffObj?.role === 'PROVINCE_LEADER') {
      const leader = (users || []).find((u) => 
        u.role === 'PROVINCE_LEADER' || 
        u.department === 'Lãnh đạo' || 
        (u.position && (u.position.toLowerCase().includes('cục trưởng') || u.position.toLowerCase().includes('phó cục trưởng')))
      );
      return {
        title: 'LÃNH ĐẠO CƠ QUAN PHÊ DUYỆT',
        roleLabel: 'Lãnh đạo cơ quan',
        name: leader ? leader.fullName : (selectedSub.approverName || 'Lãnh đạo Cục Thống kê'),
        isLeader: true
      };
    }

    // 1. Look for Department Head in users for that specific department (including Q. Trưởng Thống kê cơ sở)
    const deptHead = (users || []).find((u) => {
      const uDept = (u.department || '').normalize('NFC').trim().toLowerCase();
      if (uDept !== normDept) return false;
      return isHeadOfUnit(u);
    });

    if (deptHead && deptHead.fullName) {
      return {
        title: isCoSo ? 'TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : (deptHead.position ? `${deptHead.position.toUpperCase()} PHÊ DUYỆT` : defaultTitle),
        roleLabel: deptHead.position || (isCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng ' + (targetDept ? targetDept.replace('Phòng ', '') : '')),
        name: deptHead.fullName,
        isLeader: false
      };
    }

    // 2. Look for Phó Trưởng phòng / Phó Trưởng TKCS in that department
    const deputyHead = (users || []).find((u) => {
      const uDept = (u.department || '').normalize('NFC').trim().toLowerCase();
      if (uDept !== normDept) return false;
      const pos = (u.position || '').toLowerCase();
      return pos.includes('phó trưởng phòng') || pos.includes('phó chi cục trưởng') || pos.includes('phó trưởng thống kê cơ sở');
    });

    if (deputyHead && deputyHead.fullName) {
      return {
        title: isCoSo ? 'PHÓ TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : 'PHÓ TRƯỞNG PHÒNG PHÊ DUYỆT',
        roleLabel: isCoSo ? 'Phó Trưởng Thống kê cơ sở' : 'Phó Trưởng phòng',
        name: deputyHead.fullName,
        isLeader: false
      };
    }

    // 3. If submission has an approverName
    if (selectedSub.approverName && selectedSub.approverName.trim() !== '') {
      return {
        title: selectedSub.approverTitle || defaultTitle,
        roleLabel: defaultRoleLabel,
        name: selectedSub.approverName,
        isLeader: false
      };
    }

    // 4. Fallback: search for any other person in department
    const fallbackUser = (users || []).find((u) => {
      const uDept = (u.department || '').normalize('NFC').trim().toLowerCase();
      return uDept === normDept && u.fullName?.normalize('NFC').trim().toLowerCase() !== staffName.normalize('NFC').trim().toLowerCase();
    });

    if (fallbackUser && fallbackUser.fullName) {
      return {
        title: defaultTitle,
        roleLabel: isCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng đơn vị',
        name: fallbackUser.fullName,
        isLeader: false
      };
    }

    return {
      title: defaultTitle,
      roleLabel: defaultRoleLabel,
      name: targetDept ? (isCoSo ? `Trưởng ${targetDept}` : `Trưởng phòng ${targetDept}`) : (isCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng đơn vị'),
      isLeader: false
    };
  }, [selectedSub, users, currentUser]);

  const isSelectedCoSo = React.useMemo(() => {
    const dept = (selectedSub?.department || '').toLowerCase();
    return dept.includes('thống kê cơ sở') || dept.includes('cơ sở');
  }, [selectedSub]);

  const isCurrentApproverCoSo = React.useMemo(() => {
    const dept = (currentUser?.department || '').toLowerCase();
    const pos = (currentUser?.position || '').toLowerCase();
    return isSelectedCoSo || dept.includes('thống kê cơ sở') || dept.includes('cơ sở') || pos.includes('thống kê cơ sở');
  }, [currentUser, isSelectedCoSo]);

  const approverRoleName = isCurrentApproverCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng';
  const approverLevelName = isCurrentApproverCoSo ? 'cấp cơ sở' : 'cấp phòng';

  // Filter submissions
  const filteredSubmissions = React.useMemo(() => {
    return (submissions || []).filter((sub) => {
      // For STAFF role, strictly only show their own submissions
      if (isStaff && currentUser) {
        const matchName = sub.userName?.normalize('NFC').trim().toLowerCase() === currentUser.fullName?.normalize('NFC').trim().toLowerCase();
        const matchId = sub.userId === currentUser.id;
        if (!matchName && !matchId) return false;
      }
      // For DEPT_HEAD role, only show submissions from their department
      if (isDeptHead && !isProvinceLeader && currentUser && currentUser.department && currentUser.department !== 'ALL') {
        const normSubDept = (sub.department || '').normalize('NFC').trim().toLowerCase();
        const normUserDept = (currentUser.department || '').normalize('NFC').trim().toLowerCase();
        if (normSubDept !== normUserDept) return false;
      }
      if (deptFilter !== 'ALL' && sub.department !== deptFilter) return false;
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          sub.userName?.toLowerCase().includes(term) ||
          sub.department?.toLowerCase().includes(term) ||
          sub.userPosition?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [submissions, isStaff, isDeptHead, isProvinceLeader, currentUser, deptFilter, statusFilter, searchTerm]);

  // Initialize and keep selected submission synchronized strictly with filteredSubmissions
  useEffect(() => {
    if (filteredSubmissions.length > 0) {
      // If preSelectedUserId is passed and present in filtered
      if (preSelectedUserId) {
        const targetUser = users.find(u => u.id === preSelectedUserId);
        const matchPre = filteredSubmissions.find(s => 
          s.userId === preSelectedUserId || 
          (targetUser && s.userName?.normalize('NFC').trim().toLowerCase() === targetUser.fullName?.normalize('NFC').trim().toLowerCase())
        );
        if (matchPre) {
          handleSelectSubmission(matchPre);
          return;
        }
      }

      // Check if selectedSub is currently in filteredSubmissions
      const stillInList = filteredSubmissions.find((s) => s.id === selectedSub?.id);
      if (stillInList) {
        // Keep updated
        if (stillInList !== selectedSub) {
          setSelectedSub(stillInList);
        }
      } else {
        // Select the first valid submission from the filtered list!
        handleSelectSubmission(filteredSubmissions[0]);
      }
    } else {
      setSelectedSub(null);
    }
  }, [filteredSubmissions, preSelectedUserId, users]);

  // When selecting a submission to review
  const handleSelectSubmission = (sub: WorkflowSubmission) => {
    setSelectedSub(sub);
    const defaultDeptScore = sub.deptHeadScore !== undefined && sub.deptHeadScore !== null ? sub.deptHeadScore : (sub.selfScoreTotal || 0);
    const defaultLeaderScore = sub.finalScore !== undefined && sub.finalScore !== null ? sub.finalScore : (sub.deptHeadScore !== undefined ? sub.deptHeadScore : (sub.selfScoreTotal || 0));

    const defaultDeptClassification = sub.deptHeadClassification || sub.selfClassification || 'Hoàn thành tốt nhiệm vụ';
    const defaultLeaderClassification = sub.finalClassification || sub.deptHeadClassification || sub.selfClassification || 'Hoàn thành tốt nhiệm vụ';

    setDeptScore(defaultDeptScore);
    setDeptClassification(defaultDeptClassification);
    setDeptComment(sub.deptHeadComment || 'Đồng ý với kết quả tự nhận xét, đánh giá của công chức. Hoàn thành tốt các nhiệm vụ được giao trong kỳ.');
    
    setLeaderFinalScore(defaultLeaderScore);
    setLeaderClassification(defaultLeaderClassification);
    setLeaderComment(sub.provinceLeaderComment || 'Nhất trí với kết quả đánh giá của Trưởng đơn vị và xếp loại công chức theo quy định.');
  };

  // Clamp helper for scores
  const clampNumber = (val: string | number, max: number): number => {
    if (val === '' || val === undefined || val === null) return 0;
    const num = Number(val);
    if (isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > max) return max;
    return Number(num.toFixed(1));
  };

  // Action: Dept Head Approval
  const handleDeptApprove = (approved: boolean) => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thao tác vì Trưởng Thống kê Tỉnh đã khóa sổ kỳ đánh giá.');
      return;
    }

    const currentApprover = currentUser?.fullName || selectedSub.approverName || approverRoleName;

    if (approved) {
      const finalDeptScore = deptScore === '' ? (selectedSub.selfScoreTotal || 0) : Number(deptScore);
      onUpdateSubmission(selectedSub.id, {
        status: 'APPROVED_DEPT',
        deptHeadName: currentApprover,
        deptHeadComment: deptComment,
        deptHeadScore: finalDeptScore,
        deptHeadClassification: deptClassification,
        deptApprovedAt: new Date().toLocaleString('vi-VN'),
      });
      addToast(
        'success',
        'Đã Phê Duyệt & Chuyển Lãnh Đạo Cục!',
        `Đã định điểm ${approverRoleName}: ${finalDeptScore}đ - Xếp loại: ${deptClassification} cho ${selectedSub.userName} và chuyển lên Lãnh đạo Cục Thống kê.`
      );
    } else {
      onUpdateSubmission(selectedSub.id, {
        status: 'REJECTED',
        deptHeadComment: deptComment,
      });
      addToast('warning', 'Đã Yêu Cầu Sửa Đổi!', `Đã chuyển trả phiếu tự đánh giá của ${selectedSub.userName} để hoàn thiện lại.`);
    }
  };

  // Action: Province Leader Final Approval
  const handleLeaderApprove = () => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Kỳ đánh giá đã được khóa sổ chính thức.');
      return;
    }

    const finalChotScore = leaderFinalScore === '' ? (selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0) : Number(leaderFinalScore);

    onUpdateSubmission(selectedSub.id, {
      status: 'APPROVED_FINAL',
      provinceLeaderComment: leaderComment,
      finalScore: finalChotScore,
      finalClassification: leaderClassification,
      finalApprovedAt: new Date().toLocaleString('vi-VN'),
    });

    addToast(
      'success',
      'Đã Phê Duyệt Kết Quả Cuối Cùng!',
      `Đã chốt điểm KPI chính thức: ${finalChotScore}đ - Xếp loại: ${leaderClassification} cho ${selectedSub.userName}. Điểm đã được lưu vào Danh sách và Kết quả đánh giá.`
    );
  };

  // Action: Bỏ phê duyệt của Lãnh đạo Cục (Revert Province Leader Approval)
  const handleRevertLeaderApproval = (subId?: string) => {
    const targetSub = subId ? submissions.find(s => s.id === subId) : selectedSub;
    if (!targetSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể bỏ phê duyệt vì kỳ đánh giá đã được khóa sổ.');
      return;
    }

    if (!['PROVINCE_LEADER', 'ADMIN'].includes(globalRole)) {
      addToast('error', 'Không có quyền!', 'Chỉ Lãnh đạo Cục hoặc Quản trị viên mới có quyền bỏ phê duyệt cấp Lãnh đạo.');
      return;
    }

    onUpdateSubmission(targetSub.id, {
      status: 'APPROVED_DEPT',
      finalScore: undefined,
      finalClassification: undefined,
      finalApprovedAt: undefined,
      provinceLeaderComment: '',
    });

    addToast(
      'warning',
      'Đã Bỏ Phê Duyệt Lãnh Đạo!',
      `Đã hủy phê duyệt Lãnh đạo đối với phiếu của ${targetSub.userName}. Phiếu được chuyển về trạng thái Trưởng phòng đã duyệt.`
    );
  };

  // Action: Bỏ phê duyệt của Trưởng phòng (Revert Dept Head Approval)
  const handleRevertDeptApproval = (subId?: string) => {
    const targetSub = subId ? submissions.find(s => s.id === subId) : selectedSub;
    if (!targetSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể bỏ phê duyệt vì kỳ đánh giá đã được khóa sổ.');
      return;
    }

    onUpdateSubmission(targetSub.id, {
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

    addToast(
      'warning',
      'Đã Bỏ Phê Duyệt Cấp Phòng!',
      `Đã hủy phê duyệt Trưởng phòng đối với phiếu của ${targetSub.userName}. Phiếu được chuyển về trạng thái Chờ duyệt.`
    );
  };

  // Action: Chuyển hẳn về Nháp / Thu hồi (Để người dùng sửa lại hoặc xóa đi làm lại)
  const handleRevertToDraft = (subId?: string) => {
    const targetSub = subId ? submissions.find(s => s.id === subId) : selectedSub;
    if (!targetSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thu hồi vì kỳ đánh giá đã được khóa sổ.');
      return;
    }

    onUpdateSubmission(targetSub.id, {
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

    addToast(
      'success',
      'Đã Chuyển Về Bản Nháp!',
      `Phiếu tự đánh giá của ${targetSub.userName} đã được đưa về trạng thái Nháp. Cán bộ có thể chỉnh sửa lại các tiêu chí hoặc xóa phiếu để nộp lại.`
    );
  };

  // Action: Staff Recall/Retract Submission
  const handleRecallSubmission = () => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thu hồi vì kỳ đánh giá đã được khóa sổ.');
      return;
    }
    
    // Only allow recall if status is DRAFT or PENDING_DEPT
    if (!['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)) {
      addToast('error', 'Không Thể Thu Hồi!', `Chỉ có thể thu hồi khi phiếu ở trạng thái "Nháp" hoặc "Chờ Trưởng phòng duyệt". Trạng thái hiện tại: ${selectedSub.status}`);
      return;
    }

    onUpdateSubmission(selectedSub.id, {
      status: 'RECALLED',
      recalledAt: new Date().toLocaleString('vi-VN'),
      recalledBy: currentUser?.fullName || 'Cán bộ',
    });

    addToast(
      'success',
      'Đã Thu Hồi Phiếu!',
      `Phiếu tự đánh giá của ${selectedSub.userName} đã được thu hồi về trạng thái nháp. Bạn có thể chỉnh sửa và gửi lại.`
    );
  };

  // Action: Delete Submission (Supports Admin, Province Leader, Dept Head or Staff deleting their submission)
  const handleDeleteSubmission = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;
    
    const canDelete = globalRole === 'ADMIN' || 
                      globalRole === 'PROVINCE_LEADER' || 
                      globalRole === 'DEPT_HEAD' || 
                      (currentUser && (sub.userName === currentUser.fullName || sub.userId === currentUser.id));

    if (!canDelete) {
      addToast('error', 'Không Có Quyền!', 'Bạn chỉ có thể xóa phiếu của chính mình hoặc cần quyền Lãnh đạo / Quản trị viên.');
      return;
    }

    if (onDeleteSubmission) {
      onDeleteSubmission(subId);
    } else {
      onUpdateSubmission(subId, {
        status: 'DELETED',
        deletedAt: new Date().toLocaleString('vi-VN'),
        deletedBy: currentUser?.fullName || 'Quản trị viên',
      });
    }

    if (selectedSub?.id === subId) {
      setSelectedSub(null);
    }

    setSubToDelete(null);
    addToast('success', 'Đã Xóa Phiếu Thành Công!', `Phiếu tự đánh giá của ${sub.userName} đã được xóa hoàn toàn.`);
  };

  // Action: Recalculate Scores
  const handleRecalculateScores = () => {
    if (!selectedSub) return;
    
    // Recalculate based on criteria
    let totalScore = 0;
    if (selectedSub.criteria && selectedSub.criteria.length > 0) {
      totalScore = selectedSub.criteria.reduce((sum, c) => sum + (c.selfScore || 0), 0);
    } else {
      totalScore = selectedSub.selfScoreTotal || 0;
    }

    onUpdateSubmission(selectedSub.id, {
      selfScoreTotal: Number(totalScore.toFixed(1)),
      recalculatedAt: new Date().toLocaleString('vi-VN'),
      recalculatedBy: currentUser?.fullName || 'Hệ thống',
      version: (selectedSub.version || 0) + 1,
    });

    addToast(
      'success',
      'Đã Tính Lại Điểm!',
      `Đã cập nhật tổng điểm tự chấm: ${totalScore.toFixed(1)}đ cho ${selectedSub.userName}.`
    );
  };

  // Handle file upload for self-assessment
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSub || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    if (!file.name.match(/\.(docx?|xlsx?|pdf)$/i)) {
      addToast('error', 'Định Dạng Không Hợp Lệ!', 'Chỉ chấp nhận file .docx, .doc, .xlsx, .xls, .pdf');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      // In real app, upload to Firebase Storage or similar
      // For now, store as base64 or mock URL
      const fileUrl = URL.createObjectURL(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      onUpdateSubmission(selectedSub.id, {
        selfAssessmentFileUrl: fileUrl,
        selfAssessmentFileName: file.name,
      });

      addToast(
        'success',
        'Đã Tải Lên Bản Tự Đánh Giá!',
        `File ${file.name} đã được đính kèm với phiếu đánh giá.`
      );
    } catch (err) {
      clearInterval(progressInterval);
      addToast('error', 'Lỗi Tải Lên!', 'Không thể tải lên file. Vui lòng thử lại.');
    } finally {
      setUploadingFile(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Action: Exclusive "Khóa Sổ Kỳ Đánh Giá"
  const handleToggleLockPeriod = () => {
    if (globalRole !== 'PROVINCE_LEADER' && globalRole !== 'ADMIN') {
      addToast('error', 'Không Có Quyền!', 'Chỉ có Trưởng Thống kê Tỉnh mới có ĐẶC QUYỀN KHÓA SỔ.');
      return;
    }

    const nextLockState = !periodConfig.isLocked;
    onUpdatePeriodConfig({
      ...periodConfig,
      isLocked: nextLockState,
      lockedAt: nextLockState ? new Date().toLocaleString('vi-VN') : undefined,
      lockedBy: nextLockState ? (currentUser?.fullName || 'Đào Trọng Truyến (Trưởng Thống kê tỉnh)') : undefined,
    });

    setShowLockModal(false);

    if (nextLockState) {
      addToast('success', 'ĐÃ KHÓA SỔ KỲ ĐÁNH GIÁ!', 'Tất cả dữ liệu điểm KPI và phiếu đánh giá đã được đóng băng.');
    } else {
      addToast('info', 'Đã Mở Khóa Kỳ Đánh Giá', 'Cho phép cập nhật lại thông tin đánh giá.');
    }
  };

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50">
            <FileText className="w-3.5 h-3.5" /> Nháp
          </span>
        );
      case 'PENDING_DEPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/50">
            <Clock className="w-3.5 h-3.5" /> Chờ Trưởng phòng / Trưởng TKCS Duyệt
          </span>
        );
      case 'PENDING_PROVINCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/50">
            <Crown className="w-3.5 h-3.5" /> Chờ Lãnh Đạo Cục Chốt
          </span>
        );
      case 'APPROVED_DEPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300/50">
            <ShieldCheck className="w-3.5 h-3.5" /> Trưởng phòng / Trưởng TKCS Đã Duyệt
          </span>
        );
      case 'APPROVED_FINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
            <BadgeCheck className="w-3.5 h-3.5" /> Lãnh Đạo Cục Đã Chốt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/50">
            <XCircle className="w-3.5 h-3.5" /> Yêu Cầu Làm Lại
          </span>
        );
      case 'RECALLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50">
            <RotateCcw className="w-3.5 h-3.5" /> Đã Thu Hồi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5" /> Đã nộp phiếu
          </span>
        );
    }
  };

  // Trích xuất số điểm thật từ phiếu của người gửi theo đúng mẫu chuẩn, bỏ hoàn toàn việc gán cứng
  const extractedScores = React.useMemo(() => {
    if (!selectedSub) {
      return {
        scoreI1: 0, scoreI2: 0, sumCat1: 0,
        scoreII1: 0, scoreII2: 0, scoreII3: 0, scoreII4: 0, sumCat2: 0,
        scoreIII1: 0, scoreIII2: 0, scoreIII3: 0, scoreIII4: 0, sumCat3: 0,
        totalGeneralScore: 0,
        kpiScore: 0,
        grandTotalScore: 0,
      };
    }

    const grandTotal = Number(selectedSub.selfScoreTotal) || 0;
    const criteria = selectedSub.criteria || [];
    const findCrit = (id: string) => criteria.find(c => c.id === id);

    const critI1 = findCrit('crit_I_1');
    const critI2 = findCrit('crit_I_2');
    const critII1 = findCrit('crit_II_1');
    const critII2 = findCrit('crit_II_2');
    const critII3 = findCrit('crit_II_3');
    const critII4 = findCrit('crit_II_4');
    const critIII1 = findCrit('crit_III_1');
    const critIII2 = findCrit('crit_III_2');
    const critIII3 = findCrit('crit_III_3');
    const critIII4 = findCrit('crit_III_4');
    const critKpi = criteria.find(c => c.id === 'crit_IV_KPI' || c.id === 'crit_IV_kpi' || c.categoryName?.includes('IV') || c.categoryName?.includes('KPI'));

    if (critI1 || critII1 || critIII1) {
      const sI1 = Number(critI1?.selfScore) || 0;
      const sI2 = Number(critI2?.selfScore) || 0;
      const sII1 = Number(critII1?.selfScore) || 0;
      const sII2 = Number(critII2?.selfScore) || 0;
      const sII3 = Number(critII3?.selfScore) || 0;
      const sII4 = Number(critII4?.selfScore) || 0;
      const sIII1 = Number(critIII1?.selfScore) || 0;
      const sIII2 = Number(critIII2?.selfScore) || 0;
      const sIII3 = Number(critIII3?.selfScore) || 0;
      const sIII4 = Number(critIII4?.selfScore) || 0;

      const c1 = Number((sI1 + sI2).toFixed(1));
      const c2 = Number((sII1 + sII2 + sII3 + sII4).toFixed(1));
      const c3 = Number((sIII1 + sIII2 + sIII3 + sIII4).toFixed(1));
      const genTotal = Number((c1 + c2 + c3).toFixed(1));
      const kpi = critKpi?.selfScore !== undefined ? Number(critKpi.selfScore) : Number(Math.max(0, grandTotal - genTotal).toFixed(1));

      return {
        scoreI1: sI1, scoreI2: sI2, sumCat1: c1,
        scoreII1: sII1, scoreII2: sII2, scoreII3: sII3, scoreII4: sII4, sumCat2: c2,
        scoreIII1: sIII1, scoreIII2: sIII2, scoreIII3: sIII3, scoreIII4: sIII4, sumCat3: c3,
        totalGeneralScore: genTotal,
        kpiScore: kpi,
        grandTotalScore: grandTotal,
      };
    } else {
      // Trường hợp phiếu từ nguồn khác chỉ có selfScoreTotal, trích xuất điểm theo tỷ lệ thật
      let parsedGen = 0;
      let parsedKpi = 0;
      if (selectedSub.selfExplanation) {
        const genMatch = selectedSub.selfExplanation.match(/tiêu chí chung[:\s]+([\d.]+)/i);
        const kpiMatch = selectedSub.selfExplanation.match(/KPI[:\s]+([\d.]+)/i);
        if (genMatch) parsedGen = Number(genMatch[1]);
        if (kpiMatch) parsedKpi = Number(kpiMatch[1]);
      }
      
      const genTotal = parsedGen > 0 ? parsedGen : Number((Math.min(30, grandTotal * 0.3)).toFixed(1));
      const kpi = parsedKpi > 0 ? parsedKpi : Number(Math.max(0, grandTotal - genTotal).toFixed(1));
      const sI = Number((genTotal * (10 / 30)).toFixed(1));
      const sII = Number((genTotal * (10 / 30)).toFixed(1));
      const sIII = Number((genTotal * (10 / 30)).toFixed(1));

      const sI1 = Number((sI / 2).toFixed(1));
      const sI2 = Number((sI - sI1).toFixed(1));

      const sIIEach = Number((sII / 4).toFixed(1));
      const sIIIEach = Number((sIII / 4).toFixed(1));

      return {
        scoreI1: sI1, scoreI2: sI2, sumCat1: sI,
        scoreII1: sIIEach, scoreII2: sIIEach, scoreII3: sIIEach, scoreII4: sIIEach, sumCat2: sII,
        scoreIII1: sIIIEach, scoreIII2: sIIIEach, scoreIII3: sIIIEach, scoreIII4: sIIIEach, sumCat3: sIII,
        totalGeneralScore: genTotal,
        kpiScore: kpi,
        grandTotalScore: grandTotal,
      };
    }
  }, [selectedSub]);

  // Trích xuất ưu điểm và hạn chế từ bản tự nhận xét
  const parsedSelfExplanation = React.useMemo(() => {
    const text = selectedSub?.selfExplanation || '';
    const strMatch = text.match(/Ưu điểm:\s*([\s\S]*?)(?=\n\s*(?:Hạn chế:|Đề xuất xếp loại:|$))/i);
    const weakMatch = text.match(/Hạn chế:\s*([\s\S]*?)(?=\n\s*(?:Đề xuất xếp loại:|$))/i);
    return {
      strengths: strMatch ? strMatch[1].trim() : (text || 'Hoàn thành tốt các nhiệm vụ được giao theo chức trách, vị trí việc làm.'),
      weaknesses: weakMatch ? weakMatch[1].trim() : 'Cần tiếp tục phát huy năng lực, chủ động hơn trong công tác tham mưu.',
    };
  }, [selectedSub]);

  // Danh sách tiêu chí chuẩn Mẫu số 01/TĐĐG của Nhà nước
  const displayCriteria: SelfEvalCriterion[] = React.useMemo(() => {
    return [
      {
        id: 'crit_I_1',
        categoryName: 'I. Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ',
        targetDescription: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreI1,
        maxScore: 5.0
      },
      {
        id: 'crit_I_2',
        categoryName: 'I. Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ',
        targetDescription: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreI2,
        maxScore: 5.0
      },
      {
        id: 'crit_II_1',
        categoryName: 'II. Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        targetDescription: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreII1,
        maxScore: 2.5
      },
      {
        id: 'crit_II_2',
        categoryName: 'II. Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        targetDescription: 'Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreII2,
        maxScore: 2.5
      },
      {
        id: 'crit_II_3',
        categoryName: 'II. Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        targetDescription: 'Tinh thần trách nhiệm trong thực thi công vụ',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreII3,
        maxScore: 2.5
      },
      {
        id: 'crit_II_4',
        categoryName: 'II. Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        targetDescription: 'Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreII4,
        maxScore: 2.5
      },
      {
        id: 'crit_III_1',
        categoryName: 'III. Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ',
        targetDescription: 'Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực, tác động tích cực đến kết quả thực hiện nhiệm vụ của cơ quan, tổ chức, đơn vị.',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreIII1,
        maxScore: 2.5
      },
      {
        id: 'crit_III_2',
        categoryName: 'III. Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ',
        targetDescription: 'Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, nhiệm vụ có tính chất đột xuất, phức tạp hoặc trong điều kiện khó khăn.',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreIII2,
        maxScore: 2.5
      },
      {
        id: 'crit_III_3',
        categoryName: 'III. Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ',
        targetDescription: 'Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm khi có sai sót và có biện pháp khắc phục rõ ràng, cụ thể.',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreIII3,
        maxScore: 2.5
      },
      {
        id: 'crit_III_4',
        categoryName: 'III. Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ',
        targetDescription: 'Chủ động đưa ra quyết định trong phạm vi thẩm quyền, không né tránh; có tinh thần tiên phong trong thực hiện những nhiệm vụ mới.',
        plannedDeadline: selectedSub?.period || 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: extractedScores.scoreIII4,
        maxScore: 2.5
      }
    ];
  }, [selectedSub, extractedScores]);

  // Tổng cộng điểm tự đánh giá: LUÔN LẤY SỐ THẬT THEO PHIẾU CỦA CÁN BỘ
  const displayCriteriaTotal = React.useMemo(() => {
    if (selectedSub?.selfScoreTotal !== undefined && selectedSub.selfScoreTotal !== null) {
      return selectedSub.selfScoreTotal;
    }
    return extractedScores.grandTotalScore;
  }, [selectedSub, extractedScores]);

  const displayCriteriaMaxTotal = 100;

  // Xuất file Word (.docx) chuẩn Mẫu số 01/TĐĐG của Nhà nước giữ nguyên 100% người gửi
  const handleDownloadDocx = async () => {
    if (!selectedSub) return;
    try {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
              },
            },
            children: [
              // Header Table (2 columns)
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 45, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỤC THỐNG KÊ TỈNH HƯNG YÊN', bold: true, size: 20 })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (selectedSub.department || 'PHÒNG THỐNG KÊ').toUpperCase(), bold: true, underline: {}, size: 20 })] }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 55, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 20 })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Hưng Yên, ngày ... tháng ... năm ${new Date().getFullYear()}`, italics: true, size: 18 })] }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              new Paragraph({ text: '', spacing: { after: 150 } }),

              // Form Title
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC', bold: true, size: 28 })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Kỳ đánh giá: ${selectedSub.period || periodConfig.periodName}`, italics: true, bold: true, size: 22 })],
                spacing: { after: 200 },
              }),

              // Staff Information
              new Paragraph({
                children: [
                  new TextRun({ text: 'Họ và tên: ', size: 22 }),
                  new TextRun({ text: selectedSub.userName, bold: true, size: 22 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Chức vụ, chức danh: ', size: 22 }),
                  new TextRun({ text: selectedSub.userPosition || 'Chuyên viên', size: 22 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Đơn vị công tác: ', size: 22 }),
                  new TextRun({ text: selectedSub.department || '', size: 22 }),
                ],
                spacing: { after: 180 },
              }),

              // Section I: Tiêu chí chung (30 điểm)
              new Paragraph({
                children: [new TextRun({ text: 'I. KẾT QUẢ THEO DÕI, ĐÁNH GIÁ THEO TIÊU CHÍ CHUNG', bold: true, size: 22 })],
                spacing: { after: 120 },
              }),

              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', bold: true, size: 20 })] })] }),
                      new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tiêu chí chấm điểm', bold: true, size: 20 })] })] }),
                      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm tối đa', bold: true, size: 20 })] })] }),
                      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm cá nhân tự chấm', bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(1)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(2)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(3)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(4)', italics: true, size: 18 })] })] }),
                    ],
                  }),

                  // Nhóm I
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'I', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.sumCat1}`, bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreI1}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreI2}`, size: 20 })] })] }),
                    ],
                  }),

                  // Nhóm II
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'II', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.sumCat2}`, bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreII1}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreII2}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tinh thần trách nhiệm trong thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreII3}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreII4}`, size: 20 })] })] }),
                    ],
                  }),

                  // Nhóm III
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'III', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.sumCat3}`, bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực, tác động tích cực đến kết quả thực hiện nhiệm vụ của cơ quan, tổ chức, đơn vị.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreIII1}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, nhiệm vụ có tính chất đột xuất, phức tạp hoặc trong điều kiện khó khăn.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreIII2}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm khi có sai sót và có biện pháp khắc phục rõ ràng, cụ thể.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreIII3}`, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chủ động đưa ra quyết định trong phạm vi thẩm quyền, không né tránh; có tinh thần tiên phong trong thực hiện những nhiệm vụ mới.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.scoreIII4}`, size: 20 })] })] }),
                    ],
                  }),

                  // Tổng cộng Tiêu chí chung (30đ)
                  new TableRow({
                    children: [
                      new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng cộng', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '30', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${extractedScores.totalGeneralScore}`, bold: true, size: 22 })] })] }),
                    ],
                  }),
                ],
              }),

              new Paragraph({ text: '', spacing: { after: 150 } }),

              // Section II: Tổng hợp kết quả
              new Paragraph({
                children: [new TextRun({ text: 'II. TỔNG HỢP KẾT QUẢ THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC, LAO ĐỘNG', bold: true, size: 22 })],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '1. Điểm tiêu chí chung: ', bold: true, size: 20 }),
                  new TextRun({ text: `${extractedScores.totalGeneralScore} / 30 điểm`, bold: true, size: 20 }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 1 (Phẩm chất chính trị, đạo đức, lối sống, kỷ luật): ${extractedScores.sumCat1} / 10 điểm`, size: 19 }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 2 (Năng lực chuyên môn, trách nhiệm, tác phong): ${extractedScores.sumCat2} / 10 điểm`, size: 19 }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 3 (Đổi mới, sáng tạo, dám nghĩ dám làm): ${extractedScores.sumCat3} / 10 điểm`, size: 19 }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '2. Điểm tiêu chí kết quả thực hiện nhiệm vụ (Tổng điểm KPI/100 x 70): ', bold: true, size: 20 }),
                  new TextRun({ text: `${extractedScores.kpiScore} / 70 điểm`, bold: true, size: 20 }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '3. Tổng điểm theo dõi, đánh giá công chức, lao động (Tổng cộng điểm tự đánh giá): ', bold: true, size: 22 }),
                  new TextRun({ text: `${selectedSub.selfScoreTotal !== undefined ? selectedSub.selfScoreTotal : extractedScores.grandTotalScore} / 100 điểm`, bold: true, size: 22 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '4. Tự nhận xét & chọn mức xếp loại thi đua: ', bold: true, size: 20 }),
                  new TextRun({ text: selectedSub.selfClassification || 'Hoàn thành tốt nhiệm vụ', bold: true, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '5. Ưu điểm: ', bold: true, size: 20 }),
                  new TextRun({ text: parsedSelfExplanation.strengths, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '6. Hạn chế, khuyết điểm: ', bold: true, size: 20 }),
                  new TextRun({ text: parsedSelfExplanation.weaknesses, size: 20 }),
                ],
                spacing: { after: 120 },
              }),

              // Section III: Ý kiến cấp có thẩm quyền
              new Paragraph({
                children: [new TextRun({ text: `III. Ý KIẾN VÀ KẾT QUẢ ĐÁNH GIÁ CỦA CẤP CÓ THẨM QUYỀN`, bold: true, size: 22 })],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `- Ý kiến nhận xét: `, bold: true, size: 20 }),
                  new TextRun({ text: selectedSub.deptHeadComment || selectedSub.provinceLeaderComment || 'Đồng ý với kết quả tự đánh giá của công chức.', size: 20 }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `- Điểm số xác nhận: `, bold: true, size: 20 }),
                  new TextRun({ text: selectedSub.finalScore !== undefined ? `${selectedSub.finalScore} / 100 điểm` : (selectedSub.deptHeadScore !== undefined ? `${selectedSub.deptHeadScore} / 100 điểm` : 'Đang xem xét'), bold: true, size: 20 }),
                ],
                spacing: { after: 200 },
              }),

              // Signatures Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG CHỨC TỰ ĐÁNH GIÁ', bold: true, size: 20 })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, size: 18 })] }),
                          new Paragraph({ text: '', spacing: { after: 600 } }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: selectedSub.userName, bold: true, size: 20 })] }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (approverInfo.title || 'CẤP CÓ THẨM QUYỀN ĐÁNH GIÁ').toUpperCase(), bold: true, size: 20 })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, size: 18 })] }),
                          new Paragraph({ text: '', spacing: { after: 600 } }),
                          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: approverInfo.name, bold: true, size: 20 })] }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Phieu_Theo_Doi_Danh_Gia_${selectedSub.userName.replace(/\s+/g, '_')}_${selectedSub.period || 'Ky_nay'}.docx`);
      addToast('success', 'Xuất tệp Word thành công', `Đã tải về mẫu phiếu chuẩn nhà nước của ${selectedSub.userName}.`);
    } catch (err) {
      console.error('Lỗi xuất file Word:', err);
      addToast('error', 'Lỗi xuất file', 'Không thể tạo file Word mẫu chuẩn.');
    }
  };

  const uniqueDepartments = Array.from(new Set(submissions.map((s) => s.department).filter(Boolean)));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Phân Hệ Trình Duyệt & Chấm Điểm 2 Cấp (Workflow)</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Luồng Phê Duyệt & Định Điểm Đánh Giá Công Chức
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Người đang đăng nhập: <strong className="text-indigo-600 dark:text-indigo-400">{currentUser?.fullName || 'Chưa đăng nhập'}</strong> ({currentUser?.position || 'Cán bộ'} - {currentUser?.department || 'Tất cả đơn vị'})
          </p>
        </div>

        {/* Lock Period Button for Leadership */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            periodConfig.isLocked 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300' 
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
          }`}>
            {periodConfig.isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
            <span>{periodConfig.periodName}: {periodConfig.isLocked ? 'ĐÃ KHÓA SỔ' : 'ĐANG MỞ KỲ'}</span>
          </div>

          {(globalRole === 'PROVINCE_LEADER' || globalRole === 'ADMIN') && (
            <button
              onClick={() => setShowLockModal(true)}
              className={`flex items-center justify-center px-4 py-2 gap-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all ${
                periodConfig.isLocked ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {periodConfig.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{periodConfig.isLocked ? 'Mở Khóa Kỳ Đánh Giá' : 'Khóa Sổ Kỳ Đánh Giá'}</span>
            </button>
          )}

          {(globalRole === 'PROVINCE_LEADER' || globalRole === 'ADMIN') && onClearAllSubmissions && (
            <button
              onClick={() => {
                if (periodConfig.isLocked) {
                  addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể xóa dữ liệu khi kỳ đánh giá đã khóa.');
                  return;
                }
                const count = submissions.filter(s => s.status !== 'DELETED').length;
                if (count === 0) {
                  addToast('info', 'Dữ Liệu Đã Trống', 'Hiện tại không có phiếu đánh giá nào trong hệ thống.');
                  return;
                }
                setShowClearAllModal(true);
              }}
              disabled={periodConfig.isLocked}
              className="flex items-center justify-center px-3.5 py-2 gap-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              title="Xóa toàn bộ phiếu tự chấm và kết quả phê duyệt trong kỳ"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa sạch dữ liệu phiếu</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Submissions */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Phiếu Gửi Duyệt ({filteredSubmissions.length}/{submissions.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nhấp vào từng cán bộ để xem phiếu, chấm điểm và nhận xét
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên cán bộ, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {uniqueDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="PENDING_DEPT">Chờ Trưởng phòng / Trưởng TKCS duyệt</option>
                <option value="PENDING_PROVINCE">Chờ Lãnh đạo Cục chốt</option>
                <option value="APPROVED_DEPT">Trưởng phòng / Trưởng TKCS đã duyệt</option>
                <option value="APPROVED_FINAL">Lãnh đạo Cục đã chốt</option>
                <option value="REJECTED">Yêu cầu làm lại</option>
                <option value="RECALLED">Đã thu hồi</option>
              </select>
            </div>
          </div>

          {/* Submissions List Container */}
          <div className="max-h-[620px] overflow-y-auto pr-1">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Chưa có phiếu đánh giá nào phù hợp.</p>
                <p className="mt-1">Hãy chuyển sang màn hình <strong>Phiếu đánh giá (Mẫu Word)</strong> hoặc <strong>KPI 3 Sheet (Mẫu Excel)</strong> để làm và gửi phê duyệt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-2 w-8 text-center">STT</th>
                      <th className="p-2 w-[30%] min-w-[180px]">Họ tên</th>
                      <th className="p-2 w-[20%] min-w-[120px]">Chức vụ</th>
                      <th className="p-2 w-[20%] min-w-[120px]">Phòng ban</th>
                      <th className="p-2 w-28 text-center" title="Tổng điểm kết quả theo dõi, đánh giá (Tiêu chí chung 30đ + Điểm thực hiện nhiệm vụ 70đ)">Kết quả TĐĐG</th>
                      <th className="p-2 w-24 text-center">Cấp phòng / Cơ sở</th>
                      <th className="p-2 w-24 text-center">Lãnh đạo chốt</th>
                      <th className="p-2 w-[18%] min-w-[150px] text-center">Trạng thái</th>
                      <th className="p-2 w-16 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map((sub, idx) => (
                      <tr 
                        key={sub.id} 
                        onClick={() => handleSelectSubmission(sub)}
                        className={`cursor-pointer transition-colors ${
                          selectedSub?.id === sub.id
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <td className="p-2 w-8 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{sub.userName}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{sub.userPosition}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{sub.department}</td>
                        <td className="p-2 w-24 text-center text-amber-700 dark:text-amber-300 font-mono font-bold">{sub.selfScoreTotal || 0}đ</td>
                        <td className="p-2 w-24 text-center text-sky-700 dark:text-sky-300 font-mono font-bold">
                          {(sub.status === 'APPROVED_DEPT' || sub.status === 'APPROVED_FINAL') && sub.deptHeadScore !== undefined && sub.deptHeadScore !== null
                            ? `${sub.deptHeadScore}đ`
                            : '—'}
                        </td>
                        <td className="p-2 w-24 text-center text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          {sub.status === 'APPROVED_FINAL' && sub.finalScore !== undefined && sub.finalScore !== null
                            ? `${sub.finalScore}đ`
                            : '—'}
                        </td>
                        <td className="p-2 w-[18%] min-w-[150px] text-center">
                          {renderStatusBadge(sub.status)}
                        </td>
                        <td className="p-2 w-16 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {globalRole === 'STAFF' && currentUser && sub.userName === currentUser.fullName && ['DRAFT', 'PENDING_DEPT'].includes(sub.status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecalculateScores();
                                  }}
                                  disabled={periodConfig.isLocked}
                                  className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                  title="Tính lại điểm"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecallSubmission();
                                  }}
                                  disabled={periodConfig.isLocked}
                                  className="px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
                                  title="Thu hồi phiếu"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            {(globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD' || (currentUser && (sub.userName === currentUser.fullName || sub.userId === currentUser.id))) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubToDelete(sub);
                                }}
                                disabled={periodConfig.isLocked}
                                className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-xs"
                                title="Xóa phiếu nộp sai"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review, Score Input & Full Form Preview */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          {selectedSub ? (
            <div>
              {/* Submission Header Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-xs">
                      {selectedSub.period || periodConfig.periodName}
                    </span>
                    {renderStatusBadge(selectedSub.status)}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-600" />
                    <span>{selectedSub.userName}</span>
                    <span className="text-xs font-normal text-slate-500">({selectedSub.userPosition} - {selectedSub.department})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {approverInfo.roleLabel} ký duyệt: <strong>{approverInfo.name}</strong>
                  </p>
                </div>

                {/* Switch View Tabs */}
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-xl gap-1 shrink-0">
                  <button
                    onClick={() => setViewMode('CONSOLE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'CONSOLE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bảng Điểm & Nhận Xét</span>
                  </button>
                  <button
                    onClick={() => setViewMode('WORD_DOC')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'WORD_DOC'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem Toàn Mẫu Phiếu Word</span>
                  </button>
                </div>
              </div>

              {/* VIEW MODE 1: CONSOLE (Chấm điểm & Phê duyệt nhanh) */}
              {viewMode === 'CONSOLE' && (
                <div className="space-y-5">
                  {/* Summary Score Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">1. Cán Bộ Tự Chấm (Kết quả TĐĐG)</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-300">{displayCriteriaTotal}</span>
                        <span className="text-[10px] text-slate-400">/ 100đ</span>
                      </div>
                      <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 py-0.5 px-2 rounded-md truncate">
                        {selectedSub.selfClassification || 'Tự đánh giá'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">2. {approverRoleName} Chấm</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-xl font-extrabold font-mono text-sky-700 dark:text-sky-300">
                          {(selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL') && selectedSub.deptHeadScore !== undefined && selectedSub.deptHeadScore !== null 
                            ? `${selectedSub.deptHeadScore}` 
                            : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">/ 100đ</span>
                      </div>
                      <div className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-900/40 py-0.5 px-2 rounded-md truncate">
                        {selectedSub.deptHeadClassification || (['APPROVED_DEPT', 'APPROVED_FINAL'].includes(selectedSub.status) ? 'Đã duyệt' : 'Chờ duyệt')}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">3. Lãnh Đạo Cục Chốt</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                          {selectedSub.status === 'APPROVED_FINAL' && selectedSub.finalScore !== undefined && selectedSub.finalScore !== null 
                            ? `${selectedSub.finalScore}` 
                            : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">/ 100đ</span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 py-0.5 px-2 rounded-md truncate">
                        {selectedSub.finalClassification || (selectedSub.status === 'APPROVED_FINAL' ? 'Đã chốt' : 'Chờ chốt')}
                      </div>
                    </div>
                  </div>

{/* Criteria Breakdown Table */}
                   <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                     <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                       <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                         <FileText className="w-3.5 h-3.5 text-indigo-600" />
                         <span>Chi Tiết Bảng Điểm Tự Đánh Giá Các Tiêu Chí</span>
                       </h4>
                       <span className="text-[11px] text-slate-500 font-semibold">
                         Tổng: <strong className="text-indigo-600 font-mono">{displayCriteriaTotal}đ</strong>
                       </span>
                     </div>

                     <div className="overflow-x-auto max-h-60 overflow-y-auto">
                       <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                         <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                             <th className="p-2.5 text-center w-10" style={{ width: '40px' }}>STT</th>
                             <th className="p-2.5" style={{ width: '15%' }}>Hạng mục tiêu chí</th>
                             <th className="p-2.5" style={{ width: '40%' }}>Nội dung đánh giá</th>
                             <th className="p-2.5 text-center" style={{ width: '60px' }}>Tối đa</th>
                             <th className="p-2.5 text-center" style={{ width: '60px' }}>Tự chấm</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {displayCriteria.map((c, idx) => (
                             <tr key={c.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                               <td className="p-2.5 text-center text-slate-400 font-mono whitespace-nowrap">{idx + 1}</td>
                               <td className="p-2.5 font-bold text-indigo-700 dark:text-indigo-400 whitespace-normal break-words">{c.categoryName}</td>
                               <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-normal break-words">{c.targetDescription}</td>
                               <td className="p-2.5 text-center font-mono text-slate-500 whitespace-nowrap">{c.maxScore}đ</td>
                               <td className="p-2.5 text-center font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 whitespace-nowrap">
                                 {c.selfScore}đ
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>

                  {/* Staff Self-Assessment Note (Ưu điểm & Hạn chế) */}
                  {selectedSub.selfExplanation && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        Ý kiến tự nhận xét của công chức (Ưu điểm / Hạn chế):
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selectedSub.selfExplanation}
                      </p>
                    </div>
                  )}

{/* ================= CÁN BỘ (STAFF) - TÙY CHỌN THU HỒI, TÍNH LẠI, TẢI LÊN BẢN TỰ ĐÁNH GIÁ ================= */}
                   {(globalRole === 'STAFF' && currentUser && selectedSub.userName === currentUser.fullName && ['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)) && (
                     <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 space-y-3.5 text-xs">
                       <div className="flex items-center justify-between">
                         <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-2">
                           <FileCheck className="w-4 h-4 text-indigo-600" />
                           <span>Thao Tác Cá Nhân: Thu Hồi, Tính Lại, Tải Lên Bản Tự Đánh Giá</span>
                         </h4>
                         <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                           Cán bộ: {selectedSub.userName}
                         </span>
                       </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Recall Button */}
                        <button
                          type="button"
                          onClick={handleRecallSubmission}
                          disabled={periodConfig.isLocked || !['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)}
                          className="px-3.5 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Thu Hồi Phiếu (Retract)</span>
                        </button>

                        {/* Recalculate Button */}
                        <button
                          type="button"
                          onClick={handleRecalculateScores}
                          disabled={periodConfig.isLocked}
                          className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Tính Lại Điểm</span>
                        </button>

                        {/* Upload Self-Assessment File */}
                        <label className={`px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer ${(periodConfig.isLocked || uploadingFile) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{uploadingFile ? `Đang tải... ${uploadProgress}%` : 'Tải Lên Bản Tự Đánh Giá'}</span>
                          <input
                            type="file"
                            accept=".docx,.doc,.xlsx,.xls,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={periodConfig.isLocked || uploadingFile}
                          />
                        </label>

                        {selectedSub.selfAssessmentFileName && (
                          <a
                            href={selectedSub.selfAssessmentFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{selectedSub.selfAssessmentFileName}</span>
                          </a>
                        )}
                      </div>

                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 italic">
                        <strong>Lưu ý:</strong> Chỉ có thể thu hồi khi phiếu ở trạng thái "Nháp" hoặc "Chờ Trưởng phòng / Trưởng TKCS duyệt". Sau khi cấp phòng/cơ sở đã duyệt, chỉ Lãnh đạo Cục mới có thể trả về.
                      </p>
                    </div>
                  )}

                  {/* ================= TRƯỞNG PHÒNG / TRƯỞNG THỐNG KÊ CƠ SỞ CHẤM ĐIỂM & NHẬN XÉT FORM ================= */}
                  {(['DEPT_HEAD', 'ADMIN'].includes(globalRole)) && (
                    <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-sky-200 dark:border-sky-900/60 space-y-3.5 text-xs">
                      <h4 className="font-extrabold text-sky-900 dark:text-sky-200 text-sm flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-600" />
                        <span>Ý Kiến Nhận Xét & Định Điểm Của {approverInfo.roleLabel}</span>
                      </h4>
                      <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
                        Cán bộ ký duyệt: {approverInfo.name}
                      </span>

                      {globalRole === 'PROVINCE_LEADER' ? (
                        // Read-only view for Province Leader
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Điểm {approverRoleName} chấm:
                              </label>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold font-mono text-base text-sky-900 dark:text-sky-200">
                                {selectedSub.deptHeadScore !== undefined && selectedSub.deptHeadScore !== null
                                  ? `${selectedSub.deptHeadScore} / 100 điểm`
                                  : 'Chưa chấm điểm'}
                              </div>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Xếp loại {approverRoleName} chọn:
                              </label>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-sky-800 dark:text-sky-200">
                                {selectedSub.deptHeadClassification || selectedSub.selfClassification || 'Chưa đánh giá'}
                              </div>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Trạng thái {approverLevelName}:
                              </label>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                {selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL' ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Đã duyệt {selectedSub.deptApprovedAt ? `lúc ${selectedSub.deptApprovedAt}` : ''}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Chờ {approverRoleName} duyệt
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Nội dung ý kiến nhận xét của {approverRoleName}:
                            </label>
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs leading-relaxed whitespace-pre-line min-h-[50px]">
                              {selectedSub.deptHeadComment || 'Chưa có nhận xét'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Full editable form for Dept Head and ADMIN
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                  Điểm {approverRoleName} chấm (Max 100):
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setDeptScore(displayCriteriaTotal)}
                                  className="text-[10px] text-indigo-600 hover:underline font-semibold"
                                >
                                  Lấy điểm tự chấm ({displayCriteriaTotal}đ)
                                </button>
                              </div>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={deptScore}
                                onChange={(e) => setDeptScore(e.target.value === '' ? '' : clampNumber(e.target.value, 100))}
                                disabled={periodConfig.isLocked}
                                className="w-full p-2 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 font-extrabold font-mono text-base text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Trạng thái phê duyệt {approverLevelName}:
                              </label>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                {selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL' ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Đã duyệt lúc {selectedSub.deptApprovedAt || 'hôm nay'}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Đang chờ {approverRoleName} xem xét
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dept Head Manual Classification Selector */}
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-sky-200 dark:border-sky-800 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {approverRoleName} đánh giá & chọn mức hoàn thành nhiệm vụ:
                              </label>
                              {selectedSub.selfClassification && (
                                <span className="text-[11px] text-sky-700 dark:text-sky-300">
                                  Cán bộ tự đề xuất: <strong>{selectedSub.selfClassification}</strong>
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                              {CLASSIFICATION_OPTIONS.map((opt, idx) => {
                                const isSelected = deptClassification === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setDeptClassification(opt)}
                                    disabled={periodConfig.isLocked}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                                      isSelected
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold ${
                                      isSelected ? 'bg-white text-sky-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <span className="truncate text-[11px]">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Nội dung ý kiến nhận xét của {approverRoleName}:
                            </label>
                            <textarea
                              rows={2}
                              value={deptComment}
                              onChange={(e) => setDeptComment(e.target.value)}
                              disabled={periodConfig.isLocked}
                              placeholder="Nhập nhận xét về phẩm chất, năng lực, tiến độ và kết quả thực hiện nhiệm vụ..."
                              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          {/* Action Buttons for Dept Head */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-sky-100 dark:border-sky-900/40">
                            <div className="flex items-center gap-2">
                              {(selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Bạn có chắc muốn BỎ PHÊ DUYỆT cấp Trưởng phòng cho ${selectedSub.userName}? Phiếu sẽ trở về trạng thái Chờ duyệt.`)) {
                                      handleRevertDeptApproval();
                                    }
                                  }}
                                  disabled={periodConfig.isLocked}
                                  className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                  title="Hủy kết quả chấm của Trưởng phòng"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Bỏ Duyệt Cấp Phòng</span>
                                </button>
                              )}
                              {(globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Đưa phiếu của ${selectedSub.userName} về bản Nháp để cán bộ có thể tự sửa đổi hoặc xóa làm lại?`)) {
                                      handleRevertToDraft();
                                    }
                                  }}
                                  disabled={periodConfig.isLocked}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                  title="Chuyển về trạng thái Nháp cho cán bộ sửa/xóa"
                                >
                                  <Undo2 className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Đưa Về Nháp Để Cán Bộ Sửa</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeptApprove(false)}
                                disabled={periodConfig.isLocked}
                                className="px-3.5 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Yêu Cầu Làm Lại</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeptApprove(true)}
                                disabled={periodConfig.isLocked}
                                className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Phê Duyệt & Chuyển Lãnh Đạo Cục</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ================= LÃNH ĐẠO CỤC PHÊ DUYỆT CUỐI CÙNG SECTION ================= */}
                  {(['PROVINCE_LEADER', 'ADMIN'].includes(globalRole)) && (
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-600" />
                          <span>Quyết Định Phê Duyệt & Chốt Điểm (Trưởng Thống kê Tỉnh)</span>
                        </h4>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                          Lãnh đạo: Đào Trọng Truyến
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700 dark:text-slate-300">
                              Điểm KPI chốt chính thức (Max 100):
                            </label>
                            <button
                              type="button"
                              onClick={() => setLeaderFinalScore(selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0)}
                              className="text-[10px] text-amber-700 hover:underline font-semibold"
                            >
                              Lấy điểm {approverRoleName} ({selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0}đ)
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={leaderFinalScore}
                            onChange={(e) => setLeaderFinalScore(e.target.value === '' ? '' : clampNumber(e.target.value, 100))}
                            disabled={periodConfig.isLocked}
                            className="w-full p-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-extrabold font-mono text-base text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Ý kiến kết luận của Lãnh đạo Cục:
                          </label>
                          <textarea
                            rows={2}
                            value={leaderComment}
                            onChange={(e) => setLeaderComment(e.target.value)}
                            disabled={periodConfig.isLocked}
                            placeholder="Ý kiến chỉ đạo và xếp loại thi đua..."
                            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Province Leader Manual Classification Decision Selector */}
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            Trưởng Thống kê Tỉnh quyết định mức xếp loại hoàn thành nhiệm vụ:
                          </label>
                          <div className="flex flex-wrap items-center gap-3 text-[11px]">
                            {selectedSub.selfClassification && (
                              <span className="text-slate-500">Tự chọn: <strong>{selectedSub.selfClassification}</strong></span>
                            )}
                            {selectedSub.deptHeadClassification && (
                              <span className="text-sky-700 dark:text-sky-300 font-medium">{approverRoleName} chọn: <strong>{selectedSub.deptHeadClassification}</strong></span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                          {CLASSIFICATION_OPTIONS.map((opt, idx) => {
                            const isSelected = leaderClassification === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setLeaderClassification(opt)}
                                disabled={periodConfig.isLocked}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                }`}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold ${
                                  isSelected ? 'bg-white text-amber-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="truncate text-[11px]">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-100 dark:border-amber-900/40">
                        <div className="flex items-center gap-2">
                          {selectedSub.status === 'APPROVED_FINAL' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc muốn BỎ PHÊ DUYỆT cấp Lãnh đạo cho ${selectedSub.userName}? Điểm chốt Lãnh đạo sẽ bị xóa và quay lại bước Trưởng phòng duyệt.`)) {
                                  handleRevertLeaderApproval();
                                }
                              }}
                              disabled={periodConfig.isLocked}
                              className="px-3.5 py-2 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                              title="Hủy bỏ phê duyệt của Lãnh đạo Cục"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                              <span>Bỏ Phê Duyệt Lãnh Đạo</span>
                            </button>
                          )}
                          {(globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD' || (currentUser && (selectedSub.userName === currentUser.fullName || selectedSub.userId === currentUser.id))) && (
                            <button
                              type="button"
                              onClick={() => setSubToDelete(selectedSub)}
                              disabled={periodConfig.isLocked}
                              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                              title="Xóa phiếu nộp sai khỏi hệ thống để làm lại"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Xóa Phiếu Nộp Sai</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleLeaderApprove}
                          disabled={periodConfig.isLocked}
                          className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Phê Duyệt Kết Quả Cuối Cùng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW MODE 2: WORD DOCUMENT PREVIEW */}
              {viewMode === 'WORD_DOC' && (
                <div className="space-y-4">
                  {/* Action Bar for Word Document */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        <span>In Phiếu (A4)</span>
                      </button>

                      <button
                        onClick={handleDownloadDocx}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải Mẫu Phiếu (.docx)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Mẫu số 01/TĐĐG chuẩn Nhà nước • Giữ nguyên vẹn của người gửi
                      </span>
                    </div>
                  </div>

                  {/* Document Body */}
                  <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl border border-slate-300 shadow-md space-y-6 font-serif max-h-[680px] overflow-y-auto">
                    {/* Official State Header */}
                    <div className="grid grid-cols-2 gap-4 text-center text-xs">
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-slate-800">THỐNG KÊ TỈNH HƯNG YÊN</p>
                        <p className="font-bold underline decoration-1 uppercase text-slate-900 mt-0.5">
                          {selectedSub.department || 'PHÒNG THỐNG KÊ'}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p className="font-bold underline decoration-1 text-slate-900 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                        <p className="italic text-[11px] text-slate-600 mt-1">
                          Hưng Yên, ngày ... tháng ... năm {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center pt-2">
                      <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1">Mẫu số 01/TĐĐG</p>
                      <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
                        PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC, LAO ĐỘNG
                      </h2>
                      <p className="text-xs italic font-semibold text-slate-700 mt-0.5">
                        Kỳ đánh giá: {selectedSub.period || periodConfig.periodName}
                      </p>
                    </div>

                    {/* Civil Servant Info */}
                    <div className="text-xs space-y-1.5 pl-3 border-l-2 border-slate-300 bg-slate-50/50 p-2.5 rounded-r">
                      <p><strong>Họ và tên:</strong> <span className="font-bold uppercase">{selectedSub.userName}</span></p>
                      <p><strong>Chức vụ, chức danh, vị trí việc làm:</strong> {selectedSub.userPosition || 'Chuyên viên'}</p>
                      <p><strong>Cơ quan, tổ chức, đơn vị:</strong> {selectedSub.department}</p>
                    </div>

                    {/* Section I: Criteria Table */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-xs uppercase text-slate-900">
                        I. KẾT QUẢ THEO DÕI, ĐÁNH GIÁ THEO TIÊU CHÍ CHUNG
                      </h3>
                      <table className="w-full border-collapse border border-slate-900 text-xs" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-slate-100 font-bold text-center text-slate-900">
                            <th className="border border-slate-900 p-2" style={{ width: '40px' }}>STT</th>
                            <th className="border border-slate-900 p-2 text-left" style={{ width: '60%' }}>Tiêu chí đánh giá</th>
                            <th className="border border-slate-900 p-2 text-center" style={{ width: '75px' }}>Điểm tối đa</th>
                            <th className="border border-slate-900 p-2 text-center" style={{ width: '85px' }}>Điểm tự chấm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayCriteria.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="border border-slate-900 p-2 text-center whitespace-nowrap">{i + 1}</td>
                              <td className="border border-slate-900 p-2 whitespace-normal break-words text-slate-800">
                                {c.categoryName && <strong className="block mb-0.5 text-slate-900">{c.categoryName}:</strong>}
                                <span>{c.targetDescription}</span>
                              </td>
                              <td className="border border-slate-900 p-2 text-center font-mono whitespace-nowrap">{c.maxScore}</td>
                              <td className="border border-slate-900 p-2 text-center font-bold font-mono text-indigo-700 whitespace-nowrap bg-indigo-50/30">
                                {c.selfScore}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-slate-100 text-slate-900">
                            <td colSpan={2} className="border border-slate-900 p-2 text-center uppercase tracking-wider">
                              Tổng cộng điểm tự đánh giá:
                            </td>
                            <td className="border border-slate-900 p-2 text-center font-mono font-bold">
                              {displayCriteriaMaxTotal || 100}
                            </td>
                            <td className="border border-slate-900 p-2 text-center font-mono text-indigo-800 font-extrabold text-sm bg-indigo-100/50">
                              {selectedSub.selfScoreTotal !== undefined ? selectedSub.selfScoreTotal : displayCriteriaTotal}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section II: Summary & Self Remarks */}
                    <div className="space-y-3 text-xs">
                      <h3 className="font-bold uppercase text-slate-900">
                        II. TỔNG HỢP KẾT QUẢ THEO DÕI, ĐÁNH GIÁ CỦA CÔNG CHỨC, LAO ĐỘNG
                      </h3>
                      
                      <div className="bg-slate-50 p-3 rounded border border-slate-300 space-y-1.5">
                        <p>
                          <strong>1. Tổng điểm tự đánh giá:</strong>{' '}
                          <span className="font-bold font-mono text-indigo-700 text-sm">
                            {selectedSub.selfScoreTotal !== undefined ? selectedSub.selfScoreTotal : displayCriteriaTotal} / 100 điểm
                          </span>
                        </p>
                        <p>
                          <strong>2. Cá nhân tự đề xuất xếp loại:</strong>{' '}
                          <span className="font-bold text-slate-900">
                            {selectedSub.selfClassification || 'Hoàn thành tốt nhiệm vụ'}
                          </span>
                        </p>
                        <div className="pt-1 border-t border-slate-200">
                          <strong>3. Tự nhận xét, đánh giá của công chức:</strong>
                          <p className="whitespace-pre-line text-slate-700 mt-1 pl-2 border-l border-slate-300 italic">
                            {selectedSub.selfExplanation || 'Không có bản tường trình bổ sung.'}
                          </p>
                        </div>
                      </div>

                      {/* Section III: Approver Opinions */}
                      <h3 className="font-bold uppercase text-slate-900 pt-2">
                        III. Ý KIẾN VÀ KẾT QUẢ ĐÁNH GIÁ CỦA {approverInfo.roleLabel.toUpperCase()}
                      </h3>
                      <div className="bg-sky-50/70 p-3 rounded border border-sky-200 space-y-1.5">
                        <p>
                          <strong>Ý kiến nhận xét của {approverInfo.roleLabel}:</strong>{' '}
                          <span className="text-slate-800">{selectedSub.deptHeadComment || deptComment || 'Đồng ý với kết quả tự đánh giá của công chức.'}</span>
                        </p>
                        <p className="font-bold text-sky-900">
                          Điểm {approverInfo.roleLabel} xác nhận:{' '}
                          <span className="font-mono text-sm">
                            {selectedSub.deptHeadScore !== undefined ? `${selectedSub.deptHeadScore} / 100 điểm` : 'Đang xem xét'}
                          </span>
                          {selectedSub.deptHeadClassification && (
                            <span className="ml-2 font-normal text-xs text-sky-800">({selectedSub.deptHeadClassification})</span>
                          )}
                        </p>
                        {selectedSub.provinceLeaderComment && (
                          <p className="pt-1 border-t border-sky-200 text-slate-800">
                            <strong>Ý kiến Lãnh đạo cơ quan:</strong> {selectedSub.provinceLeaderComment}
                          </p>
                        )}
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
                        <div>
                          <p className="font-bold uppercase text-slate-900">{approverInfo.title}</p>
                          <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                          <div className="h-16 flex items-center justify-center font-bold text-sky-800 text-sm">
                            {approverInfo.name}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold uppercase text-slate-900">CÔNG CHỨC TỰ ĐÁNH GIÁ</p>
                          <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                          <div className="h-16 flex items-center justify-center font-bold text-slate-900 text-sm">
                            {selectedSub.userName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 px-4 text-xs text-slate-400">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Vui lòng chọn một cán bộ từ danh sách bên trái để xem phiếu.</p>
              <p className="mt-1">Hệ thống sẽ hiển thị toàn bộ bảng điểm, mẫu phiếu Word, cùng biểu mẫu để Trưởng phòng / Trưởng TKCS và Lãnh đạo Cục cho điểm & nhận xét.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              {periodConfig.isLocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                {periodConfig.isLocked ? 'Xác Nhận Mở Khóa Kỳ Đánh Giá' : 'Xác Nhận Khóa Sổ Kỳ Đánh Giá KPI'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {periodConfig.isLocked
                  ? 'Bạn có chắc chắn muốn mở khóa kỳ đánh giá? Các cấp có thể tiếp tục chỉnh sửa điểm số.'
                  : 'Hành động này sẽ đóng băng toàn bộ điểm số KPI và phiếu tự đánh giá. Không ai có thể chỉnh sửa dữ liệu trừ khi mở khóa.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleToggleLockPeriod}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors ${
                  periodConfig.isLocked ? 'bg-slate-800 hover:bg-slate-900' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {periodConfig.isLocked ? 'Xác Nhận Mở Khóa' : 'Xác Nhận Khóa Sổ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA TẤT CẢ DỮ LIỆU PHIẾU */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Xóa Sạch Dữ Liệu Phiếu</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Cảnh báo quan trọng: Thao tác không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn <span className="font-bold text-rose-600">xóa tất cả phiếu đánh giá</span> trong kỳ này? Toàn bộ điểm tự chấm và kết quả phê duyệt sẽ được làm sạch để các đơn vị nộp lại từ đầu.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllSubmissions) {
                    onClearAllSubmissions();
                  }
                  setShowClearAllModal(false);
                }}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
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
              Bạn có chắc chắn muốn <span className="font-bold text-rose-600">xóa hoàn toàn</span> phiếu đánh giá này? Toàn bộ dữ liệu tự chấm và phê duyệt của cán bộ này sẽ được xóa để làm lại phiếu mới.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSubmission(subToDelete.id)}
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