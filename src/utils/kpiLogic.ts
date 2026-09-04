import { KpiTask, LateRuleConfig, TaskStatus } from '../types';

export const DEFAULT_LATE_CONFIG: LateRuleConfig = {
  nDaysThreshold: 5,
  deductRatioLate: 0.25,
  warningDays: 2,
};

export type EvaluationClassification = 'XuatSac' | 'Tot' | 'HoanThanh' | 'KhongHoanThanh';

export interface EvaluationResult {
  totalScore: number;
  classification: EvaluationClassification;
  classificationLabel: string;
  isUnder100Percent: boolean;
  quantityPct: number;
  qualityPct: number;
  timelinePct: number;
  taskExecutionScore: number;
  generalCriteriaScore: number;
}

/**
 * Normalize an arbitrary status string (from Excel import, form input, etc.)
 * to one of the canonical TaskStatus values:
 *   'Hoàn thành' | 'Hoàn thành trễ hạn' | 'Chưa hoàn thành' | 'Chưa hoàn thành trễ hạn'
 */
export function normalizeTaskStatus(raw: string | undefined | null): TaskStatus {
  if (!raw) return 'Chưa hoàn thành';
  const s = (raw || '')
    .normalize('NFC')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!s) return 'Chưa hoàn thành';

  const noAccent = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'd');

  const hasChua = s.includes('chưa') || s.includes('chua') || noAccent.includes('chua');
  const hasTre = s.includes('trễ') || s.includes('tre') || noAccent.includes('tre') || s.includes('muộn') || s.includes('muon');
  const hasHoanThanh = s.includes('hoàn thành') || s.includes('hoan thanh') || noAccent.includes('hoan thanh');

  if (hasChua && hasTre) return 'Chưa hoàn thành trễ hạn';
  if (s === 'tre han' || s === 'trễ hạn' || s === 'tre' || s === 'chua xong tre' || s === 'chtt' || s === 'chtt ') {
    return 'Chưa hoàn thành trễ hạn';
  }

  if (
    hasChua ||
    s.includes('chưa xong') || s.includes('chua xong') ||
    s === 'đang làm' || s === 'dang lam' || s === 'đang xử lý' || s === 'dang xu ly' ||
    s === 'in progress' || s === 'pending' || s === 'chua' || s === 'cht'
  ) {
    return 'Chưa hoàn thành';
  }

  if (hasHoanThanh && hasTre) return 'Hoàn thành trễ hạn';
  if (/^htt\b/.test(s) || s === 'ht tre' || s === 'ht tre han' || s === 'hoan thanh tre') {
    return 'Hoàn thành trễ hạn';
  }
  if ((s.includes('đã') || s.includes('da ')) && hasHoanThanh && hasTre) {
    return 'Hoàn thành trễ hạn';
  }

  if (
    hasHoanThanh ||
    s.includes('đã hoàn thành') || s.includes('da hoan thanh') ||
    s === 'ht' || s === 'xong' || s === 'đã xong' || s === 'da xong' ||
    s === 'done' || s === 'complete' || s === 'completed' || s === 'finished' ||
    s.includes('đúng hạn') || s.includes('dung han') || noAccent.includes('dung han')
  ) {
    return 'Hoàn thành';
  }

  return 'Chưa hoàn thành';
}

/**
 * Computes individual task KPI status and score based on deadline rule:
 * - Completed on time: full score
 * - Completed late <= nDaysThreshold: -25% score
 * - Completed late > nDaysThreshold: 0 score
 * - Not completed, not late: full score (still in progress)
 * - Not completed, late <= nDaysThreshold: -25% score
 * - Not completed, late > nDaysThreshold: 0 score
 */
export function evaluateTaskKpi(
  task: Partial<KpiTask>,
  config: LateRuleConfig = DEFAULT_LATE_CONFIG
): { status: TaskStatus; scoreCalculated: number; daysLate: number } {
  const weight = task.weight ?? 100;
  const planStr = task.planDeadline;
  const actualStr = task.actualDeadline;

  if (!planStr) {
    return { status: actualStr ? 'Hoàn thành' : 'Chưa hoàn thành', scoreCalculated: weight, daysLate: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const comparisonDate = actualStr || todayStr;

  const planDate = new Date(planStr);
  const actualOrTodayDate = new Date(comparisonDate);
  planDate.setHours(0, 0, 0, 0);
  actualOrTodayDate.setHours(0, 0, 0, 0);

  const daysLate = Math.floor((actualOrTodayDate.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24));

  if (actualStr) {
    if (daysLate <= 0) {
      return { status: 'Hoàn thành', scoreCalculated: weight, daysLate: 0 };
    } else {
      let score = weight;
      if (daysLate <= config.nDaysThreshold) {
        score = Math.max(0, weight - (weight * config.deductRatioLate));
      } else {
        score = 0;
      }
      return { status: 'Hoàn thành trễ hạn', scoreCalculated: Number(score.toFixed(1)), daysLate };
    }
  } else {
    if (daysLate <= 0) {
      return { status: 'Chưa hoàn thành', scoreCalculated: weight, daysLate: 0 };
    } else {
      let score = weight;
      if (daysLate <= config.nDaysThreshold) {
        score = Math.max(0, weight - (weight * config.deductRatioLate));
      } else {
        score = 0;
      }
      return { status: 'Chưa hoàn thành trễ hạn', scoreCalculated: Number(score.toFixed(1)), daysLate };
    }
  }
}

/**
 * Classification label mapping
 */
export function getClassificationLabel(classification: EvaluationClassification): string {
  switch (classification) {
    case 'XuatSac': return 'Hoàn thành xuất sắc nhiệm vụ';
    case 'Tot': return 'Hoàn thành tốt nhiệm vụ';
    case 'HoanThanh': return 'Hoàn thành nhiệm vụ';
    case 'KhongHoanThanh': return 'Không hoàn thành nhiệm vụ';
    default: return 'Không xác định';
  }
}

/**
 * Determine classification based on total score (100-point scale)
 * Per Nghị định 335/2025/NĐ-CP Điều 20
 */
export function classifyByScore(totalScore: number): EvaluationClassification {
  if (totalScore >= 90) return 'XuatSac';
  if (totalScore >= 70) return 'Tot';
  if (totalScore >= 50) return 'HoanThanh';
  return 'KhongHoanThanh';
}

/**
 * Main evaluation function implementing quy định:
 * - Công thức: (a + b + c) / 3 cho công chức, (a+b+c+d+đ+e)/6 cho lãnh đạo
 * - a = % số lượng, b = % chất lượng, c = % tiến độ
 * - Điểm nhiệm vụ = taskExecutionScore / 100 * 70
 * - Tổng điểm = Điểm nhiệm vụ (70%) + Điểm tiêu chí chung (30%)
 * - QUAN TRỌNG: Nếu quantityPct < 100% → tự động "Không hoàn thành nhiệm vụ" (<50đ)
 */
export function evaluateOverallKPI(
  quantityPct: number,
  qualityPct: number,
  timelinePct: number,
  generalCriteriaScore: number,
  isLeader: boolean = false,
  dPct?: number,
  ddPct?: number,
  ePct?: number
): EvaluationResult {
  const taskExecutionScore = isLeader && dPct !== undefined && ddPct !== undefined && ePct !== undefined
    ? (quantityPct + qualityPct + timelinePct + dPct + ddPct + ePct) / 6
    : (quantityPct + qualityPct + timelinePct) / 3;

  const weightedTask70 = (taskExecutionScore / 100) * 70;
  let totalScore = weightedTask70 + generalCriteriaScore;

  // Quy định Điều 7: Hoàn thành dưới 100% nhiệm vụ → "Không hoàn thành nhiệm vụ"
  const isUnder100Percent = quantityPct < 100;
  if (isUnder100Percent) {
    totalScore = Math.min(totalScore, 49);
  }

  const classification = classifyByScore(totalScore);

  return {
    totalScore: Number(totalScore.toFixed(2)),
    classification,
    classificationLabel: getClassificationLabel(classification),
    isUnder100Percent,
    quantityPct: Number(quantityPct.toFixed(2)),
    qualityPct: Number(qualityPct.toFixed(2)),
    timelinePct: Number(timelinePct.toFixed(2)),
    taskExecutionScore: Number(taskExecutionScore.toFixed(2)),
    generalCriteriaScore: Number(generalCriteriaScore.toFixed(2)),
  };
}

/**
 * Compute conversion factor per Danh mục công việc (File 5)
 * Hệ số quy đổi = Điểm chấm / 5
 */
export function computeConversionFactor(evalScore: number): number {
  return Number((evalScore / 5).toFixed(2));
}

/**
 * Tính toán kết quả tổng hợp của "Điểm thực hiện nhiệm vụ" từ danh sách công việc (TaskKpiRow[])
 * Không gán cứng, tính toán thực tế 100% dựa theo công thức chuẩn:
 * - Hệ số quy đổi = Điểm chấm / 5
 * - Khối lượng quy đổi = Số lượng * Hệ số quy đổi
 * - Điểm nhiệm vụ (thang 100) = (Tỷ lệ KL + Tỷ lệ CL + Tỷ lệ TĐ) / 3
 * - Điểm quy đổi KPI 70đ = (Điểm nhiệm vụ / 100) * 70
 */
export function calculateKpiSheetSummaryFromRows(rows: any[]) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return {
      taskCount: 0,
      completedTaskCount: 0,
      kpiQuantityPct: 0,
      kpiQualityPct: 0,
      kpiTimelinePct: 0,
      taskExecutionScore: 0,
      weightedTask70: 0,
    };
  }

  let totalConvertedQty = 0;
  let totalConvertedActualQty = 0;
  let totalConvertedActualQuality = 0;
  let totalConvertedActualTimeline = 0;
  let completedCount = 0;

  rows.forEach((r) => {
    const evalScore = Number(r.evalScore) || 0;
    const conversionFactor = Number((evalScore / 5).toFixed(2));
    const qty = Number(r.quantity) || 1;
    const actualQty = Number(r.actualQtyCompleted !== undefined ? r.actualQtyCompleted : qty);
    const actualQuality = Number(r.actualQualityCompleted !== undefined ? r.actualQualityCompleted : qty);
    const actualTimeline = Number(r.actualTimelineCompleted !== undefined ? r.actualTimelineCompleted : qty);

    totalConvertedQty += qty * conversionFactor;
    totalConvertedActualQty += actualQty * conversionFactor;
    totalConvertedActualQuality += actualQuality * conversionFactor;
    totalConvertedActualTimeline += actualTimeline * conversionFactor;

    if (actualQty >= qty && evalScore >= 70) {
      completedCount++;
    }
  });

  const denom = totalConvertedQty > 0 ? totalConvertedQty : 1;
  const kpiQuantityPct = Number(((totalConvertedActualQty / denom) * 100).toFixed(2));
  const kpiQualityPct = Number(((totalConvertedActualQuality / denom) * 100).toFixed(2));
  const kpiTimelinePct = Number(((totalConvertedActualTimeline / denom) * 100).toFixed(4));

  const taskExecutionScore = Number(((kpiQuantityPct + kpiQualityPct + kpiTimelinePct) / 3).toFixed(2));
  const weightedTask70 = Number(((taskExecutionScore / 100) * 70).toFixed(1));

  return {
    taskCount: rows.length,
    completedTaskCount: completedCount,
    kpiQuantityPct,
    kpiQualityPct,
    kpiTimelinePct,
    taskExecutionScore,
    weightedTask70,
  };
}

/**
 * Đọc dữ liệu công việc thực tế được lưu từ Menu "Điểm thực hiện nhiệm vụ"
 * Hỗ trợ tra cứu mềm dẻo theo tên (NFC/NFD, hoa thường, khoảng trắng)
 */
export function getSavedKpiRowsForUser(fullName: string): any[] | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  const nfc = trimmed.normalize('NFC');
  
  // 1. Kiểm tra trực tiếp key
  try {
    const raw = localStorage.getItem(`kpi_3sheet_rows_${trimmed}`) || localStorage.getItem(`kpi_3sheet_rows_${nfc}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // 2. Quét các key trong localStorage để khớp chính xác không phân biệt hoa thường
  try {
    const targetNorm = nfc.toLowerCase();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('kpi_3sheet_rows_')) {
        const userPart = k.replace('kpi_3sheet_rows_', '').normalize('NFC').trim().toLowerCase();
        if (userPart === targetNorm) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Đọc bảng tổng hợp kết quả thực tế từ Menu "Điểm thực hiện nhiệm vụ"
 */
export function getSavedKpiSummaryForUser(fullName: string): any | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  const nfc = trimmed.normalize('NFC');

  try {
    const raw = localStorage.getItem(`kpi_3sheet_summary_${trimmed}`) || localStorage.getItem(`kpi_3sheet_summary_${nfc}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  try {
    const targetNorm = nfc.toLowerCase();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('kpi_3sheet_summary_')) {
        const userPart = k.replace('kpi_3sheet_summary_', '').normalize('NFC').trim().toLowerCase();
        if (userPart === targetNorm) {
          const raw = localStorage.getItem(k);
          if (raw) return JSON.parse(raw);
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Trích xuất chính xác số công việc và điểm thực tế từ "Điểm thực hiện nhiệm vụ"
 * LOẠI BỎ HOÀN TOÀN GÁN CỨNG:
 * - Không lấy từ danh sách phân công công việc mặc định
 * - Không tự động nhân chia 70/30 khi chưa có điểm nhiệm vụ
 */
export function getActualUserKpiTaskData(
  user: { id?: string; fullName: string; username?: string },
  sub?: any
): {
  taskCount: number;
  completedTaskCount: number;
  kpiScore70: number;
  taskExecutionScore100: number;
  hasKpiData: boolean;
} {
  // 1. Ưu tiên cao nhất: Dữ liệu thực tế các dòng công việc trong Menu "Điểm thực hiện nhiệm vụ" (localStorage)
  const savedRows = getSavedKpiRowsForUser(user.fullName);
  if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
    const summary = calculateKpiSheetSummaryFromRows(savedRows);
    return {
      taskCount: summary.taskCount,
      completedTaskCount: summary.completedTaskCount,
      kpiScore70: summary.weightedTask70,
      taskExecutionScore100: summary.taskExecutionScore,
      hasKpiData: true,
    };
  }

  // 2. Dữ liệu tổng hợp từ Menu "Điểm thực hiện nhiệm vụ" (localStorage)
  const savedSummary = getSavedKpiSummaryForUser(user.fullName);
  if (savedSummary && (savedSummary.taskCount > 0 || (savedSummary.weightedTask70 !== undefined && savedSummary.weightedTask70 > 0))) {
    return {
      taskCount: Number(savedSummary.taskCount) || 0,
      completedTaskCount: Number(savedSummary.completedTaskCount ?? savedSummary.taskCount) || 0,
      kpiScore70: Number(Number(savedSummary.weightedTask70 || 0).toFixed(1)),
      taskExecutionScore100: Number(savedSummary.taskExecutionScore || 0),
      hasKpiData: true,
    };
  }

  // 3. Dữ liệu từ phiếu nộp của người dùng có đính kèm kpiRows
  if (sub?.kpiRows && Array.isArray(sub.kpiRows) && sub.kpiRows.length > 0) {
    const summary = calculateKpiSheetSummaryFromRows(sub.kpiRows);
    return {
      taskCount: summary.taskCount,
      completedTaskCount: summary.completedTaskCount,
      kpiScore70: summary.weightedTask70,
      taskExecutionScore100: summary.taskExecutionScore,
      hasKpiData: true,
    };
  }

  // 4. Dữ liệu điểm thực hiện nhiệm vụ đã nộp chính thức trong phiếu (taskWeightedScore hoặc crit_IV_kpi)
  if (sub?.taskWeightedScore !== undefined && sub.taskWeightedScore > 0) {
    const count = Number(sub.taskCount) || 0;
    const score70 = Number(Number(sub.taskWeightedScore).toFixed(1));
    return {
      taskCount: count,
      completedTaskCount: Number(sub.completedTaskCount ?? count) || 0,
      kpiScore70: score70,
      taskExecutionScore100: sub.kpiTaskScore ? Number(sub.kpiTaskScore) : Number(((score70 / 70) * 100).toFixed(1)),
      hasKpiData: true,
    };
  }

  if (sub?.criteria && Array.isArray(sub.criteria) && sub.criteria.length > 0) {
    const kpiCrit = sub.criteria.find((c: any) => 
      c.id === 'crit_IV_kpi' || c.id === 'crit_IV_KPI' || c.id === 'crit_IV_kpi_weighted' || 
      (c.categoryName && (c.categoryName.includes('IV.') || c.categoryName.includes('KPI')))
    );
    if (kpiCrit && kpiCrit.selfScore !== undefined && Number(kpiCrit.selfScore) > 0) {
      const score = Number(Number(kpiCrit.selfScore).toFixed(1));
      const count = Number(sub.taskCount) || 0;
      return {
        taskCount: count,
        completedTaskCount: Number(sub.completedTaskCount ?? count) || 0,
        kpiScore70: score,
        taskExecutionScore100: Number(((score / 70) * 100).toFixed(1)),
        hasKpiData: true,
      };
    }
  }

  if (sub?.kpiTaskScore !== undefined && sub.kpiTaskScore > 0) {
    const count = Number(sub.taskCount) || 0;
    return {
      taskCount: count,
      completedTaskCount: Number(sub.completedTaskCount ?? count) || 0,
      kpiScore70: Number(((sub.kpiTaskScore / 100) * 70).toFixed(1)),
      taskExecutionScore100: Number(sub.kpiTaskScore),
      hasKpiData: true,
    };
  }

  if (sub?.taskCount !== undefined && sub.taskCount > 0) {
    return {
      taskCount: Number(sub.taskCount),
      completedTaskCount: Number(sub.completedTaskCount ?? sub.taskCount),
      kpiScore70: 0,
      taskExecutionScore100: 0,
      hasKpiData: true,
    };
  }

  // 5. Mặc định: Tuyệt đối KHÔNG gán cứng. Nếu chưa có đánh giá nhiệm vụ thực tế thì là 0
  return {
    taskCount: 0,
    completedTaskCount: 0,
    kpiScore70: 0,
    taskExecutionScore100: 0,
    hasKpiData: false,
  };
}