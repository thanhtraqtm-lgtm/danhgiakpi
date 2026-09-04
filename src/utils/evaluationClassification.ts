import { User, WorkflowSubmission, KpiTask, EvaluationPeriodConfig } from '../types';
import { normalizeText } from './departmentClassification';
import { getActualUserKpiTaskData } from './kpiLogic';

export interface UserScorecardItem {
  stt: number;
  user: User;
  period: string;
  taskCount: number;
  generalScore30: number;
  kpiScore70: number;
  totalScore100: number;
  approvedScore: number | null;
  effectiveScore: number;
  ratingLabel: string;
  ratingClass: string;
  ratingKey: 'EXCELLENT' | 'GOOD' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'UNCLASSIFIED';
  isApproved: boolean;
  submission?: WorkflowSubmission;
}

export interface ClassificationStats {
  total: number;
  excellent: number;
  good: number;
  completed: number;
  failed: number;
  unclassified: number;
  avgScore: number | string;
  excellentPct: number;
  goodPct: number;
}

/**
 * Computes evaluation scorecard for all users according to state regulations (NĐ 335/2025/NĐ-CP)
 * and matching exactly the "Xếp loại thi đua" column in the "Kết quả đánh giá" menu.
 */
export function computeUserScorecardList(
  users: User[],
  submissions: WorkflowSubmission[],
  tasks: KpiTask[],
  periodConfig?: EvaluationPeriodConfig
): UserScorecardItem[] {
  // Pre-index tasks by user normalized name in a single O(N) pass
  const tasksByUser = new Map<string, KpiTask[]>();
  if (tasks && tasks.length > 0) {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.userName) continue;
      const key = normalizeText(t.userName);
      let list = tasksByUser.get(key);
      if (!list) {
        list = [];
        tasksByUser.set(key, list);
      }
      list.push(t);
    }
  }

  // Pre-index submissions by userId and normalized userName
  const subsByUserId = new Map<string, WorkflowSubmission[]>();
  const subsByUserName = new Map<string, WorkflowSubmission[]>();
  if (submissions && submissions.length > 0) {
    for (let i = 0; i < submissions.length; i++) {
      const s = submissions[i];
      if (s.userId) {
        let list = subsByUserId.get(s.userId);
        if (!list) { list = []; subsByUserId.set(s.userId, list); }
        list.push(s);
      }
      if (s.userName) {
        const key = normalizeText(s.userName);
        let list = subsByUserName.get(key);
        if (!list) { list = []; subsByUserName.set(key, list); }
        list.push(s);
      }
    }
  }

  return (users || []).map((user, idx) => {
    const userNorm = normalizeText(user.fullName);

    // Find submissions for this user (by userId or fullName)
    const userSubsById = user.id ? (subsByUserId.get(user.id) || []) : [];
    const userSubsByName = userNorm ? (subsByUserName.get(userNorm) || []) : [];
    const userSubs = userSubsById.length > 0 && userSubsByName.length > 0
      ? Array.from(new Set([...userSubsById, ...userSubsByName]))
      : (userSubsById.length > 0 ? userSubsById : userSubsByName);
    
    // Match submission for current period if configured
    const targetPeriod = periodConfig?.periodName;
    const sub = targetPeriod
      ? (userSubs.find(s => s.period === targetPeriod) || userSubs[0])
      : userSubs[0];

    // Lấy số công việc và điểm số thực tế từ "Điểm thực hiện nhiệm vụ" (KHÔNG GÁN CỨNG)
    const actualKpi = getActualUserKpiTaskData(user, sub);
    const kpiTaskCount = actualKpi.taskCount;
    const kpiCompletedTaskCount = actualKpi.completedTaskCount;
    const kpiScore70 = actualKpi.kpiScore70;

    // Trích xuất điểm tiêu chí chung (30đ) từ Mẫu tự nhận xét / Phiếu đánh giá
    let generalScore30 = 0;
    try {
      const genRaw = localStorage.getItem(`kpi_general_scores_${user.fullName.trim()}`);
      if (genRaw) {
        const parsedGen = JSON.parse(genRaw);
        if (parsedGen.totalGeneralScore !== undefined && parsedGen.totalGeneralScore > 0) {
          generalScore30 = Number(parsedGen.totalGeneralScore);
        }
      }
    } catch {}

    if (generalScore30 === 0 && sub?.generalScore !== undefined && sub.generalScore > 0) {
      generalScore30 = Number(sub.generalScore);
    } else if (generalScore30 === 0 && sub && sub.criteria && sub.criteria.length > 0) {
      const generalCriteria = sub.criteria.filter(c => 
        c.id.startsWith('crit_I') || c.id.startsWith('crit_II') || c.id.startsWith('crit_III')
      );
      if (generalCriteria.length > 0) {
        generalScore30 = Number(generalCriteria.reduce((acc, c) => acc + (c.selfScore || 0), 0).toFixed(1));
      }
    }

    // Tổng điểm tự chấm = Tiêu chí chung (30đ) + Điểm thực hiện nhiệm vụ (70đ)
    let totalScore100 = 0;
    if (generalScore30 > 0 || kpiScore70 > 0) {
      totalScore100 = Number((generalScore30 + kpiScore70).toFixed(1));
    } else if (sub?.selfScoreTotal !== undefined && sub.selfScoreTotal > 0) {
      totalScore100 = Number(sub.selfScoreTotal);
    }

    const isLeaderApproved = sub?.status === 'APPROVED_FINAL';
    const isDeptApproved = sub?.status === 'APPROVED_DEPT';
    
    const approvedScore = isLeaderApproved && sub?.finalScore !== undefined && sub?.finalScore !== null
      ? Number(sub.finalScore)
      : (isDeptApproved && sub?.deptHeadScore !== undefined && sub?.deptHeadScore !== null
          ? Number(sub.deptHeadScore)
          : null);

    const effectiveScore = approvedScore !== null 
      ? approvedScore 
      : (sub && totalScore100 > 0 ? totalScore100 : 0);

    // Rating classification: Prioritize explicitly chosen manual classification
    // 1. Decided by Province Leader (finalClassification)
    // 2. Evaluated by Dept Head (deptHeadClassification)
    // 3. Proposed by Staff (selfClassification)
    const manualClassification = sub?.finalClassification || sub?.deptHeadClassification || sub?.selfClassification;

    let ratingLabel = 'Chưa xếp loại';
    let ratingClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    let ratingKey: 'EXCELLENT' | 'GOOD' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'UNCLASSIFIED' = 'UNCLASSIFIED';

    if (manualClassification) {
      ratingLabel = manualClassification;
      if (manualClassification.includes('xuất sắc') || manualClassification.includes('Xuất sắc')) {
        ratingClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        ratingKey = 'EXCELLENT';
      } else if (manualClassification.includes('Hoàn thành tốt') || manualClassification.includes('hoàn thành tốt')) {
        ratingClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
        ratingKey = 'GOOD';
      } else if (manualClassification.includes('Chưa hoàn thành') || manualClassification.includes('chưa hoàn thành')) {
        ratingClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
        ratingKey = 'PENDING';
      } else if (manualClassification.includes('Không hoàn thành') || manualClassification.includes('không hoàn thành')) {
        ratingClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
        ratingKey = 'FAILED';
      } else if (manualClassification.includes('Hoàn thành') || manualClassification.includes('hoàn thành')) {
        ratingClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        ratingKey = 'COMPLETED';
      }
    } else if (sub || effectiveScore > 0) {
      // Fallback based on scores per Nghị định 335
      if (effectiveScore >= 90) {
        ratingLabel = 'Hoàn thành xuất sắc nhiệm vụ';
        ratingClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        ratingKey = 'EXCELLENT';
      } else if (effectiveScore >= 70) {
        ratingLabel = 'Hoàn thành tốt nhiệm vụ';
        ratingClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
        ratingKey = 'GOOD';
      } else if (effectiveScore >= 50) {
        ratingLabel = 'Hoàn thành nhiệm vụ';
        ratingClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        ratingKey = 'COMPLETED';
      } else {
        ratingLabel = 'Chưa hoàn thành nhiệm vụ';
        ratingClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
        ratingKey = 'PENDING';
      }
    }

    return {
      stt: idx + 1,
      user,
      period: sub?.period || periodConfig?.periodName || 'Kỳ hiện tại',
      taskCount: kpiTaskCount,
      completedTaskCount: kpiCompletedTaskCount,
      generalScore30: Math.round(generalScore30 * 10) / 10,
      kpiScore70: Math.round(kpiScore70 * 10) / 10,
      totalScore100: Math.round(totalScore100 * 10) / 10,
      approvedScore,
      effectiveScore,
      ratingLabel,
      ratingClass,
      ratingKey,
      isApproved: sub?.status === 'APPROVED_FINAL',
      submission: sub
    };
  });
}

/**
 * Calculates classification statistics from a scorecard list
 */
export function computeClassificationStats(scorecardList: UserScorecardItem[]): ClassificationStats {
  const total = scorecardList.length;
  const excellent = scorecardList.filter(s => s.ratingKey === 'EXCELLENT').length;
  const good = scorecardList.filter(s => s.ratingKey === 'GOOD').length;
  const completed = scorecardList.filter(s => s.ratingKey === 'COMPLETED').length;
  const failed = scorecardList.filter(s => s.ratingKey === 'FAILED' || s.ratingKey === 'PENDING').length;
  const unclassified = scorecardList.filter(s => s.ratingKey === 'UNCLASSIFIED').length;

  const evaluatedCount = scorecardList.filter(s => s.effectiveScore > 0).length;
  const avgScore = evaluatedCount > 0 
    ? (scorecardList.reduce((a, b) => a + (b.effectiveScore || 0), 0) / evaluatedCount).toFixed(1)
    : 0;

  return {
    total,
    excellent,
    good,
    completed,
    failed,
    unclassified,
    avgScore,
    excellentPct: total > 0 ? Math.round((excellent / total) * 100) : 0,
    goodPct: total > 0 ? Math.round((good / total) * 100) : 0,
  };
}
