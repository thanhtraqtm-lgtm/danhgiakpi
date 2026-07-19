import { useRef, useState } from 'react';
import { Employee, getGeneralCriteriaScores, formatTimelineDisplay } from '../types';
import { getConvertedFactor, getConvertedTargetQty, getConvertedActualQty, calculateKPIResultSummary } from '../initialData';
import { Printer, ArrowLeft, Stamp, Calendar, Award, Shield, CheckCircle, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ScorecardExportProps {
  employee: Employee;
  onBack: () => void;
  isQuarterLocked?: boolean;
}

export default function ScorecardExport({ employee, onBack, isQuarterLocked = false }: ScorecardExportProps) {
  const [printMode, setPrintMode] = useState<'image-based' | 'full-kpi'>('image-based');
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  const summary = calculateKPIResultSummary(employee.tasks);
  
  const scores = getGeneralCriteriaScores(employee);
  const totalCriteriaScore = scores.diemI1 + scores.diemI2 + scores.diemII1 + scores.diemII2 + scores.diemII3 + scores.diemII4 + scores.diemIII1 + scores.diemIII2 + scores.diemIII3 + scores.diemIII4;

  // Helper definitions for hierarchical levels
  const employeeIsDeptHead = employee.role.includes('Trưởng') || employee.role.includes('Phó Trưởng') || employee.role.includes('Bí thư');
  
  const getDeptHeadName = () => {
    if (employee.department === 'Ban Tổ chức Đảng ủy') return 'Đ/c Nguyễn Văn Hải';
    if (employee.department === 'Văn phòng Tổng hợp') return 'Đ/c Trần Thị Kim Anh';
    return 'Trưởng phòng ban';
  };

  const getLeaderName = () => {
    return employee.orgType === 'Đơn vị cơ sở' ? 'Đ/c Phạm Minh Tuấn' : 'Đ/c Nguyễn Văn Hải';
  };
  
  // Categorize general civil service grading
  let gradingBand = 'Hoàn thành tốt nhiệm vụ';
  let gradingDesc = 'Hoàn thành tốt tất cả các chỉ tiêu kế hoạch và sản phẩm công việc quy đổi đúng hạn.';
  let badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';

  if (summary.overallTaskPerformanceScore >= 99.5) {
    gradingBand = 'Hoàn thành xuất sắc nhiệm vụ';
    gradingDesc = 'Vượt trội toàn diện trong các hoạt động nghiệp vụ chỉ đạo, đóng góp xuất sắc cho phong trào thi đua cơ quan.';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (summary.overallTaskPerformanceScore >= 90) {
    gradingBand = 'Hoàn thành tốt nhiệm vụ';
    gradingDesc = 'Đạt và vượt chỉ tiêu hầu hết các đầu mục công tác chuyên môn, đúng chuẩn chất lượng.';
    badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
  } else if (summary.overallTaskPerformanceScore >= 80) {
    gradingBand = 'Hoàn thành nhiệm vụ';
    gradingDesc = 'Cơ bản hoàn thành các chỉ tiêu sản phẩm quy đổi, một số tiến độ cần khắc phục.';
    badgeColor = 'bg-slate-50 text-slate-800 border-slate-200';
  } else {
    gradingBand = 'Không hoàn thành nhiệm vụ';
    gradingDesc = 'Tỷ lệ hoàn thành công việc thấp hoặc trễ hạn nhiều đầu việc. Cần lập kế hoạch hỗ trợ tăng tốc.';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  const handlePrint = () => {
    window.print();
  };

  const downloadScorecardExcel = () => {
    const wb = XLSX.utils.book_new();
    let wsData: any[] = [];
    let fileName = `Bang_KPI_${employee.name.replace(/\s+/g, '_')}.xlsx`;

    if (printMode === 'image-based') {
      // 10-column layout (Mẫu Ảnh)
      const headers = [
        'STT',
        'Nhiệm vụ',
        'Cấp trình',
        'Sản phẩm',
        'Số lượng',
        'Tiến độ',
        'Ghi chú',
        'Điểm tối đa',
        'Điểm chấm công việc',
        'Hệ số quy đổi'
      ];
      
      wsData.push(headers);
      
      employee.tasks.forEach((task, idx) => {
        const factor = task.assignedScore / 5;
        wsData.push([
          idx + 1,
          task.mission,
          task.reportingLevel,
          task.productName,
          task.targetQuantity,
          task.timeline,
          task.note || '',
          task.maxScore || 100,
          task.assignedScore,
          factor
        ]);
      });

      // Add a Totals Row
      const totalQty = employee.tasks.reduce((sum, t) => sum + t.targetQuantity, 0);
      const totalMax = employee.tasks.reduce((sum, t) => sum + (t.maxScore || 100), 0);
      const totalAssigned = employee.tasks.reduce((sum, t) => sum + t.assignedScore, 0);
      const totalFactor = employee.tasks.reduce((sum, t) => sum + (t.assignedScore / 5), 0);
      
      wsData.push([
        'Tổng',
        'TỔNG CỘNG',
        '',
        '',
        totalQty,
        '',
        '',
        totalMax,
        totalAssigned,
        totalFactor
      ]);
    } else {
      // 13-column full KPI layout
      const headers = [
        'STT',
        'Nhiệm vụ',
        'Cấp trình',
        'Sản phẩm',
        'Tiến độ',
        'Mục tiêu Qty',
        'Điểm chấm CV',
        'Hệ số QĐ',
        'Quy đổi MT',
        'Thực tế Qty',
        'Quy đổi Qty',
        'Thực tế Chất lượng',
        'Quy đổi Chất lượng',
        'Thực tế Tiến độ',
        'Quy đổi Tiến độ'
      ];
      wsData.push(headers);

      employee.tasks.forEach((task, idx) => {
        const factor = task.assignedScore / 5;
        const targetConverted = task.targetQuantity * factor;
        const qtyConverted = Math.min(task.actualQtyCount, task.targetQuantity) * factor;
        const qualConverted = Math.min(task.actualQualityCount, task.targetQuantity) * factor;
        const progConverted = Math.min(task.actualProgressCount, task.targetQuantity) * factor;

        wsData.push([
          idx + 1,
          task.mission,
          task.reportingLevel,
          task.productName,
          task.timeline,
          task.targetQuantity,
          task.assignedScore,
          factor,
          targetConverted,
          task.actualQtyCount,
          qtyConverted,
          task.actualQualityCount,
          qualConverted,
          task.actualProgressCount,
          progConverted
        ]);
      });

      // Add Totals Row for full KPI
      wsData.push([
        'Tổng',
        'TỔNG CỘNG',
        '',
        '',
        '',
        summary.totalTargetQty,
        '',
        '',
        summary.totalTargetConverted,
        summary.totalQtyActual,
        summary.totalQtyConverted,
        summary.totalQualityActual,
        summary.totalQualityConverted,
        summary.totalProgressActual,
        summary.totalProgressConverted
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set auto widths or custom widths
    if (printMode === 'image-based') {
      ws['!cols'] = [
        { wch: 6 },   // STT
        { wch: 45 },  // Nhiệm vụ
        { wch: 18 },  // Cấp trình
        { wch: 18 },  // Sản phẩm
        { wch: 10 },  // Số lượng
        { wch: 18 },  // Tiến độ
        { wch: 20 },  // Ghi chú
        { wch: 12 },  // Điểm tối đa
        { wch: 15 },  // Điểm chấm công việc
        { wch: 15 }   // Hệ số quy đổi
      ];
    } else {
      ws['!cols'] = [
        { wch: 6 },   // STT
        { wch: 45 },  // Nhiệm vụ
        { wch: 18 },  // Cấp trình
        { wch: 18 },  // Sản phẩm
        { wch: 18 },  // Tiến độ
        { wch: 12 },  // Mục tiêu Qty
        { wch: 12 },  // Điểm chấm CV
        { wch: 10 },  // Hệ số QĐ
        { wch: 12 },  // Quy đổi MT
        { wch: 12 },  // Thực tế Qty
        { wch: 12 },  // Quy đổi Qty
        { wch: 12 },  // Thực tế CL
        { wch: 12 },  // Quy đổi CL
        { wch: 12 },  // Thực tế TĐ
        { wch: 12 }   // Quy đổi TĐ
      ];
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Bang_Diem_KPI');
    XLSX.writeFile(wb, fileName);
  };

  // Formats a deadlineDate ('YYYY-MM-DD') into 'DD/MM/YYYY' for display in Excel.
  const formatDeadlineForExcel = (deadlineDate?: string): string => {
    if (!deadlineDate) return '';
    const parts = deadlineDate.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  // Full official 3-sheet export: CONG VIEC / TINH DIEM / KET QUA — matches the
  // structure of the original paper template exactly (Phụ lục 2).
  // "Hạn hoàn thành" is kept in sheet CONG VIEC as an extra column (11th) but
  // hidden by default so printed/opened view looks identical to the 10-column mẫu gốc.
  const downloadFullReportExcel = () => {
    import('../lib/excelExport').then(module => {
      module.downloadFullReportExcel(employee);
    });
  };

  return (
    <div id="scorecard-export-view" className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đánh giá
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 mr-2 font-medium">
            Mẹo: Chọn máy in "Lưu dưới dạng PDF" để xuất file báo cáo mẫu chuẩn Nhà nước
          </span>
          <button
            onClick={downloadScorecardExcel}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg cursor-pointer shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Tải Excel KPI
          </button>
          <button
            onClick={downloadFullReportExcel}
            title="Xuất đủ 3 sheet: Công việc - Tính điểm - Kết quả, đúng như biểu mẫu gốc"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 px-4 py-2 rounded-lg cursor-pointer shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            Xuất Excel 3 Sheet (Mẫu gốc)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            In Báo Cáo / Xuất PDF
          </button>
        </div>
      </div>

      {/* Print Mode Selector Bar (Hidden when printing) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-md mx-auto print:hidden gap-1 justify-center shadow-3xs">
        <button
          type="button"
          onClick={() => setPrintMode('image-based')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            printMode === 'image-based'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Mẫu Ảnh (10 cột)
        </button>
        <button
          type="button"
          onClick={() => setPrintMode('full-kpi')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            printMode === 'full-kpi'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Bản In KPI (15 cột)
        </button>
      </div>

      {/* Official Vietnamese State-Style Scorecard Paper Container */}
      <div 
        ref={printAreaRef}
        className="bg-white p-8 md:p-12 rounded-2xl shadow-xs border border-slate-200 mx-auto space-y-8 print:border-0 print:p-0 print:shadow-none"
      >
        {/* State Report Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6 border-slate-200 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase text-slate-800 tracking-wide">ĐẢNG ỦY BỘ TÀI CHÍNH</p>
            <p className="text-xs font-semibold uppercase text-indigo-700">CHI BỘ BAN TỔ CHỨC</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Số: 142/BC-CB-2026</p>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p className="text-xs font-bold uppercase text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-xs font-semibold text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
            <div className="w-32 h-0.5 bg-slate-400 mx-auto md:ml-auto"></div>
            <p className="text-[10px] text-slate-400 italic">Hà Nội, ngày 30 tháng 06 năm 2026</p>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-extrabold uppercase text-slate-900 tracking-wide leading-relaxed">
            BẢN TỰ CHẤM ĐIỂM ĐÁNH GIÁ, XẾP LOẠI CHẤT LƯỢNG CÁN BỘ, CÔNG CHỨC, VIÊN CHỨC HẰNG THÁNG
          </h2>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
            (Kèm theo Quy chế đánh giá, xếp loại chất lượng hằng tháng đối với đơn vị và cá nhân)
          </p>
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 mt-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Kỳ Đánh Giá: Quý II / Năm 2026 (Từ ngày 01/04/2026 đến 30/06/2026)
          </p>
        </div>

        {/* Cán Bộ Profile Details */}
        <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <p className="text-slate-500">
              Họ và tên cán bộ/Đảng viên: <strong className="text-slate-800 text-sm">{employee.name}</strong>
            </p>
            <p className="text-slate-500">
              Chức vụ chuyên môn: <strong className="text-slate-800">{employee.role}</strong>
            </p>
            <p className="text-slate-500">
              Đơn vị công tác: <strong className="text-slate-800">{employee.department}</strong>
            </p>
          </div>
          <div className="space-y-2 md:text-right">
            <p className="text-slate-500 md:justify-end flex items-center gap-1.5">
              Tỷ lệ hoàn thành nhiệm vụ chung: <strong className="text-indigo-600 font-mono text-sm">{summary.overallTaskPerformanceScore.toFixed(2)}%</strong>
            </p>
            <div className="md:justify-end flex items-center gap-1.5">
              <span>Đánh giá phân loại:</span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${badgeColor}`}>
                {gradingBand}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              {gradingDesc}
            </p>
          </div>
        </div>

        {/* Form Table Layout matching PDF structure */}
        {printMode === 'image-based' ? (
          /* 10-COLUMN STANDARD REPORT TABLE (IMAGE PATTERN) */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                BÁO CÁO SẢN PHẨM/CÔNG VIỆC VÀ CHẤM ĐIỂM KPI
              </h3>
              <span className="text-[10px] text-slate-400 italic">Công thức quy đổi hệ số: Hệ số = Điểm chấm công việc / 5</span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center uppercase tracking-wide text-[9px]">
                    <th className="p-2.5 border border-slate-300 w-10">TT</th>
                    <th className="p-2.5 border border-slate-300 text-left min-w-[260px]">Nhiệm vụ</th>
                    <th className="p-2.5 border border-slate-300 text-left w-32">Cấp trình</th>
                    <th className="p-2.5 border border-slate-300 text-left w-32">Sản phẩm</th>
                    <th className="p-2.5 border border-slate-300 w-16">Số lượng</th>
                    <th className="p-2.5 border border-slate-300 w-24">Tiến độ</th>
                    <th className="p-2.5 border border-slate-300 text-left w-28">Ghi chú</th>
                    <th className="p-2.5 border border-slate-300 w-16">Điểm tối đa</th>
                    <th className="p-2.5 border border-slate-300 w-20">Điểm chấm công việc</th>
                    <th className="p-2.5 border border-slate-300 w-16 bg-indigo-50/20 text-indigo-900">Hệ số quy đổi</th>
                  </tr>
                  <tr className="bg-slate-50 text-[9px] text-slate-400 font-bold border-b border-slate-300 text-center">
                    <td className="p-1 border border-slate-300">(1)</td>
                    <td className="p-1 border border-slate-300 text-left">(2)</td>
                    <td className="p-1 border border-slate-300 text-left">(3)</td>
                    <td className="p-1 border border-slate-300 text-left">(4)</td>
                    <td className="p-1 border border-slate-300">(5)</td>
                    <td className="p-1 border border-slate-300">(6)</td>
                    <td className="p-1 border border-slate-300 text-left">(7)</td>
                    <td className="p-1 border border-slate-300">(8)</td>
                    <td className="p-1 border border-slate-300">(9)</td>
                    <td className="p-1 border border-slate-300 bg-indigo-50/10 text-indigo-700">(10) = (9)/5</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employee.tasks.map((task, index) => {
                    const factor = task.assignedScore / 5;
                    return (
                      <tr key={task.id} className="hover:bg-slate-50/40 text-[11px] transition-colors">
                        <td className="p-2 text-center border border-slate-300 font-mono text-slate-400 font-bold">
                          {index + 1}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800 font-semibold leading-relaxed">
                          {task.mission}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-600 font-medium">
                          {task.reportingLevel}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-700 font-bold">
                          {task.productName}
                        </td>
                        <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">
                          {task.targetQuantity}
                        </td>
                        <td className="p-2 text-center border border-slate-300 text-slate-600 font-medium">
                          {formatTimelineDisplay(task.timeline)}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-500 italic">
                          {task.note || '-'}
                        </td>
                        <td className="p-2 text-center border border-slate-300 font-mono text-slate-600">
                          {task.maxScore || 100}
                        </td>
                        <td className="p-2 text-center border border-slate-300 font-mono font-black text-slate-900">
                          {task.assignedScore}
                        </td>
                        <td className="p-2 text-center border border-slate-300 font-mono font-black text-indigo-600 bg-indigo-50/10">
                          {factor.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}

                  {employee.tasks.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                        Chưa có dữ liệu nhiệm vụ.
                      </td>
                    </tr>
                  )}

                  {/* Totals Row */}
                  {employee.tasks.length > 0 && (
                    <tr className="bg-slate-50 font-black border-t-2 border-slate-300 text-[10px] uppercase text-slate-800">
                      <td colSpan={4} className="p-2.5 text-right border border-slate-300">TỔNG CỘNG:</td>
                      <td className="p-2 text-center border border-slate-300 font-mono text-slate-900 text-xs font-black">
                        {summary.totalTargetQty}
                      </td>
                      <td colSpan={2} className="border border-slate-300"></td>
                      <td className="p-2 text-center border border-slate-300 font-mono text-slate-700">
                        {employee.tasks.reduce((sum, t) => sum + (t.maxScore || 100), 0)}
                      </td>
                      <td className="p-2 text-center border border-slate-300 font-mono text-slate-900 text-xs font-black">
                        {employee.tasks.reduce((sum, t) => sum + (t.assignedScore || 90), 0)}
                      </td>
                      <td className="p-2 text-center border border-slate-300 font-mono text-indigo-700 text-xs font-black bg-indigo-50/20">
                        {employee.tasks.reduce((sum, t) => sum + (t.assignedScore / 5), 0).toFixed(1)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ORIGINAL 13-COLUMN TABLE WITH DETAILED KPI CATEGORIES */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                BẢNG DANH MỤC SẢN PHẨM CÔNG VIỆC VÀ HỆ SỐ QUY ĐỔI ĐIỂM
              </h3>
              <span className="text-[10px] text-slate-400 italic">Công thức: Hệ số = Điểm chấm / 5</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <th className="p-2 border border-slate-200 w-10">TT</th>
                    <th className="p-2 border border-slate-200 text-left w-64">Nhiệm vụ</th>
                    <th className="p-2 border border-slate-200 text-left w-24">Cấp trình</th>
                    <th className="p-2 border border-slate-200 text-left w-32">Sản phẩm</th>
                    <th className="p-2 border border-slate-200 w-16">Tiến độ (Hạn)</th>
                    <th className="p-2 border border-slate-200 w-12">Mục tiêu Qty</th>
                    <th className="p-2 border border-slate-200 w-12">Điểm chấm CV</th>
                    <th className="p-2 border border-slate-200 w-12">Hệ số QĐ</th>
                    <th className="p-2 border border-slate-200 w-14">Quy đổi MT</th>
                    <th className="p-2 border border-slate-200 bg-indigo-50/50 w-24" colSpan={2}>1. KPI Số lượng</th>
                    <th className="p-2 border border-slate-200 bg-emerald-50/50 w-24" colSpan={2}>2. KPI Chất lượng</th>
                    <th className="p-2 border border-slate-200 bg-amber-50/50 w-24" colSpan={2}>3. KPI Tiến độ</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200 text-center">
                    <td colSpan={9} className="border border-slate-200"></td>
                    <td className="p-1 border border-slate-200 bg-indigo-50/20 font-medium">Thực tế</td>
                    <td className="p-1 border border-slate-200 bg-indigo-50/20 font-medium">Quy đổi</td>
                    <td className="p-1 border border-slate-200 bg-emerald-50/20 font-medium">Thực tế</td>
                    <td className="p-1 border border-slate-200 bg-emerald-50/20 font-medium">Quy đổi</td>
                    <td className="p-1 border border-slate-200 bg-amber-50/20 font-medium">Thực tế</td>
                    <td className="p-1 border border-slate-200 bg-amber-50/20 font-medium">Quy đổi</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employee.tasks.map((task, index) => {
                    const factor = task.assignedScore / 5;
                    const targetConverted = task.targetQuantity * factor;
                    
                    const qtyConverted = Math.min(task.actualQtyCount, task.targetQuantity) * factor;
                    const qualConverted = Math.min(task.actualQualityCount, task.targetQuantity) * factor;
                    const progConverted = Math.min(task.actualProgressCount, task.targetQuantity) * factor;

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/40 text-[11px]">
                        <td className="p-2 text-center border border-slate-200 font-mono text-slate-500">{index + 1}</td>
                        <td className="p-2 border border-slate-200 font-medium text-slate-800 leading-tight">
                          {task.mission}
                        </td>
                        <td className="p-2 border border-slate-200 text-slate-600">{task.reportingLevel}</td>
                        <td className="p-2 border border-slate-200 text-slate-600 font-medium">{task.productName}</td>
                        <td className="p-2 border border-slate-200 text-center text-slate-500">{formatTimelineDisplay(task.timeline)}</td>
                        <td className="p-2 text-center border border-slate-200 font-mono font-bold text-slate-700">{task.targetQuantity}</td>
                        <td className="p-2 text-center border border-slate-200 font-mono text-slate-600">{task.assignedScore}đ</td>
                        <td className="p-2 text-center border border-slate-200 font-mono font-bold text-indigo-600">{factor.toFixed(1)}</td>
                        <td className="p-2 text-center border border-slate-200 font-mono font-semibold text-slate-800">{targetConverted.toFixed(1)}</td>
                        
                        {/* Qty KPI actuals */}
                        <td className="p-2 text-center border border-slate-200 bg-indigo-50/10 font-mono text-slate-700">{task.actualQtyCount}</td>
                        <td className="p-2 text-center border border-slate-200 bg-indigo-50/10 font-mono font-semibold text-indigo-600">{qtyConverted.toFixed(1)}</td>
                        
                        {/* Quality KPI actuals */}
                        <td className="p-2 text-center border border-slate-200 bg-emerald-50/10 font-mono text-slate-700">{task.actualQualityCount}</td>
                        <td className="p-2 text-center border border-slate-200 bg-emerald-50/10 font-mono font-semibold text-emerald-600">{qualConverted.toFixed(1)}</td>
                        
                        {/* Progress KPI actuals */}
                        <td className="p-2 text-center border border-slate-200 bg-amber-50/10 font-mono text-slate-700">{task.actualProgressCount}</td>
                        <td className="p-2 text-center border border-slate-200 bg-amber-50/10 font-mono font-semibold text-amber-600">{progConverted.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                  {/* Summary Totals Row */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td colSpan={5} className="p-2.5 text-right border border-slate-200 text-slate-700">TỔNG CỘNG:</td>
                    <td className="p-2 text-center border border-slate-200 font-mono text-slate-800">{summary.totalTargetQty}</td>
                    <td colSpan={2} className="border border-slate-200"></td>
                    <td className="p-2 text-center border border-slate-200 font-mono font-bold text-indigo-600 text-[12px]">
                      {summary.totalTargetConverted.toFixed(1)}
                    </td>
                    
                    {/* Totals Qty */}
                    <td className="p-2 text-center border border-slate-200 bg-indigo-50/20 font-mono text-slate-800">{summary.totalQtyActual}</td>
                    <td className="p-2 text-center border border-slate-200 bg-indigo-50/20 font-mono font-bold text-indigo-600">{summary.totalQtyConverted.toFixed(1)}</td>
                    
                    {/* Totals Quality */}
                    <td className="p-2 text-center border border-slate-200 bg-emerald-50/20 font-mono text-slate-800">{summary.totalQualityActual}</td>
                    <td className="p-2 text-center border border-slate-200 bg-emerald-50/20 font-mono font-bold text-emerald-600">{summary.totalQualityConverted.toFixed(1)}</td>
                    
                    {/* Totals Progress */}
                    <td className="p-2 text-center border border-slate-200 bg-amber-50/20 font-mono text-slate-800">{summary.totalProgressActual}</td>
                    <td className="p-2 text-center border border-slate-200 bg-amber-50/20 font-mono font-bold text-amber-600">{summary.totalProgressConverted.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed KPI Percentages & Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-100 p-4 rounded-xl bg-indigo-50/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">1. KPI Số Lượng (Tỷ lệ Đạt)</span>
            <p className="text-lg font-mono font-bold text-indigo-700">{summary.qtyKPIPercentage.toFixed(4)}%</p>
            <p className="text-[10px] text-slate-400">Tổng quy đổi thực tế / Quy đổi mục tiêu</p>
          </div>
          
          <div className="border border-slate-100 p-4 rounded-xl bg-emerald-50/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">2. KPI Chất Lượng (Tỷ lệ Đạt)</span>
            <p className="text-lg font-mono font-bold text-emerald-700">{summary.qualityKPIPercentage.toFixed(4)}%</p>
            <p className="text-[10px] text-slate-400">Tổng quy đổi chất lượng / Quy đổi mục tiêu</p>
          </div>

          <div className="border border-slate-100 p-4 rounded-xl bg-amber-50/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">3. KPI Tiến Độ (Tỷ lệ Đạt)</span>
            <p className="text-lg font-mono font-bold text-amber-700">{summary.progressKPIPercentage.toFixed(4)}%</p>
            <p className="text-[10px] text-slate-400">Tổng quy đổi tiến độ / Quy đổi mục tiêu</p>
          </div>
        </div>

        {/* Table of 10 General Criteria Scores (30 Points) */}
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              PHẦN I.1: BẢNG TỰ CHẤM ĐIỂM TIÊU CHÍ CHUNG (TỐI ĐA 30 ĐIỂM)
            </h3>
            <span className="text-[10px] text-slate-400 italic">Tổng điểm tiêu chí chung: {totalCriteriaScore.toFixed(1)} / 30.0đ</span>
          </div>
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center uppercase tracking-wide text-[9px]">
                  <th className="p-2 border border-slate-300 w-12">STT</th>
                  <th className="p-2 border border-slate-300 text-left">Tiêu chí đánh giá, chấm điểm</th>
                  <th className="p-2 border border-slate-300 w-24">Điểm tối đa</th>
                  <th className="p-2 border border-slate-300 w-28 bg-emerald-50/20 text-emerald-950">Điểm tự chấm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* I */}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2 text-center border border-slate-300 font-mono">I</td>
                  <td className="p-2 border border-slate-300">Phẩm chất chính trị, đạo đức, lối sống, văn hóa công vụ, kỷ luật, kỷ cương</td>
                  <td className="p-2 text-center border border-slate-300 font-mono">10.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono bg-emerald-50/10 text-emerald-800">
                    {((scores.diemI1 || 0) + (scores.diemI2 || 0)).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">1</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Tư tưởng chính trị, đạo đức, lối sống, văn hóa công vụ</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">5.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemI1 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">2</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Ý thức tổ chức kỷ luật, kỷ cương hành chính</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">5.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemI2 || 0).toFixed(1)}</td>
                </tr>

                {/* II */}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2 text-center border border-slate-300 font-mono">II</td>
                  <td className="p-2 border border-slate-300">Năng lực chuyên môn, kết quả nhiệm vụ, tinh thần trách nhiệm, thái độ phục vụ</td>
                  <td className="p-2 text-center border border-slate-300 font-mono">10.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono bg-emerald-50/10 text-emerald-800">
                    {((scores.diemII1 || 0) + (scores.diemII2 || 0) + (scores.diemII3 || 0) + (scores.diemII4 || 0)).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">1</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Năng lực chuyên môn, nghiệp vụ theo yêu cầu vị trí việc làm</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemII1 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">2</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemII2 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">3</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Tinh thần trách nhiệm trong thực thi công vụ</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemII3 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">4</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Thái độ phục vụ nhân dân, doanh nghiệp và sự phối hợp cùng đồng nghiệp</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemII4 || 0).toFixed(1)}</td>
                </tr>

                {/* III */}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2 text-center border border-slate-300 font-mono">III</td>
                  <td className="p-2 border border-slate-300">Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm</td>
                  <td className="p-2 text-center border border-slate-300 font-mono">10.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono bg-emerald-50/10 text-emerald-800">
                    {((scores.diemIII1 || 0) + (scores.diemIII2 || 0) + (scores.diemIII3 || 0) + (scores.diemIII4 || 0)).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">1</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Có sản phẩm, giải pháp đột phá, sáng tạo hiệu quả trong công tác</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemIII1 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">2</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Sẵn sàng nhận và thực hiện nhiệm vụ chính trị phức tạp, đặc biệt được giao</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemIII2 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">3</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Có tinh thần chịu trách nhiệm trước kết quả công việc, chủ động sửa đổi sai sót</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemIII3 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border border-slate-300 font-mono">4</td>
                  <td className="p-2 border border-slate-300 pl-6 text-slate-700">Có thái độ chủ động ra quyết định và tổ chức thực hiện trong phạm vi thẩm quyền</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-slate-500">2.5</td>
                  <td className="p-2 text-center border border-slate-300 font-mono font-bold text-slate-800">{(scores.diemIII4 || 0).toFixed(1)}</td>
                </tr>

                {/* Tổng cộng */}
                <tr className="bg-emerald-50 font-extrabold text-[12px] text-emerald-950">
                  <td colSpan={2} className="p-2.5 text-right border border-slate-300 uppercase">TỔNG ĐIỂM TIÊU CHÍ CHUNG (I + II + III):</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-xs">30.0</td>
                  <td className="p-2 text-center border border-slate-300 font-mono text-xs bg-emerald-100 font-black text-emerald-900">
                    {totalCriteriaScore.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Standard Mẫu 01 Self-Assessment Word-like Print Block */}
        <div className="border border-slate-200 p-6 rounded-xl bg-slate-50/50 space-y-4 text-left">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            PHẦN TỰ KIỂM ĐIỂM, ĐÁNH GIÁ ĐẢNG VIÊN / CÁN BỘ (THEO MẪU SỐ 01)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-700">
            <div>
              <p className="font-extrabold text-slate-800">1. Về tư tưởng chính trị:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-indigo-400 bg-white/60 p-2 rounded-r-lg">
                {employee.tutuongChinhTri || 'Bản thân luôn có lập trường tư tưởng chính trị vững vàng, kiên định với đường lối đổi mới của Đảng, mục tiêu độc lập dân tộc và chủ nghĩa xã hội. Tuyệt đối chấp hành các chủ trương, đường lối, nghị quyết của Đảng, chính sách pháp luật của Nhà nước. Tích cực tự học tập, nghiên cứu nâng cao trình độ chuyên môn nghiệp vụ.'}
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-800">2. Về phẩm chất đạo đức, lối sống:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-indigo-400 bg-white/60 p-2 rounded-r-lg">
                {employee.phamChatDaoDuc || 'Bản thân luôn giữ gìn phẩm chất đạo đức cách mạng, lối sống trong sạch, giản dị, lành mạnh. Thực hành tiết kiệm, đấu tranh chống lãng phí, quan liêu, tham nhũng. Luôn giữ mối liên hệ mật thiết với nhân dân và quần chúng tại nơi cư trú, cơ quan.'}
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-800">3. Về tác phong, lề lối làm việc:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-indigo-400 bg-white/60 p-2 rounded-r-lg">
                {employee.tacPhongLeLoi || 'Tác phong làm việc khoa học, đúng giờ, có tinh thần trách nhiệm cao đối với công việc được phân công. Giải quyết công việc đúng thẩm quyền, quy trình quy định. Có thái độ hòa nhã, tôn trọng và hợp tác tốt với đồng nghiệp.'}
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-800">4. Về ý thức tổ chức kỷ luật:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-indigo-400 bg-white/60 p-2 rounded-r-lg">
                {employee.yThucKyLuat || 'Chấp hành nghiêm kỷ luật lao động, quy chế làm việc của cơ quan, đơn vị. Gương mẫu thực hiện nghĩa vụ công dân nơi cư trú. Tham gia đầy đủ, nghiêm túc các buổi sinh hoạt chi bộ định kỳ và đóng đảng phí đúng quy định.'}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-3 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-700">
            <div>
              <p className="font-extrabold text-slate-800">5. Hạn chế, khuyết điểm và nguyên nhân:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-amber-400 bg-white/60 p-2 rounded-r-lg">
                {employee.hanCheKhuyetDiem || 'Trong quá trình thực hiện nhiệm vụ đôi lúc còn chưa chủ động nghiên cứu đề xuất các giải pháp cải tiến quy trình hành chính mới. Việc tham gia phát biểu đóng góp ý kiến trong một số cuộc họp sinh hoạt chi bộ còn trầm, chưa sôi nổi.'}
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-800">6. Phương hướng, biện pháp khắc phục:</p>
              <p className="italic mt-1 pl-3 border-l-2 border-emerald-400 bg-white/60 p-2 rounded-r-lg">
                {employee.bienPhapKhacPhuc || 'Thời gian tới chủ động bố trí sắp xếp thời gian khoa học để tự nghiên cứu sâu hơn về các văn bản quy phạm pháp luật mới. Tích cực tham gia đóng góp ý kiến, thể hiện rõ lập trường quan điểm cá nhân trong sinh hoạt chi bộ.'}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-3 border-slate-200 text-[11px] font-bold text-slate-800 flex justify-between items-center bg-white p-3 rounded-lg border border-slate-150">
            <span>7. Tự đề xuất nhận mức xếp loại chất lượng:</span>
            <span className="text-indigo-700 uppercase font-black text-xs">
              {employee.tuNhanXepLoai || 'Hoàn thành tốt nhiệm vụ'}
            </span>
          </div>
        </div>

        {/* Civil Service Self-Evaluation and Leader Remarks */}
        <div className={`grid grid-cols-1 ${employeeIsDeptHead ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
          <div className="border border-slate-100 p-4 rounded-xl bg-slate-50 space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Tự đánh giá của cán bộ
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              {employee.selfAssessmentNote || 'Chưa cập nhật nội dung tự đánh giá.'}
            </p>
          </div>

          {!employeeIsDeptHead && (
            <div className="border border-slate-100 p-4 rounded-xl bg-emerald-50/20 space-y-2">
              <h4 className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ý kiến của Trưởng phòng/Đơn vị
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed italic font-medium">
                {employee.departmentHeadAssessmentNote || 'Chưa cập nhật ý kiến của Trưởng phòng ban quản lý trực tiếp.'}
              </p>
            </div>
          )}

          <div className="border border-slate-100 p-4 rounded-xl bg-indigo-50/30 space-y-2">
            <h4 className="text-xs font-bold uppercase text-indigo-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-600" /> Nhận xét và kết luận của Lãnh đạo/Chi bộ
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
              {employee.managerAssessmentNote || 'Chưa cập nhật nhận xét từ cấp quản lý chi bộ.'}
            </p>
          </div>
        </div>

        {/* Formal Vietnam State Signatures Section with CA Seals */}
        <div className={`grid grid-cols-1 ${employeeIsDeptHead ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8 pt-8 text-center text-xs border-t border-slate-100`}>
          
          {/* Column 1: Employee signature */}
          <div className="space-y-4 flex flex-col justify-between h-44">
            <div>
              <p className="font-bold uppercase text-slate-700">CÁN BỘ TỰ ĐÁNH GIÁ</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
            </div>
            
            <div className="flex items-center justify-center h-16">
              {employee.selfSignedCA ? (
                <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/10 text-left relative overflow-hidden font-mono shadow-3xs select-none max-w-[220px]">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[8px] font-black pointer-events-none">
                    CHỨNG THƯ CA
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Stamp className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ SỐ CA</p>
                      <p className="text-[8px] text-red-600 font-extrabold truncate w-[120px]">Ký bởi: {employee.name}</p>
                      <p className="text-[7px] text-red-500 leading-none">Ngày: {employee.selfSignedCADate}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-300 italic">Đang chờ ký số</span>
              )}
            </div>

            <div>
              <p className="font-bold text-slate-800">{employee.name}</p>
              <p className="text-[10px] text-slate-400">Ngày ký: {employee.selfSignedCA ? employee.selfSignedCADate?.split(' ')[0] : '..... / ..... / 2026'}</p>
            </div>
          </div>

          {/* Column 2: Department Head signature (Only if not dept head themselves) */}
          {!employeeIsDeptHead && (
            <div className="space-y-4 flex flex-col justify-between h-44">
              <div>
                <p className="font-bold uppercase text-slate-700">TRƯỞNG PHÒNG / ĐƠN VỊ</p>
                <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              </div>

              <div className="flex items-center justify-center h-16">
                {employee.deptHeadSignedCA ? (
                  <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/10 text-left relative overflow-hidden font-mono shadow-3xs select-none max-w-[220px]">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[8px] font-black pointer-events-none">
                      CHỨNG THƯ CA
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Stamp className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ SỐ CA</p>
                        <p className="text-[8px] text-red-600 font-extrabold truncate w-[120px]">Ký bởi: {getDeptHeadName()}</p>
                        <p className="text-[7px] text-red-500 leading-none">Ngày: {employee.deptHeadSignedCADate}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-300 italic">Đang chờ ký số cấp phòng</span>
                )}
              </div>

              <div>
                <p className="font-bold text-slate-800">{getDeptHeadName()}</p>
                <p className="text-[10px] text-slate-400">Ngày ký: {employee.deptHeadSignedCA ? employee.deptHeadSignedCADate?.split(' ')[0] : '..... / ..... / 2026'}</p>
              </div>
            </div>
          )}

          {/* Column 3: Higher leader signature */}
          <div className="space-y-4 flex flex-col justify-between h-44 relative">
            <div>
              <p className="font-bold uppercase text-slate-700">BÍ THƯ / LÃNH ĐẠO CẤP CAO</p>
              <p className="text-[10px] text-slate-400 italic">(Ký số & Đóng dấu đỏ)</p>
            </div>

            <div className="flex items-center justify-center h-16 relative">
              {employee.managerSignedCA ? (
                <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/10 text-left relative overflow-hidden font-mono shadow-3xs select-none max-w-[220px] z-10 bg-white">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[8px] font-black pointer-events-none">
                    CHỨNG THƯ CA
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Stamp className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ PHÊ DUYỆT</p>
                      <p className="text-[8px] text-red-600 font-extrabold truncate w-[120px]">Ký bởi: {getLeaderName()}</p>
                      <p className="text-[7px] text-red-500 leading-none">Ngày: {employee.managerSignedCADate}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-300 italic">Đang chờ duyệt & ký số</span>
              )}

              {/* Stamp simulation decoration for Vietnam standard state approvals (Only shown when locked/approved if not signed via CA, otherwise CA takes priority) */}
              {isQuarterLocked && !employee.managerSignedCA && (
                <div className="absolute opacity-40 -rotate-12 flex items-center justify-center border-4 border-rose-600 rounded-full w-24 h-24 text-rose-600 font-extrabold flex-col select-none uppercase pointer-events-none bg-white/40">
                  <Stamp className="w-4 h-4 mb-0.5 text-rose-600" />
                  <span className="text-[6px] font-bold leading-none">ĐẢNG ỦY BỘ TÀI CHÍNH</span>
                  <span className="text-[8px] font-bold leading-none tracking-wider text-rose-700 mt-0.5">ĐÃ PHÊ DUYỆT</span>
                  <span className="text-[6px] leading-none mt-0.5">CHI BỘ BAN TỔ CHỨC</span>
                </div>
              )}
            </div>

            <div>
              <p className="font-bold text-slate-800">{getLeaderName()}</p>
              <p className="text-[10px] text-slate-400">Ngày ký: {employee.managerSignedCA ? employee.managerSignedCADate?.split(' ')[0] : '..... / ..... / 2026'}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
