import { formatDate } from "../utils/dateUtils";
import React, { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Plus, 
  CheckCircle2, 
  UserPlus, 
  Building2, 
  Award,
  Layers,
  ArrowRight,
  Info,
  Link2,
  Check,
  Upload,
  Trash,
  X
} from 'lucide-react';
import { TaskCatalogItem, KpiTask, User, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';
import { parseExcelFile, downloadSampleCatalogExcel, defaultCatalogItems } from '../utils/excelParser';


interface TaskCatalogManagerProps {
  tasks: KpiTask[];
  users: User[];
  selectedDepartment: string;
  onAddTask: (task: Omit<KpiTask, 'id' | 'status' | 'scoreCalculated' | 'daysLate'>) => void;
  onUpdateTask?: (id: string, updated: Partial<KpiTask>) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  viewMode?: 'catalog' | 'assignment';
  onNavigate?: (tab: 'catalog' | 'assignment') => void;
  globalRole?: string;
  currentUser?: User | null;
}

export const TaskCatalogManager: React.FC<TaskCatalogManagerProps> = ({
  tasks,
  users,
  selectedDepartment,
  onAddTask,
  onUpdateTask,
  addToast,
  viewMode,
  onNavigate,
  globalRole = 'ADMIN',
  currentUser
}) => {
  const isStaff = globalRole === 'STAFF';
  const canManage = globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER' || globalRole === 'DEPT_HEAD';

  const [internalTab, setInternalTab] = useState<'catalog' | 'assignment'>('assignment');
  const activeTab = viewMode || internalTab;
  const setActiveTab = onNavigate || setInternalTab;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active target task ID when linking from assignment tab to catalog tab via double click
  const [activeTargetTaskId, setActiveTargetTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalog items stored in localStorage (no rigid hardcoded data, user can upload their own standard catalog)
  const [catalogItems, setCatalogItems] = useState<TaskCatalogItem[]>(() => {
    const stored = localStorage.getItem('kpi_admin_task_catalog_v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 100) return parsed; // require at least 100 items to keep stored data
      } catch {}
    }
    // Default initial empty or sample if none exists
    return defaultCatalogItems;
  });

  React.useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('kpi_admin_task_catalog_v1');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCatalogItems(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


  // Handle uploading standard Task Catalog Excel
  
  
  const handleExportExcel = () => {
    const wsData: (string | number)[][] = [
      ['STT', 'Nhiệm vụ', 'Công việc chi tiết', 'Sản phẩm đầu ra', 'Phân nhóm', 'Khung điểm tối đa', 'Điểm chấm', 'Hệ số quy đổi', 'Ghi chú']
    ];
    filteredCatalog.forEach((item, idx) => {
      wsData.push([
        item.stt || (idx + 1),
        item.taskGroup,
        item.detailTask,
        item.outputProduct,
        item.categoryGroup,
        item.maxScore,
        item.evaluatedScore,
        item.conversionFactor,
        item.notes || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 5 }, { wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_muc_cong_viec");
    XLSX.writeFile(wb, `Danh_muc_cong_viec_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleClearCatalog = () => {
    setShowClearConfirm(true);
  };
  const confirmClearCatalog = () => {
    setCatalogItems([]);
    localStorage.removeItem('kpi_admin_task_catalog_v1');
    addToast('success', 'Xóa thành công', 'Đã xóa toàn bộ danh mục.');
    setShowClearConfirm(false);
  };

  const handleUploadCatalogExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rows || rows.length === 0) {
        throw new Error('Tệp Excel trống.');
      }

      let headerRowIdx = -1;
      let colMap = {
        stt: 0,
        taskGroup: 1,
        detailTask: 2,
        outputProduct: 3,
        categoryGroup: 4,
        maxScore: 5,
        evaluatedScore: 6,
        conversionFactor: 7,
        notes: 8,
      };

      // Search for header
      let maxScore = -1;
      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        let score = 0;
        let tempColMap = { ...colMap };
        row.forEach((cell: any, cIdx: number) => {
          const val = String(cell || '').toLowerCase().trim();
          if (val === 'stt' || val.includes('stt')) { tempColMap.stt = cIdx; score++; }
          else if (val.includes('nhiệm vụ') || val.includes('nhiem vu')) { tempColMap.taskGroup = cIdx; score++; }
          else if (val.includes('công việc chi tiết') || val.includes('công việc') || val.includes('chi tiết')) { tempColMap.detailTask = cIdx; score++; }
          else if (val.includes('sản phẩm đầu ra') || val.includes('sản phẩm') || val.includes('đầu ra')) { tempColMap.outputProduct = cIdx; score++; }
          else if (val.includes('phân nhóm') || val.includes('nhóm')) { tempColMap.categoryGroup = cIdx; score++; }
          else if (val.includes('khung điểm') || val.includes('tối đa')) { tempColMap.maxScore = cIdx; score++; }
          else if (val.includes('điểm chấm') || val.includes('chấm')) { tempColMap.evaluatedScore = cIdx; score++; }
          else if (val.includes('hệ số') || val.includes('quy đổi')) { tempColMap.conversionFactor = cIdx; score++; }
          else if (val.includes('ghi chú')) { tempColMap.notes = cIdx; score++; }
        });
        if (score > maxScore && score > 2) {
          maxScore = score;
          headerRowIdx = i;
          colMap = tempColMap;
        }
      }

      if (headerRowIdx === -1) {
          headerRowIdx = 0;
      }

      const parseNumeric = (val: any, defaultVal: number): number => {
        if (typeof val === 'number') return val;
        if (!val) return defaultVal;
        const str = String(val).replace(',', '.');
        const match = str.match(/-?\d+(\.\d+)?/);
        if (match) {
          const num = parseFloat(match[0]);
          return isNaN(num) ? defaultVal : num;
        }
        return defaultVal;
      };

      const newItems: TaskCatalogItem[] = [];
      let currentTaskGroup = 'Nhiệm vụ chung';
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !Array.isArray(r) || r.length === 0) continue;
        
        const getCell = (idx) => String(r[idx] || '').trim();
        let stt = getCell(colMap.stt);
        let taskGroup = getCell(colMap.taskGroup);
        let detailTask = getCell(colMap.detailTask);
        let outputProduct = getCell(colMap.outputProduct);
        let categoryGroupStr = getCell(colMap.categoryGroup);
        let maxScoreStr = getCell(colMap.maxScore);
        let evaluatedScoreStr = getCell(colMap.evaluatedScore);
        let conversionFactorStr = getCell(colMap.conversionFactor);
        let notes = getCell(colMap.notes);

        // Skip completely empty rows
        if (!stt && !taskGroup && !detailTask && !outputProduct && !maxScoreStr && !evaluatedScoreStr && !conversionFactorStr && !notes) {
            continue;
        }

        // Check if this is a header or metadata row to skip
        const rowStr = r.map(c => String(c||'').trim().toLowerCase()).join(' ');
        if (rowStr.includes('công việc chi tiết') && rowStr.includes('hệ số quy đổi')) continue;
        if (rowStr.includes('lưu ý:') || rowStr.includes('trừ 25%')) continue;
        if (rowStr.startsWith('(1) (2) (3)')) continue;

        // If row has taskGroup but no detailTask and outputProduct, it might be a Group Header
        if (taskGroup && !detailTask && !outputProduct && !maxScoreStr && !evaluatedScoreStr) {
            currentTaskGroup = taskGroup;
            continue; // It's just a section header, no actual task to add
        }

        // If taskGroup is missing, inherit from currentTaskGroup
        if (!taskGroup) {
            taskGroup = currentTaskGroup;
        } else if (taskGroup && taskGroup !== currentTaskGroup) {
             // If a taskGroup is provided and it's different, update the current one (if it looks like a group)
             if (taskGroup.length > 3) {
                 currentTaskGroup = taskGroup;
             }
        }

        // If detailTask and outputProduct are both empty, but we have scores? Or maybe it's just a malformed row.
        // We will fallback to using taskGroup as the detailTask if it's the only thing available.
        if (!detailTask && !outputProduct) {
             if (taskGroup && (maxScoreStr || evaluatedScoreStr)) {
                 detailTask = taskGroup;
             } else {
                 continue; // Skip invalid rows
             }
        }

        const categoryGroup = parseNumeric(categoryGroupStr, 1);
        const maxScore = parseNumeric(maxScoreStr, 100);
        const evaluatedScore = parseNumeric(evaluatedScoreStr, 90);
        let conversionFactor = parseNumeric(conversionFactorStr, 1);
        
        if (conversionFactor > 500) {
            conversionFactor = 1;
        }

        newItems.push({
          id: 'cat_' + Date.now() + '_' + i,
          stt: stt || String(newItems.length + 1),
          taskGroup: taskGroup,
          detailTask: detailTask || outputProduct,
          outputProduct: outputProduct || detailTask,
          categoryGroup,
          maxScore,
          evaluatedScore,
          conversionFactor,
          notes
        });
      }

      if (newItems.length === 0) {
        throw new Error('Không tìm thấy dòng dữ liệu hợp lệ trong tệp Excel.');
      }

      setCatalogItems(newItems);
      localStorage.setItem('kpi_admin_task_catalog_v1', JSON.stringify(newItems));
      addToast('success', 'Tải Lên Danh Mục Chuẩn Thành Công!', `Đã nạp thành công ${newItems.length} mục công việc từ tệp Excel.`);
      setActiveTab('catalog');
    } catch (err: any) {
      addToast('error', 'Lỗi đọc file Excel danh mục', err.message || 'Không thể đọc tệp Excel.');
    }
  };

  // Filter catalog items
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchSearch = 
        item.detailTask.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.outputProduct.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.taskGroup.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchGroup = selectedGroup === 'ALL' || item.taskGroup === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [catalogItems, searchTerm, selectedGroup]);

  // When clicking "Phân Nhóm Danh Mục" from assignment tab
  const handleOpenLinkFromTask = (task: KpiTask) => {
    setActiveTargetTaskId(task.id);
    setIsModalOpen(true);
    addToast(
      'info',
      'Chọn Nhiệm Vụ Từ Danh Mục',
      `Đang chọn công việc của "${task.userName}". Hãy NHÁY ĐÚP (Double Click) vào dòng công việc chi tiết tương ứng trong bảng dưới để áp dụng!`
    );
  };

  // When user double clicks a catalog row
  const handleDoubleClickCatalogItem = (cat: TaskCatalogItem) => {
    if (!activeTargetTaskId) {
      // If no task targeted, create a new task with this catalog item
      const defaultUser = users[0]?.fullName || 'Nguyễn Thị Thúy Nhung';
      const defaultDept = users[0]?.department || DEPARTMENTS[1];
      onAddTask({
        userName: defaultUser,
        taskName: `${cat.detailTask} (${cat.outputProduct})`,
        jobType: 'Kế hoạch đơn vị',
        coopUnit: 'Phòng chuyên môn',
        assignedDate: new Date().toLocaleDateString('vi-VN'),
        planDeadline: '31/12/2026',
        actualDeadline: '',
        weight: cat.conversionFactor * 5,
        department: defaultDept,
        notes: `[Danh mục chuẩn] ${cat.taskGroup} | Khung điểm: ${cat.maxScore}, Điểm: ${cat.evaluatedScore}, Hệ số: ${cat.conversionFactor}`,
      });

      addToast(
        'success',
        'Đã Tạo Công Việc Từ Danh Mục Chuẩn!',
        `Đã gán sản phẩm "${cat.outputProduct}" (Hệ số: ${cat.conversionFactor}) cho cán bộ ${defaultUser}.`
      );
      setIsModalOpen(false);
      React.startTransition(() => setActiveTab('assignment'));
      return;
    }

    // If a target task was selected from the list, update it
    if (onUpdateTask) {
      const targetTask = tasks.find((t) => t.id === activeTargetTaskId);
      if (targetTask) {
        onUpdateTask(activeTargetTaskId, {
          taskName: `${cat.detailTask} (${cat.outputProduct})`,
          weight: cat.conversionFactor * 5,
          notes: `[Đã liên kết danh mục KPI chuẩn] ${cat.taskGroup} | Khung điểm: ${cat.maxScore}, Điểm: ${cat.evaluatedScore}, Hệ số: ${cat.conversionFactor}`,
        });

        addToast(
          'success',
          'Đã Áp Dụng Danh Mục Chuẩn Cho Công Việc!',
          `Đã cập nhật công việc của "${targetTask.userName}" thành "${cat.outputProduct}" (Hệ số quy đổi: ${cat.conversionFactor}, Điểm chấm: ${cat.evaluatedScore}).`
        );
      }
    }

    setActiveTargetTaskId(null);
    setIsModalOpen(false);
    React.startTransition(() => setActiveTab('assignment'));
  };

  const uniqueGroups = Array.from(new Set(catalogItems.map(c => c.taskGroup))).filter(Boolean);

  const renderCatalogContent = () => (
    <>
      <div className="space-y-4">
        {/* Top Toolbar Card matching screenshot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0 select-none">
            <FileSpreadsheet className="w-5 h-5 text-sky-700 dark:text-sky-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              DANH MỤC CÔNG VIỆC CHUẨN (HỆ SỐ & ĐIỂM)
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm danh mục công việc..."
                className="px-3 py-1.5 pr-8 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 w-48"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm nhiệm vụ</option>
              {uniqueGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Action buttons */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              title="Tải xuống file danh mục Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống</span>
            </button>

            {!isStaff && (
              <>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fd7e14] hover:bg-[#e36a09] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải lên</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleUploadCatalogExcel}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleClearCatalog}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dc3545] hover:bg-[#bb2d3b] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                  title="Xóa dữ liệu danh mục"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#2d6e3e] text-white font-bold text-xs tracking-wide">
                  <th className="px-3 py-3 w-12 text-center whitespace-nowrap border-r border-white/20">STT</th>
                  <th className="px-3 py-3 w-[22%] text-center border-r border-white/20">Nhiệm Vụ / Công Việc Trọng Tâm</th>
                  <th className="px-3 py-3 w-[30%] text-center border-r border-white/20">Chi Tiết Công Việc</th>
                  <th className="px-3 py-3 w-[20%] text-center border-r border-white/20">Sản Phẩm Đầu Ra</th>
                  <th className="px-3 py-3 w-[10%] text-center whitespace-nowrap border-r border-white/20">Nhóm</th>
                  <th className="px-3 py-3 w-24 text-center whitespace-nowrap border-r border-white/20">Khung Điểm</th>
                  <th className="px-3 py-3 w-24 text-center whitespace-nowrap border-r border-white/20">Điểm Chấm</th>
                  <th className="px-3 py-3 w-24 text-center whitespace-nowrap border-r border-white/20">Hệ Số</th>
                  <th className="px-3 py-3 w-32 text-center whitespace-nowrap">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-normal">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileSpreadsheet className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Chưa có dữ liệu danh mục chuẩn trong hệ thống.</p>
                        <p className="text-xs mt-1">Vui lòng bấm nút <strong className="text-emerald-700">"Tải lên"</strong> để nạp toàn bộ danh mục của bạn lên.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-300 dark:border-slate-700 cursor-pointer"
                      onDoubleClick={() => handleDoubleClickCatalogItem(item)}
                      title={activeTargetTaskId ? "NHÁY ĐÚP để chọn danh mục này!" : ""}
                    >
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                        {item.stt || (idx + 1)}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700">
                        {item.taskGroup}
                      </td>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                        {item.detailTask}
                      </td>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                        {item.outputProduct}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase whitespace-nowrap">
                          {item.categoryGroup || ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                        {item.maxScore}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                        {item.evaluatedScore}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                        {item.conversionFactor}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 text-[11px] text-center">
                        {item.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* TAB 1: GIAO GÁN & DANH SÁCH NHIỆM VỤ CÁN BỘ */}
      {activeTab === 'assignment' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                Danh Sách Công Việc Trong Đơn Vị:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-600">
                {tasks.length} nhiệm vụ
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Bấm nút <strong>"Phân Nhóm Danh Mục"</strong> trên dòng công việc để nhảy sang bảng tra cứu và chọn sản phẩm chuẩn.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#2d6e3e] text-white font-bold text-xs tracking-wide">
                    <th className="px-3 py-3 w-12 text-center whitespace-nowrap border-r border-white/20">STT</th>
                    <th className="px-4 py-3 w-[20%] text-center border-r border-white/20">NGƯỜI CHỦ TRÌ (CÁN BỘ)</th>
                    <th className="px-4 py-3 w-[30%] text-center border-r border-white/20">TÊN CÔNG VIỆC / BÁO CÁO</th>
                    <th className="px-4 py-3 w-[15%] text-center whitespace-nowrap border-r border-white/20">LOẠI CÔNG VIỆC</th>
                    <th className="px-4 py-3 w-[15%] text-center whitespace-nowrap border-r border-white/20">HẠN HOÀN THÀNH</th>
                    {!isStaff && <th className="px-4 py-3 w-[15%] text-center whitespace-nowrap">PHÂN NHÓM & LIÊN KẾT KPI</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-normal">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={isStaff ? 5 : 6} className="p-8 text-center text-slate-400">
                        Chưa có dữ liệu công việc trong đơn vị. Vui lòng thêm nhiệm vụ mới hoặc tải lên file Excel.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t, idx) => {
                      const isLinked = t.notes && t.notes.includes('[Đã liên kết danh mục KPI chuẩn]');
                      return (
                        <tr 
                          key={t.id} 
                          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-300 dark:border-slate-700"
                        >
                          <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-medium border-r border-slate-300 dark:border-slate-700">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700">
                            <div>{t.userName}</div>
                            <span className="text-[10px] text-slate-500 font-normal">{t.department}</span>
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 leading-relaxed">
                            {t.taskName}
                            {isLinked && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                  <Check className="w-3 h-3" /> Đã liên kết danh mục chuẩn
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                            {t.jobType || 'Kế hoạch'}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-900 dark:text-slate-100 font-bold border-r border-slate-300 dark:border-slate-700 text-xs">
                            {formatDate(t.planDeadline)}
                          </td>
                          {!isStaff && (
                            <td className="px-4 py-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleOpenLinkFromTask(t)}
                                className="px-3 py-1 bg-[#6610f2] hover:bg-[#5b0ed9] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                              >
                                Phân Nhóm Danh Mục
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
{/* TAB 2: TRA CỨU BẢNG DANH MỤC & HỆ SỐ CHUẨN */}
      {activeTab === 'catalog' && renderCatalogContent()}

      {/* MODAL FOR ASSIGNMENT VIEW */}
      {isModalOpen && activeTab === 'assignment' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chọn Danh Mục Chuẩn</h2>
              <p className="text-sm text-slate-500">Nháy đúp vào một dòng để áp dụng định mức chuẩn cho công việc đang chọn.</p>
            </div>
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setActiveTargetTaskId(null);
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {renderCatalogContent()}
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                  <div className="flex items-center gap-3 text-rose-600 mb-4">
                    <Trash className="w-8 h-8" />
                    <h3 className="text-xl font-bold">Xóa dữ liệu</h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Bạn có chắc chắn muốn xóa toàn bộ bảng tra cứu danh mục?
                  </p>
                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={confirmClearCatalog}
                      className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                    >
                      Xóa toàn bộ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};
