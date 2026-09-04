import { formatDate } from "../utils/dateUtils";
import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  Building2, 
  Award,
  Calendar,
  X,
  Check
, Upload, Download, Trash } from 'lucide-react';
import { KpiTask, TaskStatus, Department, DEPARTMENTS, User, TaskCatalogItem } from '../types';
import * as XLSX from 'xlsx';
import { parseExcelFile, defaultCatalogItems } from '../utils/excelParser';

interface TaskDataViewerProps {
  users?: User[];
  tasks: KpiTask[];
  onDeleteTask: (id: string) => void;
  onAddTask: (task: any) => void;
  onUpdateTask: (id: string, updated: Partial<KpiTask>) => void;
  onImportTasks?: (data: any[]) => void;
  onClearTasks?: () => void;
  onSyncDepartments?: () => void;
  selectedDepartment: string;
  setSelectedDepartment?: (dept: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  globalRole?: string;
  currentUser?: User | null;
}

export const TaskDataViewer: React.FC<TaskDataViewerProps> = ({
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
  globalRole = 'ADMIN',
  currentUser
}) => {
  const isStaff = globalRole === 'STAFF';
  const canManage = globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD';

  const [searchKey, setSearchKey] = useState('');
  const [showClearConfirmTask, setShowClearConfirmTask] = useState(false);
  const [deleteConfirmTaskRow, setDeleteConfirmTaskRow] = useState<{id: string, name: string} | null>(null);
  const [selectingCatalogForTask, setSelectingCatalogForTask] = useState<KpiTask | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = ['STT', 'Tên công việc', 'Loại công việc', 'Người/ đơn vị chủ trì', 'Đơn vị phối hợp', 'Ngày giao việc', 'Hạn hoàn thành', 'Tình trạng', 'Lý do trễ hạn'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tien_do_nhiem_vu");
    XLSX.writeFile(wb, `Mau_Tien_do_nhiem_vu.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file, 'jobs');
      if (onImportTasks) {
        onImportTasks(parsed.allRows);
      } else {
        addToast('warning', 'Chưa hỗ trợ', 'Tính năng tải lên chưa được liên kết.');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi tải file', err.message || err.toString());
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    setShowClearConfirmTask(true);
  };
  
  const confirmClearData = () => {
    if (onClearTasks) onClearTasks();
    setShowClearConfirmTask(false);
  };
  
  const cancelClearData = () => {
    setShowClearConfirmTask(false);
  };

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<KpiTask | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKey, selectedDepartment, selectedStatus, tasks.length]);

  // Form states
  const [userName, setUserName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [jobType, setJobType] = useState('Kế hoạch tổng cục');
  const [coopUnit, setCoopUnit] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [planDeadline, setPlanDeadline] = useState('2026-01-01');
  const [actualDeadline, setActualDeadline] = useState('');
  const [status, setStatus] = useState('Hoàn thành');
  const [lateReason, setLateReason] = useState('');
  const [weight, setWeight] = useState(20);
  const [department, setDepartment] = useState<string>('Phòng Thống kê Tổng hợp');

  
  const handleExportExcel = () => {
    if (filteredTasks.length === 0) {
      addToast('warning', 'Không có dữ liệu', 'Không có công việc nào để xuất Excel.');
      return;
    }
    
    const headers = ['STT', 'Tên công việc', 'Loại công việc', 'Người/ đơn vị chủ trì', 'Đơn vị phối hợp', 'Ngày giao việc', 'Hạn hoàn thành', 'Tình trạng', 'Lý do trễ hạn'];
    const data = filteredTasks.map((t, i) => [
      i + 1,
      t.taskName,
      t.jobType || 'Kế hoạch tổng cục',
      t.userName,
      t.coopUnit || '',
      formatDate(t.assignedDate || ''),
      formatDate(t.planDeadline),
      t.status,
      t.lateReason || ''
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachCongViec");
    
    XLSX.writeFile(wb, `DanhSachCongViec_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Xuất Excel thành công', 'File Excel đã được tải xuống.');
  };

  const handleOpenAdd = () => {
    setUserName('Trần Thị Quyên');
    setTaskName('');
    setJobType('Kế hoạch tổng cục');
    setCoopUnit('');
    setAssignedDate('');
    setPlanDeadline('2026-01-01');
    setActualDeadline('');
    setStatus('Hoàn thành');
    setLateReason('');
    setWeight(20);
    setDepartment('Phòng Thống kê Tổng hợp');
    setEditingTask(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: KpiTask) => {
    setEditingTask(t);
    setUserName(t.userName);
    setTaskName(t.taskName);
    setJobType(t.jobType || 'Kế hoạch tổng cục');
    setCoopUnit(t.coopUnit || '');
    setAssignedDate(t.assignedDate || '');
    setPlanDeadline(t.planDeadline);
    setActualDeadline(t.actualDeadline || '');
    setStatus(t.status || 'Hoàn thành');
    setLateReason(t.lateReason || '');
    setWeight(t.weight);
    setDepartment(t.department || 'Phòng Thống kê Tổng hợp');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !taskName.trim() || !planDeadline) {
      addToast('warning', 'Thiếu thông tin!', 'Vui lòng điền người chủ trì, tên công việc và hạn hoàn thành.');
      return;
    }

    if (editingTask) {
      onUpdateTask(editingTask.id, {
        userName,
        taskName,
        jobType,
        coopUnit,
        assignedDate,
        planDeadline,
        actualDeadline,
        status,
        lateReason,
        weight: Number(weight),
        department,
      });
      addToast('success', 'Đã cập nhật nhiệm vụ!', `Cập nhật thành công cho "${taskName}".`);
    } else {
      onAddTask({
        userName,
        taskName,
        jobType,
        coopUnit,
        assignedDate,
        planDeadline,
        actualDeadline,
        status,
        lateReason,
        weight: Number(weight),
        department,
      });
      addToast('success', 'Đã thêm công việc mới!', `Đã thêm công việc "${taskName}".`);
    }

    setShowAddModal(false);
  };

  
  const confirmDeleteTaskRow = () => {
    if (deleteConfirmTaskRow) {
      onDeleteTask(deleteConfirmTaskRow.id);
      setDeleteConfirmTaskRow(null);
    }
  };
  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmTaskRow({ id, name });
  };

  const filteredTasks = (tasks || []).filter((t) => {
    const matchesDept = (selectedDepartment || '').toUpperCase() === 'ALL' || t.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    const matchesSearch =
      t.userName.toLowerCase().includes(searchKey.toLowerCase()) ||
      t.taskName.toLowerCase().includes(searchKey.toLowerCase()) ||
      (t.jobType && t.jobType.toLowerCase().includes(searchKey.toLowerCase())) ||
      (t.department && t.department.toLowerCase().includes(searchKey.toLowerCase()));

    return matchesDept && matchesStatus && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // KPI Statistics
  const totalCount = filteredTasks.length;
  const onTimeCount = filteredTasks.filter((t) => t.status === 'Hoàn thành' || t.status === 'Đúng hạn').length;
  const warningCount = filteredTasks.filter((t) => t.status === 'Gần đến hạn').length;
  const lateCount = filteredTasks.filter((t) => t.status === 'Chưa hoàn thành trễ hạn' || t.status === 'Trễ hạn').length;
  const failedCount = filteredTasks.filter((t) => t.status === 'Không hoàn thành').length;
  const onTimeRatio = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 100;

  const renderStatusBadge = (st: string, daysLate?: number) => {
    if (st === 'Hoàn thành' || st === 'Đúng hạn') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
          <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
        </span>
      );
    }
    if (st === 'Chưa hoàn thành trễ hạn' || st === 'Trễ hạn') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/50">
          <AlertTriangle className="w-3.5 h-3.5" /> {st}
        </span>
      );
    }
    if (st === 'Gần đến hạn') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/50">
          <Clock className="w-3.5 h-3.5" /> Gần đến hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50">
        {st}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in-50">
      {/* Top Toolbar Card matching screenshot */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <CheckSquare className="w-5 h-5 text-sky-700 dark:text-sky-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            QUẢN LÝ TIẾN ĐỘ & NHIỆM VỤ
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Tìm kiếm công việc, cán bộ..."
              className="px-3 py-1.5 pr-8 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment && setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">Tất cả Phòng ban</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="Hoàn thành">Hoàn thành</option>              
            <option value="Hoàn thành trễ hạn">Hoàn thành trễ hạn</option>              
            <option value="Chưa hoàn thành">Chưa hoàn thành</option>              
            <option value="Chưa hoàn thành trễ hạn">Chưa hoàn thành trễ hạn</option>            
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Tải xuống danh sách Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải xuống</span>
          </button>

          {!isStaff && (
            <>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fd7e14] hover:bg-[#e36a09] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Tải lên file Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải lên</span>
              </button>

              <button
                onClick={() => setShowClearConfirmTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dc3545] hover:bg-[#bb2d3b] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Xóa dữ liệu"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Xóa tất cả</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6610f2] hover:bg-[#5b0ed9] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Thêm & Giao việc mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main KPI Table with Green Header and Clean Government Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full min-w-[1200px] table-fixed text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#2d6e3e] text-white font-bold text-xs tracking-wide">
                <th className="px-2 py-3 w-10 text-center whitespace-nowrap border-r border-white/20">STT</th>
                <th className="px-3 py-3 w-[20%] text-center border-r border-white/20">Tên công việc</th>
                <th className="px-3 py-3 w-[10%] text-center whitespace-nowrap border-r border-white/20">Loại CV</th>
                <th className="px-3 py-3 w-[12%] text-center whitespace-nowrap border-r border-white/20">Phòng ban</th>
                <th className="px-3 py-3 w-[12%] text-center whitespace-nowrap border-r border-white/20">Người chủ trì</th>
                <th className="px-3 py-3 w-[11%] text-center whitespace-nowrap border-r border-white/20">Đơn vị phối hợp</th>
                <th className="px-3 py-3 w-24 text-center whitespace-nowrap border-r border-white/20">Ngày giao</th>
                <th className="px-3 py-3 w-24 text-center whitespace-nowrap border-r border-white/20">Hạn H.Thành</th>
                <th className="px-3 py-3 w-40 text-center whitespace-nowrap border-r border-white/20">Tình trạng</th>
                <th className="px-3 py-3 w-[10%] text-center border-r border-white/20">Lý do trễ hạn</th>
                {!isStaff && <th className="px-2 py-3 w-16 text-center whitespace-nowrap">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-normal">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 10 : 11} className="p-8 text-center text-slate-400">
                    Không tìm thấy dữ liệu công việc nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((t, idx) => (
                  <tr 
                    key={t.id} 
                    className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-300 dark:border-slate-700"
                  >
                    <td className="px-2 py-2 text-center text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td 
                      className={`px-3 py-2 text-slate-900 dark:text-slate-100 font-bold leading-snug border-r border-slate-300 dark:border-slate-700 break-words ${!isStaff ? 'cursor-pointer hover:text-sky-600 transition-colors' : ''}`}
                      onDoubleClick={() => !isStaff && setSelectingCatalogForTask(t)}
                      title={!isStaff ? "Nháy đúp để chọn nhóm danh mục cho công việc này" : ""}
                    >
                      {t.taskName}
                      {t.categoryGroup ? (
                        <div className="mt-1 text-[10px] text-slate-500 font-normal">
                          [Nhóm {t.categoryGroup} • Max: {t.maxScore}đ]
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 break-words">
                      {t.jobType || 'Kế hoạch'}
                    </td>
                    <td className="px-2 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 break-words">
                      {t.department}
                    </td>
                    <td className="px-2 py-2 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 break-words">
                      {t.userName}
                    </td>
                    <td className="px-2 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 break-words">
                      {t.coopUnit || '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {formatDate(t.assignedDate)}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-900 dark:text-slate-100 font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {formatDate(t.planDeadline)}
                    </td>
                    <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {renderStatusBadge(t.status, t.daysLate)}
                    </td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 break-words">
                      {t.lateReason || '—'}
                    </td>
                    {!isStaff && (
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="text-sky-600 hover:text-sky-800 transition-colors p-1"
                            title="Chỉnh sửa nhiệm vụ"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.taskName)}
                            className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                            title="Xóa nhiệm vụ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Hiển thị <span className="font-bold">{(currentPage - 1) * rowsPerPage + 1}</span>–<span className="font-bold">{Math.min(currentPage * rowsPerPage, filteredTasks.length)}</span> / <span className="font-bold">{filteredTasks.length}</span> dòng
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Task Modal */}
      
      {/* Clear Confirm Modal */}
      
      {/* Delete Row Confirm Modal */}
      {deleteConfirmTaskRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Xác nhận xóa công việc</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Xóa công việc "{deleteConfirmTaskRow.name}"?</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmTaskRow(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteTaskRow}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirmTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Xác nhận xóa</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Bạn có chắc chắn muốn xóa toàn bộ danh sách tiến độ? Hành động này không thể hoàn tác.</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={cancelClearData}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmClearData}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                {editingTask ? 'Chỉnh Sửa Công Việc' : 'Thêm Công Việc Theo Mẫu'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên công việc (*)
                </label>
                <textarea
                  rows={2}
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Báo cáo kiểm kê TSCĐ, CCDC lâu bền năm 2025..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loại công việc
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Kế hoạch tổng cục">Kế hoạch tổng cục</option>
                    <option value="Phát sinh">Phát sinh</option>
                    <option value="Kế hoạch đơn vị">Kế hoạch đơn vị</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người/ đơn vị chủ trì (*)
                  </label>
                  <input
                    type="text"
                    required
                    list="user-list"
                    value={userName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserName(val);
                      const normVal = (val || '').normalize('NFC').trim().toLowerCase();
                      const normValNoAccent = normVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                      let user = users.find((u) => {
                        const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                        return n === normVal;
                      });
                      if (!user && val) {
                        user = users.find((u) => {
                          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                          const n2 = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                          return n2 === normValNoAccent;
                        });
                      }
                      if (!user && val) {
                        user = users.find((u) => {
                          const n = (u.fullName || '').normalize('NFC').trim().toLowerCase();
                          return n.includes(normVal) || normVal.includes(n);
                        });
                      }
                      if (user && user.department) {
                        setDepartment(user.department);
                      }
                    }}
                    placeholder="Chọn nhân sự hoặc nhập tên đơn vị..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <datalist id="user-list">
                    {users.filter(u => u.role !== 'ADMIN' && (u.username || '').toLowerCase() !== 'admin').map(u => (
                      <option key={u.id} value={u.fullName}>{u.fullName} - {u.department}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị / Phòng ban (*)
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-xs"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị phối hợp
                  </label>
                  <input
                    type="text"
                    value={coopUnit}
                    onChange={(e) => setCoopUnit(e.target.value)}
                    placeholder="Nhập đơn vị phối hợp..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày giao việc
                  </label>
                  <input
                    type="text"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    placeholder="02/12/2025"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn hoàn thành (*)
                  </label>
                  <input
                    type="date"
                    required
                    value={planDeadline}
                    onChange={(e) => setPlanDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tình trạng
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    <option value="Chưa hoàn thành trễ hạn">Chưa hoàn thành trễ hạn</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Hoàn thành trễ hạn">Hoàn thành trễ hạn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do trễ hạn (nếu có)
                </label>
                <input
                  type="text"
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder="Ghi rõ lý do nếu trễ hạn..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex items-center justify-center px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded shadow-sm hover:bg-slate-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  {editingTask ? 'Lưu thay đổi' : 'Thêm Công Việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Catalog Selector Modal */}
      {selectingCatalogForTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Chọn Danh Mục Phân Nhóm 
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cho công việc: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectingCatalogForTask.taskName}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectingCatalogForTask(null);
                  setCatalogSearch('');
                }}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục công việc..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 shadow-sm z-10 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 w-16 text-center">STT</th>
                    <th className="px-4 py-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700">Nhiệm vụ chính</th>
                    <th className="px-4 py-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700">Công việc chi tiết</th>
                    <th className="px-4 py-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 text-center w-24">Nhóm</th>
                    <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center w-24">Khung điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {(() => {
                    let items: TaskCatalogItem[] = defaultCatalogItems;
                    try {
                      const stored = localStorage.getItem('kpi_admin_task_catalog_v1');
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
                      }
                    } catch (e) {}
                    
                    const filtered = items.filter(item => 
                      item.taskGroup.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                      item.detailTask.toLowerCase().includes(catalogSearch.toLowerCase())
                    );
                    
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            Không tìm thấy danh mục nào phù hợp.
                          </td>
                        </tr>
                      );
                    }
                    
                    return filtered.map((item, idx) => (
                      <tr 
                        key={item.id}
                        onClick={() => {
                          onUpdateTask(selectingCatalogForTask.id, {
                            categoryGroup: item.categoryGroup,
                            maxScore: item.maxScore,
                            conversionFactor: item.conversionFactor,
                            taskGroup: item.taskGroup,
                            detailTask: item.detailTask
                          });
                          addToast('success', 'Đã phân nhóm', `Đã gắn công việc vào nhóm ${item.categoryGroup} thành công.`);
                          setSelectingCatalogForTask(null);
                          setCatalogSearch('');
                        }}
                        className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700/50 text-center text-slate-500">{item.stt}</td>
                        <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700/50 font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{item.taskGroup}</td>
                        <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">{item.detailTask}</td>
                        <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700/50 text-center font-bold text-indigo-600 dark:text-indigo-400">{item.categoryGroup}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.maxScore}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => {
                  setSelectingCatalogForTask(null);
                  setCatalogSearch('');
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};