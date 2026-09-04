import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Users
} from 'lucide-react';
import { KpiTask, DEPARTMENTS, User, EvaluationPeriodConfig } from '../types';
import { TaskDataViewer } from './TaskDataViewer';

interface PeriodManagementProps {
  users?: User[];
  tasks: KpiTask[];
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<KpiTask, 'id' | 'status' | 'scoreCalculated' | 'daysLate'>) => void;
  onUpdateTask: (id: string, updated: Partial<KpiTask>) => void;
  onImportTasks?: (data: any[]) => void;
  onClearTasks?: () => void;
  onSyncDepartments?: () => void;
  selectedDepartment: string;
  setSelectedDepartment?: (dept: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  onNavigateTab: (tab: any) => void;
  periodConfig: EvaluationPeriodConfig;
  onUpdatePeriodConfig: (cfg: EvaluationPeriodConfig) => void;
  globalRole?: string;
  currentUser?: User | null;
}

export const PeriodManagement: React.FC<PeriodManagementProps> = ({
  users = [],
  tasks = [],
  onDeleteTask,
  onAddTask,
  onUpdateTask,
  onImportTasks,
  onClearTasks,
  onSyncDepartments,
  selectedDepartment,
  setSelectedDepartment,
  addToast,
  onNavigateTab,
  periodConfig,
  onUpdatePeriodConfig,
  globalRole = 'ADMIN',
  currentUser
}) => {
  const isStaff = globalRole === 'STAFF';
  const canManage = globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD';
  // Kỳ hiện tại lấy từ periodConfig (toàn cục, lưu localStorage + Firestore)
  const selectedPeriod = periodConfig.periodName;
  const periods: string[] = periodConfig.periods || [];
  const setSelectedPeriod = (p: string) => {
    // Chuyển kỳ hiện tại → reset trạng thái khóa khi đổi kỳ
    onUpdatePeriodConfig({ ...periodConfig, periodName: p, isLocked: false, lockedAt: undefined, lockedBy: undefined });
  };
  const [selectedDeptForAssign, setSelectedDeptForAssign] = useState<string>(DEPARTMENTS[1]);
  const [newPeriodName, setNewPeriodName] = useState('');

  // Task assignment state for department heads
  const [assignedTaskName, setAssignedTaskName] = useState('');
  const [assignedJobType, setAssignedJobType] = useState('Nhiệm vụ thường xuyên');
  const [assignedUser, setAssignedUser] = useState('Nguyễn Văn An');
  const [assignedCoopUnit, setAssignedCoopUnit] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedDeadline, setAssignedDeadline] = useState('2026-06-30');
  const [assignedStatus, setAssignedStatus] = useState('Chưa hoàn thành');
  const [assignedLateReason, setAssignedLateReason] = useState('');

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) {
      addToast('warning', 'Vui lòng nhập tên kỳ đánh giá!');
      return;
    }
    const trimmed = newPeriodName.trim();
    if (periods.includes(trimmed)) {
      addToast('warning', 'Kỳ đánh giá này đã tồn tại!');
      return;
    }
    const newPeriods = [trimmed, ...periods];
    // Tạo & kích hoạt kỳ mới → lưu vào periodConfig (localStorage toàn cục)
    onUpdatePeriodConfig({ ...periodConfig, periodName: trimmed, periods: newPeriods, isLocked: false, lockedAt: undefined, lockedBy: undefined });
    setNewPeriodName('');
    addToast('success', 'Tạo & Kích Hoạt Kỳ Đánh Giá Thành Công!', `Đã thiết lập và kích hoạt kỳ: ${trimmed}`);
  };

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTaskName.trim()) {
      addToast('warning', 'Vui lòng nhập tên công việc!');
      return;
    }
    
    const newTask = {
      taskName: assignedTaskName.trim(),
      jobType: assignedJobType,
      department: selectedDeptForAssign,
      userName: assignedUser.trim(),
      coopUnit: assignedCoopUnit.trim(),
      assignedDate: assignedDate,
      planDeadline: assignedDeadline,
      weight: 1,
      lateReason: assignedLateReason.trim(),
      notes: '',
      status: assignedStatus,
    };
    
    onAddTask(newTask as any);
    
    // addToast is already called inside handleAddTask in App.tsx typically, but let's keep it or remove it. We'll leave it to App.tsx which handles onAddTask to show toast.
    // Wait, let's keep this specific toast since it's richer. Actually App.tsx adds "Thêm thành công".
    
    setAssignedTaskName('');
    setAssignedCoopUnit('');
    setAssignedLateReason('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Giao Việc & Phân Nhóm Công Việc
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Giao việc, phân nhóm danh mục công việc, thiết lập kỳ đánh giá
            </p>
          </div>

          {/* Period Selector dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Kỳ hiện tại:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={periodConfig.isLocked}
              className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-slate-800 text-xs font-bold text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-slate-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {periods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {periodConfig.isLocked ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-[10px] font-bold" title={`Khóa bởi ${periodConfig.lockedBy || '—'} lúc ${periodConfig.lockedAt ? new Date(periodConfig.lockedAt).toLocaleString('vi-VN') : '—'}`}>
                🔒 Đã khóa sổ
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">
                🔓 Đang mở
              </span>
            )}
          </div>
        </div>
      </div>

      {!isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Create Period Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Tạo Kỳ Đánh Giá Mới
            </h3>
            <p className="text-[11px] text-slate-500">
              Dành cho Lãnh đạo và Trưởng phòng mở kỳ đánh giá KPI mới cho toàn đơn vị.
            </p>

            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên Kỳ Báo Cáo / Đánh Giá:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quý III năm 2026 hoặc Tháng 08/2026"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors w-full"
              >
                Kích Hoạt Kỳ Này
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Danh sách các kỳ đã thiết lập:</h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {periods.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {p}
                    </span>
                    {selectedPeriod === p && (
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-[10px] font-bold">Đang chọn</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assign Tasks by Dept Head */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Trưởng Phòng Phân Giao Danh Sách Công Việc Cho Cá Nhân
            </h3>
            <p className="text-[11px] text-slate-500">
              Trưởng đơn vị chọn phòng ban phụ trách và phân công danh sách nhiệm vụ công việc cho từng công chức trong đơn vị để xuất hiện trong Danh sách công việc.
            </p>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên công việc <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={assignedTaskName}
                  onChange={(e) => setAssignedTaskName(e.target.value)}
                  placeholder="Nhập nội dung công việc giao cho cá nhân..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Loại công việc</label>
                  <select
                    value={assignedJobType}
                    onChange={(e) => setAssignedJobType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    <option value="Nhiệm vụ thường xuyên">Nhiệm vụ thường xuyên</option>
                    <option value="Nhiệm vụ trọng tâm">Nhiệm vụ trọng tâm</option>
                    <option value="Nhiệm vụ đột xuất">Nhiệm vụ đột xuất</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng ban / Đơn vị</label>
                  <select
                    value={selectedDeptForAssign}
                    onChange={(e) => setSelectedDeptForAssign(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    {DEPARTMENTS.slice(1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Người/ đơn vị chủ trì</label>
                  <input
                    type="text"
                    value={assignedUser}
                    onChange={(e) => setAssignedUser(e.target.value)}
                    placeholder="Họ và tên cán bộ chủ trì"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Đơn vị phối hợp</label>
                  <input
                    type="text"
                    value={assignedCoopUnit}
                    onChange={(e) => setAssignedCoopUnit(e.target.value)}
                    placeholder="Các đơn vị phối hợp (nếu có)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày giao việc</label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={assignedDeadline}
                    onChange={(e) => setAssignedDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tình trạng</label>
                  <select
                    value={assignedStatus}
                    onChange={(e) => setAssignedStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lý do trễ hạn (Nếu có)</label>
                  <input
                    type="text"
                    value={assignedLateReason}
                    onChange={(e) => setAssignedLateReason(e.target.value)}
                    placeholder="Ghi chú nếu trễ hạn"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center px-4 py-2.5 bg-sky-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-sky-700 transition-colors w-full"
                >
                  Giao Việc & Thêm Vào Bảng Theo Dõi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Task Data Viewer List embedded */}
      <div className={`${!isStaff ? 'mt-8 border-t border-slate-200 dark:border-slate-800 pt-6' : ''}`}>
        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg uppercase tracking-wide mb-4">
          Danh Sách Công Việc Đã Giao
        </h3>
        <TaskDataViewer 
            tasks={tasks}
            users={users}
            onDeleteTask={onDeleteTask}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onImportTasks={onImportTasks}
            onClearTasks={onClearTasks}
            onSyncDepartments={onSyncDepartments}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            addToast={addToast}
            globalRole={globalRole}
            currentUser={currentUser}
        />
      </div>
    </div>
  );
};
