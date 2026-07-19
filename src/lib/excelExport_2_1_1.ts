import * as XLSX from 'xlsx';
import { Employee, CivilServiceTask } from '../types';
import { getConvertedFactor, calculateKPIResultSummary } from '../initialData';

const formatDeadlineForExcel = (deadlineDate: string | undefined): string => {
  if (!deadlineDate) return '';
  const dateParts = deadlineDate.split('-');
  if (dateParts.length === 3) {
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  }
  return deadlineDate;
};

export const downloadFullReportExcel = (employee: Employee) => {
    const wb = XLSX.utils.book_new();
    const fileName = `Bao_Cao_KPI_Day_Du_${employee.name.replace(/\s+/g, '_')}.xlsx`;
    const validTasks = (employee.tasks || []).filter(t => t && t.mission && !t.mission.toLowerCase().includes('tổng'));

    // ---------- Sheet 1: CONG VIEC (10 cột chính thức + cột 11 Hạn hoàn thành ẩn) ----------
    const congViecData: any[] = [
      ['TT', 'Nhiệm vụ', 'Cấp trình', 'Sản phẩm', 'Số lượng', 'Tiến độ', 'Ghi chú', 'Điểm tối đa', 'Điểm chấm công việc', 'Hệ số quy đổi', 'Hạn hoàn thành'],
      ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)=(9)/5', '']
    ];

    validTasks.forEach((task, idx) => {
      const factor = getConvertedFactor(task);
      congViecData.push([
        idx + 1,
        task.mission,
        task.reportingLevel,
        task.productName,
        task.targetQuantity,
        task.timeline,
        task.note || '',
        task.maxScore || 100,
        task.assignedScore,
        factor,
        formatDeadlineForExcel(task.deadlineDate)
      ]);
    });

    const wsCongViec = XLSX.utils.aoa_to_sheet(congViecData);
    wsCongViec['!cols'] = [
      { wch: 6 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
      { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
      { wch: 14, hidden: true } // Cột (11) Hạn hoàn thành - ẩn để khớp mẫu gốc khi in/xuất
    ];
    XLSX.utils.book_append_sheet(wb, wsCongViec, 'CONG VIEC');

    // ---------- Sheet 2: TINH DIEM (Bảng tính quy đổi KPI) ----------
    const tinhDiemData: any[] = [
      ['', 'NHIỆM VỤ THỰC HIỆN', '', '', '', '', 'THỰC TẾ TRIỂN KHAI', '', '', '', '', ''],
      ['TT', 'Nhiệm vụ', 'Sản phẩm', 'Số lượng công việc thực hiện', 'Hệ số quy đổi', 'Số lượng quy đổi',
        'KPI SỐ LƯỢNG', '', 'KPI CHẤT LƯỢNG', '', 'KPI TIẾN ĐỘ', ''],
      ['', '', '', '', '', '', 'Thực tế hoàn thành', 'Quy đổi', 'Thực tế hoàn thành', 'Quy đổi', 'Thực tế hoàn thành', 'Quy đổi'],
      ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)=(5)*(4)', '(7)', '(8)=(7)*(5)', '(9)', '(10)=(9)*(5)', '(11)', '(12)=(11)*(5)']
    ];

    validTasks.forEach((task, idx) => {
      const factor = getConvertedFactor(task);
      const qtyConv = factor * task.targetQuantity;
      
      const qtyActualConv = task.actualQtyCount * factor;
      const qualActualConv = task.actualQualityCount * factor;
      const progActualConv = task.actualProgressCount * factor;

      tinhDiemData.push([
        idx + 1,
        task.mission,
        task.productName,
        task.targetQuantity,
        factor,
        qtyConv,
        task.actualQtyCount,
        qtyActualConv,
        task.actualQualityCount,
        qualActualConv,
        task.actualProgressCount,
        progActualConv
      ]);
    });

    // Add Sum Row for Sheet 2
    const summary = calculateKPIResultSummary(validTasks);
    tinhDiemData.push([
      '', 'TỔNG CỘNG', '', '', '', summary.totalTargetConverted,
      '', summary.totalQtyConverted,
      '', summary.totalQualityConverted,
      '', summary.totalProgressConverted
    ]);

    const wsTinhDiem = XLSX.utils.aoa_to_sheet(tinhDiemData);
    
    // Merge headers in Sheet 2
    wsTinhDiem['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } }, // NHIỆM VỤ THỰC HIỆN
      { s: { r: 0, c: 6 }, e: { r: 0, c: 11 } }, // THỰC TẾ TRIỂN KHAI
      { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } }, // KPI SỐ LƯỢNG
      { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } }, // KPI CHẤT LƯỢNG
      { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } }, // KPI TIẾN ĐỘ
      // Merge vertical for first few columns
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // TT
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // Nhiệm vụ
      { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }, // Sản phẩm
      { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } }, // Số lượng CV TH
      { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } }, // Hệ số QĐ
      { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } }  // Số lượng QĐ
    ];

    wsTinhDiem['!cols'] = [
      { wch: 6 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, wsTinhDiem, 'TINH DIEM');

    // ---------- Sheet 3: KET QUA (Điểm KPI tổng hợp) ----------
    const ketQuaData: any[] = [
      ['CHỈ TIÊU KPI CHÍNH', 'CÔNG THỨC', 'MỤC TIÊU', 'THỰC TẾ', 'ĐẠT (TỐI ĐA 100)'],
      ['1. KPI số lượng (A)', '∑(8) / ∑(6) * 100', '100', summary.qtyKPIPercentage.toFixed(1), Math.min(100, summary.qtyKPIPercentage).toFixed(1)],
      ['2. KPI chất lượng (B)', '∑(10) / ∑(6) * 100', '100', summary.qualityKPIPercentage.toFixed(1), Math.min(100, summary.qualityKPIPercentage).toFixed(1)],
      ['3. KPI tiến độ (C)', '∑(12) / ∑(6) * 100', '100', summary.progressKPIPercentage.toFixed(1), Math.min(100, summary.progressKPIPercentage).toFixed(1)],
      ['', '', '', '', ''],
      ['TỔNG ĐIỂM KPI CÔNG VIỆC', '(A + B + C) / 3', '100', '', summary.overallTaskPerformanceScore.toFixed(1)]
    ];

    const wsKetQua = XLSX.utils.aoa_to_sheet(ketQuaData);
    wsKetQua['!cols'] = [
      { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];

    // Bold the total row
    wsKetQua['A6'].s = { font: { bold: true } };
    wsKetQua['E6'].s = { font: { bold: true } };

    XLSX.utils.book_append_sheet(wb, wsKetQua, 'KET QUA');

    // Tải xuống
    XLSX.writeFile(wb, fileName);
};
