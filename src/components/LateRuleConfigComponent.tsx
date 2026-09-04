import React, { useState } from 'react';
import { 
  Settings, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Save, 
  HelpCircle,
  Calculator,
  Percent
} from 'lucide-react';
import { LateRuleConfig } from '../types';
import { DEFAULT_LATE_CONFIG, evaluateTaskKpi } from '../utils/kpiLogic';
import { TaskComparisonTool } from './TaskComparisonTool';

interface LateRuleConfigComponentProps {
  config: LateRuleConfig;
  onSaveConfig: (newConfig: LateRuleConfig) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  globalRole?: string;
}

export const LateRuleConfigComponent: React.FC<LateRuleConfigComponentProps> = ({
  config,
  onSaveConfig,
  addToast,
  globalRole
}) => {
  const isStaff = globalRole === 'STAFF';
  const [nDays, setNDays] = useState<number>(config.nDaysThreshold || 5);
  const [deductPct, setDeductPct] = useState<number>(
    Math.round((config.deductRatioLate || 0.25) * 100)
  );
  const [warningDays, setWarningDays] = useState<number>(config.warningDays || 2);

  // Live simulation sandbox
  const [simWeight, setSimWeight] = useState<number>(20);
  const [simPlanDate, setSimPlanDate] = useState<string>('2026-07-20');
  const [simActualDate, setSimActualDate] = useState<string>('2026-07-24');

  const simResult = evaluateTaskKpi(
    {
      weight: simWeight,
      planDeadline: simPlanDate,
      actualDeadline: simActualDate,
    },
    {
      nDaysThreshold: nDays,
      deductRatioLate: deductPct / 100,
      warningDays,
    }
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LateRuleConfig = {
      nDaysThreshold: Number(nDays),
      deductRatioLate: Number(deductPct) / 100,
      warningDays: Number(warningDays),
    };

    onSaveConfig(updated);
    addToast(
      'success',
      'Đã lưu quy tắc lệch hạn!',
      `Đã cập nhật ngưỡng n = ${nDays} ngày, trừ ${deductPct}% điểm. Đã tự động tính lại toàn bộ điểm KPI.`
    );
  };

  const handleReset = () => {
    setNDays(DEFAULT_LATE_CONFIG.nDaysThreshold);
    setDeductPct(DEFAULT_LATE_CONFIG.deductRatioLate * 100);
    setWarningDays(DEFAULT_LATE_CONFIG.warningDays);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Thiết Lập Quy Tắc Xử Lý Lệch Hạn Hoàn Thành (Logic Engine)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cấu hình số ngày cho phép trễ hạn n ngày, tỷ lệ trừ điểm tự động và mốc cảnh báo hạn chót.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Config */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Bảng Cấu Hình Số Ngày Trễ Hạn n
            </h3>
            {!isStaff && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded shadow-sm hover:bg-slate-300 transition-colors"
                title="Khôi phục mặc định"
              >
                Khôi phục mặc định
              </button>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {/* Input n Days */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
              <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Số ngày trễ hạn tối đa $n$ (ngày):</span>
                <span className="text-[11px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-mono">
                  n = {nDays} ngày
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={nDays}
                  onChange={(e) => setNDays(Number(e.target.value))}
                  className="w-28 p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-sm text-center"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Quá hạn &le; <strong>{nDays} ngày</strong> sẽ được tính trạng thái <strong>"Trễ hạn"</strong>. Quá hạn &gt; <strong>{nDays} ngày</strong> sẽ bị phạt <strong>0 điểm (Không hoàn thành)</strong>.
                </p>
              </div>
            </div>

            {/* Input Deduct Percentage */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
              <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Mức % trừ điểm khi Trễ hạn (&le; n ngày):</span>
                <span className="text-[11px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-mono">
                  -{deductPct}% điểm
                </span>
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-28">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={deductPct}
                    onChange={(e) => setDeductPct(Number(e.target.value))}
                    className="w-full p-2.5 pr-7 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-sm text-center"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Điểm số tính = <code>Trọng số - (Trọng số × {deductPct}%)</code>. (Mặc định tự động trừ 25%).
                </p>
              </div>
            </div>

            {/* Input Warning threshold */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-2">
              <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Cảnh báo "Gần đến hạn" (khi hạn còn lại &lt; ngày):</span>
                <span className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono">
                  &lt; {warningDays} ngày
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={warningDays}
                  onChange={(e) => setWarningDays(Number(e.target.value))}
                  className="w-28 p-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-sm text-center"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Hiển thị huy hiệu cảnh báo màu vàng mỏng khi hạn còn lại nhỏ hơn {warningDays} ngày.
                </p>
              </div>
            </div>
          </div>

          {!isStaff && (
            <div className="pt-3 flex items-center justify-end">
              <button
                type="submit"
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Cập Nhật & Tính Bảng Điểm Tự Động
              </button>
            </div>
          )}
        </form>

        {/* Live Simulator & Rule Matrix */}
        <div className="lg:col-span-5 space-y-5">
          {/* Simulator Card — nền sáng thay vì nền đen */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Calculator className="w-4 h-4" />
                Mô Phỏng Thử Nghiệm Quy Tắc KPI
              </h3>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded font-mono">Live Testing</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Trọng số / Điểm số chuẩn:</label>
                <input
                  type="number"
                  value={simWeight}
                  onChange={(e) => setSimWeight(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Hạn Kế hoạch:</label>
                  <input
                    type="date"
                    value={simPlanDate}
                    onChange={(e) => setSimPlanDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Hạn Thực tế:</label>
                  <input
                    type="date"
                    value={simActualDate}
                    onChange={(e) => setSimActualDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Output Box — nền sáng */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Trạng thái kết quả:</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                      simResult.status === 'Hoàn thành'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : simResult.status === 'Chưa hoàn thành'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        : simResult.status === 'Hoàn thành trễ hạn'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                    }`}
                  >
                    {simResult.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Số ngày trễ tính toán:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{simResult.daysLate} ngày</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Điểm số thực nhận:</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {simResult.scoreCalculated} / {simWeight} điểm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Logic Matrix Summary */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Bảng Tóm Tắt Khung Điểm KPI
            </h4>

            <ul className="space-y-2 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                <span>
                  <strong>Đúng hạn:</strong> Nộp đúng hoặc trước hạn kế hoạch &rarr; Nhận 100% điểm trọng số.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                <span>
                  <strong>Trễ hạn (&le; {nDays} ngày):</strong> Nộp trễ từ 1 đến {nDays} ngày &rarr; Tự động trừ {deductPct}% điểm trọng số.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                <span>
                  <strong>Không hoàn thành (&gt; {nDays} ngày):</strong> Nộp trễ quá {nDays} ngày &rarr; Nhận 0 điểm.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                <span>
                  <strong>Gần đến hạn:</strong> Chưa hoàn thành và thời gian còn lại &lt; {warningDays} ngày &rarr; Cảnh báo đôn đốc.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* So Sánh 2 File Danh Sách Công Việc */}
      <div className="pt-2">
        <TaskComparisonTool addToast={addToast} />
      </div>
    </div>
  );
};
