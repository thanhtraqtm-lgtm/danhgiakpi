import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart4, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Building2, 
  Trophy, 
  Award, 
  TrendingUp, 
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { WorkflowSubmission, User, KpiTask, EvaluationPeriodConfig, DEPARTMENTS } from '../types';
import { computeUserScorecardList, computeClassificationStats } from '../utils/evaluationClassification';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface EvaluationResultsProps {
  submissions: WorkflowSubmission[];
  users: User[];
  tasks: KpiTask[];
  periodConfig: EvaluationPeriodConfig;
  selectedDepartment?: string;
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({
  submissions,
  users,
  tasks,
  periodConfig,
  selectedDepartment = 'ALL'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>(selectedDepartment);
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
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
    // Navigate to workflow approval tab via event
    window.dispatchEvent(new CustomEvent('navigate-to-workflow', { detail: userId }));
  };

  // Compute evaluation scorecard for all users
  const scorecardList = useMemo(() => {
    return computeUserScorecardList(users, submissions, tasks, periodConfig);
  }, [users, submissions, tasks, periodConfig, refreshTrigger]);

  // Filtered scorecard
  const filteredScorecard = useMemo(() => {
    return scorecardList.filter(item => {
      // Dept
      if (deptFilter !== 'ALL' && item.user.department !== deptFilter) return false;
      // Rating
      if (ratingFilter !== 'ALL' && item.ratingKey !== ratingFilter) return false;
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
  }, [scorecardList, deptFilter, ratingFilter, searchTerm]);

  // Statistical calculations
  const stats = useMemo(() => {
    return computeClassificationStats(scorecardList);
  }, [scorecardList]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredScorecard.map((item, i) => ({
      'STT': i + 1,
      'Họ và Tên': item.user.fullName,
      'Phòng Ban / Đơn Vị': item.user.department,
      'Chức Vụ': item.user.position,
      'Kỳ Đánh Giá': item.period,
      'Điểm Tiêu chí chung (Thang 30)': item.generalScore30,
      'Điểm Kết quả thực hiện nhiệm vụ (Thang 70)': item.kpiScore70,
      'Tổng Điểm Đánh Giá (Thang 100)': item.totalScore100,
      'Điểm Lãnh Đạo Phê Duyệt': item.approvedScore !== null ? item.approvedScore : 'Chưa duyệt',
      'Xếp Loại Thi Đua': item.ratingLabel,
      'Trạng Thái Luồng': item.isApproved ? 'Đã phê duyệt hoàn tất' : 'Đang xử lý'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Danh_Gia_KPI');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Ket_Qua_Danh_Gia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="evaluation-results-container" className="space-y-5 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded-xl">
              <BarChart4 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Bảng Tổng Hợp Kết Quả & Xếp Loại Đánh Giá
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {periodConfig.periodName} • Thang điểm 100 (30 điểm Tiêu chí chung + 70 điểm Kết quả KPI nhiệm vụ)
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
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            In Báo Cáo
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Xuất File Excel Kết Quả
          </button>
        </div>
      </div>

      {/* Summary KPI Distribution Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Xuất sắc (&gt;= 90đ)</p>
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.excellent}</span>
            <span className="text-xs font-bold text-emerald-600">{stats.excellentPct}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">Hoàn thành tốt (70-89đ)</p>
            <Award className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400">{stats.good}</span>
            <span className="text-xs font-bold text-sky-600">{stats.goodPct}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Hoàn thành (50-69đ)</p>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.completed}</span>
            <span className="text-xs font-bold text-amber-600">Cán bộ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Điểm TB Toàn Đơn Vị</p>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{stats.avgScore}</span>
            <span className="text-xs font-semibold text-slate-400">Thang 100</span>
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên cán bộ..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Dept Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">Tất cả Phòng ban / Đơn vị</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">Tất cả Mức Xếp Loại</option>
              <option value="EXCELLENT">1. Hoàn thành xuất sắc nhiệm vụ</option>
              <option value="GOOD">2. Hoàn thành tốt nhiệm vụ</option>
              <option value="COMPLETED">3. Hoàn thành nhiệm vụ</option>
              <option value="PENDING">4. Chưa hoàn thành nhiệm vụ</option>
              <option value="FAILED">5. Không hoàn thành nhiệm vụ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
          <table className="w-full border-collapse text-sm font-sans">
            <thead>
              <tr className="bg-[#005ba1] text-white font-bold">
                <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                <th className="px-3 py-2.5 min-w-[180px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Họ và Tên</th>
                <th className="px-3 py-2.5 min-w-[150px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Phòng Ban</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Chức Vụ</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Tiêu Chí Chung (30đ)</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">KPI Nhiệm Vụ (70đ)</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Tổng Điểm Tự Chấm</th>
                <th className="px-3 py-2.5 min-w-[120px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Điểm Phê Duyệt</th>
                <th className="px-3 py-2.5 min-w-[160px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Xếp Loại Thi Đua</th>
                <th className="px-3 py-2.5 min-w-[120px] text-center border-b-2 border-[#004499]">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredScorecard.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Chưa có kết quả đánh giá phù hợp.
                  </td>
                </tr>
              ) : (
                filteredScorecard.map((item, idx) => (
                  <tr 
                    key={item.user.id} 
                    onClick={() => handleRowClick(item.user.id)}
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                  >
                    <td className="px-3 py-2 w-12 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                      {item.stt}
                    </td>

                    <td className="px-3 py-2 min-w-[180px] font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.fullName}
                      <div className="text-[10px] text-slate-400 font-normal">
                        user: {item.user.username}
                      </div>
                    </td>

                    <td className="px-3 py-2 min-w-[150px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.department || 'Chưa phân phòng'}
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.position || 'Chuyên viên'}
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-center text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 font-medium">
                      {item.generalScore30} đ
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-center text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 font-medium">
                      {item.kpiScore70} đ
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-center border-r border-slate-100 dark:border-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600 rounded-none">
                        {item.totalScore100} đ
                      </span>
                    </td>

                    <td className="px-3 py-2 min-w-[120px] text-center font-bold border-r border-slate-100 dark:border-slate-800">
                      {item.approvedScore !== null ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {item.approvedScore} đ
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs italic">Chờ duyệt</span>
                      )}
                    </td>

                    <td className="px-3 py-2 min-w-[160px] text-center border-r border-slate-100 dark:border-slate-800">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold ${item.ratingClass} rounded-none`}>
                        {item.ratingLabel}
                      </span>
                    </td>

                    <td className="px-3 py-2 min-w-[120px] text-center whitespace-nowrap">
                      {item.isApproved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã phê duyệt
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">
                          {item.submission ? 'Đang thẩm định' : 'Chưa nộp'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
