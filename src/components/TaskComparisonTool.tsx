import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  GitCompareArrows,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  X,
  Info,
  TrendingDown,
  CalendarDays,
  FileCheck2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/dateUtils';

interface TaskComparisonToolProps {
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

interface ParsedRow {
  [key: string]: any;
}

interface ComparisonResult {
  taskKey: string;
  taskName: string;
  userName: string;
  department: string;
  // File 1 (gốc / đối chiếu)
  planDeadline1: string;
  actualDeadline1: string;
  // File 2 (đã chỉnh)
  planDeadline2: string;
  actualDeadline2: string;
  // Lệch
  planDaysDiff: number | null; // số ngày lệch hạn kế hoạch (file2 - file1)
  actualDaysDiff: number | null; // số ngày lệch hạn thực tế
  onlyInFile1: boolean;
  onlyInFile2: boolean;
  matched: boolean;
}

// Chuẩn hóa key để ghép 2 file: taskName + userName
function makeTaskKey(taskName: string, userName: string): string {
  const normalize = (s: string) =>
    (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9à-ỹ\s]/gi, '');
  return `${normalize(taskName)}__${normalize(userName)}`;
}

// Parse ngày từ nhiều định dạng: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Excel serial
function parseDate(value: any): string {
  if (!value && value !== 0) return '';
  // Excel serial number
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  const str = String(value).trim();
  if (!str) return '';
  // Đã là YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // DD/MM/YYYY hoặc DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
  }
  return str; // trả nguyên để hiển thị
}

// Tính số ngày chênh lệch giữa 2 ngày (date2 - date1)
function daysBetween(date1Str: string, date2Str: string): number | null {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Tìm cột tương ứng từ header (hỗ trợ nhiều tên gọi)
function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map((h) => h.toString().trim().toLowerCase().normalize('NFC'));
  for (const cand of candidates) {
    const candNorm = cand.trim().toLowerCase().normalize('NFC');
    const found = headers.find((_, i) => {
      const h = normalized[i];
      return h === candNorm || h.includes(candNorm) || candNorm.includes(h);
    });
    if (found) return found;
  }
  return null;
}

async function parseExcelToRows(file: File): Promise<{ rows: ParsedRow[]; headers: string[] }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  if (!aoa || aoa.length === 0) throw new Error('File Excel rỗng!');

  // Tìm dòng tiêu đề
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const rowStr = aoa[i].join(' ').toLowerCase();
    if (
      rowStr.includes('công việc') ||
      rowStr.includes('nhiệm vụ') ||
      rowStr.includes('người') ||
      rowStr.includes('hạn') ||
      rowStr.includes('stt')
    ) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = aoa[headerRowIdx] || [];
  const headers = rawHeaders.map((h: any) => String(h).trim()).filter(Boolean);

  const rows: ParsedRow[] = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row.some((val: any) => val !== '')) continue;
    const rowData: ParsedRow = {};
    headers.forEach((h, colIdx) => {
      rowData[h] = row[colIdx];
    });
    rows.push(rowData);
  }
  return { rows, headers };
}

export const TaskComparisonTool: React.FC<TaskComparisonToolProps> = ({ addToast }) => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file1Name, setFile1Name] = useState('');
  const [file2Name, setFile2Name] = useState('');
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [hasCompared, setHasCompared] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DIFF' | 'LATE' | 'EARLY' | 'ONLY1' | 'ONLY2'>('DIFF');

  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, which: 1 | 2) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (which === 1) {
      setFile1(f);
      setFile1Name(f.name);
    } else {
      setFile2(f);
      setFile2Name(f.name);
    }
    // Reset kết quả cũ khi đổi file
    setResults([]);
    setHasCompared(false);
  };

  const clearFile = (which: 1 | 2) => {
    if (which === 1) {
      setFile1(null);
      setFile1Name('');
      if (file1Ref.current) file1Ref.current.value = '';
    } else {
      setFile2(null);
      setFile2Name('');
      if (file2Ref.current) file2Ref.current.value = '';
    }
    setResults([]);
    setHasCompared(false);
  };

  const handleCompare = async () => {
    if (!file1 || !file2) {
      addToast('warning', 'Thiếu file!', 'Vui lòng tải lên cả 2 file danh sách công việc để so sánh.');
      return;
    }
    setParsing(true);
    try {
      const [parsed1, parsed2] = await Promise.all([
        parseExcelToRows(file1),
        parseExcelToRows(file2),
      ]);

      const headers1 = parsed1.headers;
      const headers2 = parsed2.headers;

      // Tìm cột
      const taskNameCol1 = findColumn(headers1, ['Tên công việc', 'Nhiệm vụ', 'Công việc', 'Tên nhiệm vụ']);
      const userNameCol1 = findColumn(headers1, ['Người chủ trì', 'Người/ đơn vị chủ trì', 'Họ và tên', 'Người thực hiện', 'Cán bộ']);
      const planCol1 = findColumn(headers1, ['Hạn hoàn thành', 'Hạn kế hoạch', 'Hạn báo cáo', 'Deadline', 'Hạn nộp']);
      const actualCol1 = findColumn(headers1, ['Hạn thực tế', 'Ngày hoàn thành thực tế', 'Ngày nộp thực tế', 'Thực tế', 'Ngày hoàn thành']);
      const deptCol1 = findColumn(headers1, ['Phòng ban', 'Đơn vị', 'Phòng/Đơn vị']);

      const taskNameCol2 = findColumn(headers2, ['Tên công việc', 'Nhiệm vụ', 'Công việc', 'Tên nhiệm vụ']);
      const userNameCol2 = findColumn(headers2, ['Người chủ trì', 'Người/ đơn vị chủ trì', 'Họ và tên', 'Người thực hiện', 'Cán bộ']);
      const planCol2 = findColumn(headers2, ['Hạn hoàn thành', 'Hạn kế hoạch', 'Hạn báo cáo', 'Deadline', 'Hạn nộp']);
      const actualCol2 = findColumn(headers2, ['Hạn thực tế', 'Ngày hoàn thành thực tế', 'Ngày nộp thực tế', 'Thực tế', 'Ngày hoàn thành']);
      const deptCol2 = findColumn(headers2, ['Phòng ban', 'Đơn vị', 'Phòng/Đơn vị']);

      if (!taskNameCol1 || !taskNameCol2) {
        addToast('error', 'Không nhận diện được cột công việc!', 'File phải có cột "Tên công việc" hoặc "Nhiệm vụ".');
        setParsing(false);
        return;
      }

      // Map file 1
      const map1 = new Map<string, ParsedRow>();
      parsed1.rows.forEach((r) => {
        const tn = r[taskNameCol1] || '';
        const un = userNameCol1 ? r[userNameCol1] || '' : '';
        if (!tn) return;
        map1.set(makeTaskKey(tn, un), r);
      });
      // Map file 2
      const map2 = new Map<string, ParsedRow>();
      parsed2.rows.forEach((r) => {
        const tn = r[taskNameCol2] || '';
        const un = userNameCol2 ? r[userNameCol2] || '' : '';
        if (!tn) return;
        map2.set(makeTaskKey(tn, un), r);
      });

      const allKeys = new Set([...map1.keys(), ...map2.keys()]);
      const compResults: ComparisonResult[] = [];

      allKeys.forEach((key) => {
        const r1 = map1.get(key);
        const r2 = map2.get(key);
        const taskName = (r1?.[taskNameCol1] || r2?.[taskNameCol2] || '').toString();
        const userName = (userNameCol1 && r1?.[userNameCol1]) || (userNameCol2 && r2?.[userNameCol2]) || '';
        const dept = (deptCol1 && r1?.[deptCol1]) || (deptCol2 && r2?.[deptCol2]) || '';

        const plan1 = planCol1 ? parseDate(r1?.[planCol1]) : '';
        const plan2 = planCol2 ? parseDate(r2?.[planCol2]) : '';
        const actual1 = actualCol1 ? parseDate(r1?.[actualCol1]) : '';
        const actual2 = actualCol2 ? parseDate(r2?.[actualCol2]) : '';

        const planDaysDiff = plan1 && plan2 ? daysBetween(plan1, plan2) : null;
        const actualDaysDiff = actual1 && actual2 ? daysBetween(actual1, actual2) : null;

        compResults.push({
          taskKey: key,
          taskName,
          userName: userName.toString(),
          department: dept.toString(),
          planDeadline1: plan1,
          actualDeadline1: actual1,
          planDeadline2: plan2,
          actualDeadline2: actual2,
          planDaysDiff,
          actualDaysDiff,
          onlyInFile1: !!r1 && !r2,
          onlyInFile2: !r1 && !!r2,
          matched: !!r1 && !!r2,
        });
      });

      // Sắp xếp: lệch nhiều nhất lên đầu
      compResults.sort((a, b) => {
        const maxA = Math.max(Math.abs(a.actualDaysDiff ?? 0), Math.abs(a.planDaysDiff ?? 0));
        const maxB = Math.max(Math.abs(b.actualDaysDiff ?? 0), Math.abs(b.planDaysDiff ?? 0));
        return maxB - maxA;
      });

      setResults(compResults);
      setHasCompared(true);
      const diffCount = compResults.filter((r) => (r.actualDaysDiff !== null && r.actualDaysDiff !== 0) || (r.planDaysDiff !== null && r.planDaysDiff !== 0)).length;
      const onlyCount = compResults.filter((r) => r.onlyInFile1 || r.onlyInFile2).length;
      addToast(
        'success',
        'So sánh hoàn tất!',
        `Đã so sánh ${compResults.length} công việc. Phát hiện ${diffCount} công việc lệch ngày, ${onlyCount} công việc chỉ có ở 1 file.`
      );
    } catch (err: any) {
      addToast('error', 'Lỗi so sánh file', err.message || 'Không thể parse file Excel.');
    } finally {
      setParsing(false);
    }
  };

  const handleExportReport = () => {
    if (results.length === 0) return;
    const data = results.map((r, idx) => ({
      STT: idx + 1,
      'Tên công việc': r.taskName,
      'Người chủ trì': r.userName,
      'Phòng ban': r.department,
      'Hạn KH (File 1)': r.planDeadline1 || '—',
      'Hạn KH (File 2)': r.planDeadline2 || '—',
      'Lệch hạn KH (ngày)': r.planDaysDiff ?? '—',
      'Hạn TT (File 1)': r.actualDeadline1 || '—',
      'Hạn TT (File 2)': r.actualDeadline2 || '—',
      'Lệch hạn TT (ngày)': r.actualDaysDiff ?? '—',
      'Ghi chú': r.onlyInFile1 ? 'Chỉ có ở File 1' : r.onlyInFile2 ? 'Chỉ có ở File 2' : r.actualDaysDiff !== null && r.actualDaysDiff > 0 ? `Chậm ${r.actualDaysDiff} ngày` : r.actualDaysDiff !== null && r.actualDaysDiff < 0 ? `Sớm ${Math.abs(r.actualDaysDiff)} ngày` : 'Khớp',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'So_Sanh_Lech_Ngay');
    XLSX.writeFile(wb, `BaoCao_SoSanh_LechNgay_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Đã xuất báo cáo!', 'File Excel báo cáo lệch ngày đã tải xuống.');
  };

  // Thống kê
  const stats = useMemo(() => {
    if (!hasCompared) return null;
    const matched = results.filter((r) => r.matched).length;
    const planDiff = results.filter((r) => r.planDaysDiff !== null && r.planDaysDiff !== 0).length;
    const actualLate = results.filter((r) => r.actualDaysDiff !== null && r.actualDaysDiff > 0).length;
    const actualEarly = results.filter((r) => r.actualDaysDiff !== null && r.actualDaysDiff < 0).length;
    const onlyIn1 = results.filter((r) => r.onlyInFile1).length;
    const onlyIn2 = results.filter((r) => r.onlyInFile2).length;
    const maxLate = results.reduce((max, r) => {
      const late = Math.max(r.actualDaysDiff ?? 0, r.planDaysDiff ?? 0);
      return late > max ? late : max;
    }, 0);
    return { total: results.length, matched, planDiff, actualLate, actualEarly, onlyIn1, onlyIn2, maxLate };
  }, [results, hasCompared]);

  // Lọc kết quả
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim() && filterMode === 'ALL') return results;
    let filtered = results;
    if (filterMode === 'DIFF') {
      filtered = filtered.filter((r) => (r.actualDaysDiff !== null && r.actualDaysDiff !== 0) || (r.planDaysDiff !== null && r.planDaysDiff !== 0) || r.onlyInFile1 || r.onlyInFile2);
    } else if (filterMode === 'LATE') {
      filtered = filtered.filter((r) => (r.actualDaysDiff !== null && r.actualDaysDiff > 0) || (r.planDaysDiff !== null && r.planDaysDiff > 0));
    } else if (filterMode === 'EARLY') {
      filtered = filtered.filter((r) => (r.actualDaysDiff !== null && r.actualDaysDiff < 0) || (r.planDaysDiff !== null && r.planDaysDiff < 0));
    } else if (filterMode === 'ONLY1') {
      filtered = filtered.filter((r) => r.onlyInFile1);
    } else if (filterMode === 'ONLY2') {
      filtered = filtered.filter((r) => r.onlyInFile2);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r) => r.taskName.toLowerCase().includes(term) || r.userName.toLowerCase().includes(term) || r.department.toLowerCase().includes(term));
    }
    return filtered;
  }, [results, searchTerm, filterMode]);

  const fmtDate = (d: string) => {
    if (!d) return '—';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return formatDate(d) || d;
  };

  const diffBadge = (diff: number | null) => {
    if (diff === null) return <span className="text-slate-400 text-[11px]">—</span>;
    if (diff === 0) return <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-bold">Khớp</span>;
    if (diff > 0) return <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded text-[11px] font-bold flex items-center gap-0.5"><TrendingDown className="w-3 h-3 rotate-90" /> +{diff} ngày (chậm)</span>;
    return <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold">{diff} ngày (sớm)</span>;
  };

  return (
    <div className="space-y-5 animate-in fade-in-50">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-rose-600" />
              So Sánh 2 File Danh Sách Công Việc — Phát Hiện Lệch Ngày Hoàn Thành
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tải file gốc và file đã chỉnh ngày → so sánh tự động → báo cáo chậm/sớm mấy ngày. Dùng để kiểm tra khi phần mềm quản lý công việc được phép chỉnh ngày hoàn thành.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold mb-1">Cách sử dụng:</p>
          <p className="text-xs leading-relaxed">
            <b>File 1</b> (file đối chiếu / bản sao lưu cũ): danh sách công việc với ngày hoàn thành ban đầu.
            <b> File 2</b> (file hiện tại): danh sách công việc có thể đã bị chỉnh ngày. Hệ thống sẽ ghép 2 file theo <b>tên công việc + người chủ trì</b>,
            so sánh cột <b>"Hạn hoàn thành"</b> và <b>"Hạn thực tế"</b>, tính số ngày lệch (dương = chậm, âm = sớm).
          </p>
        </div>
      </div>

      {/* Upload 2 Files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-sky-600" />
              File 1 — Gốc / Đối chiếu
            </h3>
            {file1Name && (
              <button onClick={() => clearFile(1)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={file1Ref}
            onChange={(e) => handleFileSelect(e, 1)}
            className="hidden"
          />
          <button
            onClick={() => file1Ref.current?.click()}
            className={`w-full p-6 rounded-xl border-2 border-dashed transition-all flex flex-col items-center gap-2 ${
              file1
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-900/10'
            }`}
          >
            <Upload className="w-7 h-7 text-sky-600" />
            {file1Name ? (
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                {file1Name}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Bấm để chọn file Excel (.xlsx, .xls, .csv)</span>
            )}
          </button>
        </div>

        {/* File 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-rose-600" />
              File 2 — Đã chỉnh / Hiện tại
            </h3>
            {file2Name && (
              <button onClick={() => clearFile(2)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={file2Ref}
            onChange={(e) => handleFileSelect(e, 2)}
            className="hidden"
          />
          <button
            onClick={() => file2Ref.current?.click()}
            className={`w-full p-6 rounded-xl border-2 border-dashed transition-all flex flex-col items-center gap-2 ${
              file2
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10'
            }`}
          >
            <Upload className="w-7 h-7 text-rose-600" />
            {file2Name ? (
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                {file2Name}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Bấm để chọn file Excel (.xlsx, .xls, .csv)</span>
            )}
          </button>
        </div>
      </div>

      {/* Compare Button */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleCompare}
          disabled={!file1 || !file2 || parsing}
          className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm transition-all"
        >
          <GitCompareArrows className="w-5 h-5" />
          {parsing ? 'Đang so sánh...' : 'So Sánh 2 File'}
        </button>
        {hasCompared && results.length > 0 && (
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-5 h-5" />
            Xuất Báo Cáo Excel
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Tổng cộng</p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Khớp</p>
            <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{stats.matched}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Lệch hạn KH</p>
            <p className="text-lg font-extrabold text-amber-600 mt-0.5">{stats.planDiff}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-rose-500 uppercase">Chậm hoàn thành</p>
            <p className="text-lg font-extrabold text-rose-600 mt-0.5">{stats.actualLate}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Sớm hoàn thành</p>
            <p className="text-lg font-extrabold text-blue-600 mt-0.5">{stats.actualEarly}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Chỉ File 1</p>
            <p className="text-lg font-extrabold text-slate-600 mt-0.5">{stats.onlyIn1}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Chỉ File 2</p>
            <p className="text-lg font-extrabold text-slate-600 mt-0.5">{stats.onlyIn2}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {hasCompared && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên công việc, người chủ trì, phòng ban..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: 'DIFF', label: 'Có lệch' },
                { key: 'LATE', label: 'Chậm' },
                { key: 'EARLY', label: 'Sớm' },
                { key: 'ONLY1', label: 'Chỉ File 1' },
                { key: 'ONLY2', label: 'Chỉ File 2' },
                { key: 'ALL', label: 'Tất cả' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filterMode === f.key
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">STT</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[200px]">Tên công việc</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Người chủ trì</th>
                  <th className="px-3 py-2.5 font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap text-center">Hạn KH<br/>File 1</th>
                  <th className="px-3 py-2.5 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap text-center">Hạn KH<br/>File 2</th>
                  <th className="px-3 py-2.5 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap text-center">Lệch<br/>Hạn KH</th>
                  <th className="px-3 py-2.5 font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap text-center">Hạn TT<br/>File 1</th>
                  <th className="px-3 py-2.5 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap text-center">Hạn TT<br/>File 2</th>
                  <th className="px-3 py-2.5 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap text-center">Lệch<br/>Hạn TT</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Không có công việc nào khớp bộ lọc này.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, idx) => (
                    <tr key={r.taskKey} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${r.onlyInFile1 ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''} ${r.onlyInFile2 ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                      <td className="px-3 py-2 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                        {r.taskName}
                        {r.onlyInFile1 && <span className="ml-1 text-[10px] text-sky-600">⚠ Chỉ File 1</span>}
                        {r.onlyInFile2 && <span className="ml-1 text-[10px] text-rose-600">⚠ Chỉ File 2</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.userName || '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1"><CalendarDays className="w-3 h-3 text-sky-400" />{fmtDate(r.planDeadline1)}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1"><CalendarDays className="w-3 h-3 text-rose-400" />{fmtDate(r.planDeadline2)}</span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{diffBadge(r.planDaysDiff)}</td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-sky-400" />{fmtDate(r.actualDeadline1)}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-rose-400" />{fmtDate(r.actualDeadline2)}</span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{diffBadge(r.actualDaysDiff)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.onlyInFile1 ? (
                          <span className="text-sky-600 font-bold text-[11px]">Chỉ File 1</span>
                        ) : r.onlyInFile2 ? (
                          <span className="text-rose-600 font-bold text-[11px]">Chỉ File 2</span>
                        ) : r.actualDaysDiff !== null && r.actualDaysDiff > 0 ? (
                          <span className="text-rose-600 font-bold text-[11px]">Chậm {r.actualDaysDiff} ngày</span>
                        ) : r.actualDaysDiff !== null && r.actualDaysDiff < 0 ? (
                          <span className="text-blue-600 font-bold text-[11px]">Sớm {Math.abs(r.actualDaysDiff)} ngày</span>
                        ) : r.planDaysDiff !== null && r.planDaysDiff !== 0 ? (
                          <span className="text-amber-600 font-bold text-[11px]">Lệch hạn KH</span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Khớp</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredResults.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Hiển thị <b>{filteredResults.length}</b> / {results.length} công việc. {stats && stats.maxLate > 0 && (
                <span className="text-rose-600 font-bold">Lệch nhiều nhất: {stats.maxLate} ngày.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
