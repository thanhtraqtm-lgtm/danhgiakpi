import { useState, useEffect } from 'react';
import { CivilServiceTask, formatTimelineDisplay } from '../types';
import { getConvertedFactor, getConvertedTargetQty, getConvertedActualQty } from '../initialData';
import { 
  ChevronDown, ChevronUp, Edit2, Check, Target, Award,
  Bookmark, Clipboard, FileText, CheckCircle, Clock
} from 'lucide-react';

interface KPICardProps {
  task: CivilServiceTask;
  onUpdateTask: (updatedTask: CivilServiceTask) => void;
}

export default function KPICard({ task, onUpdateTask }: KPICardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing actual results and assigned points
  const [localQty, setLocalQty] = useState(task.actualQtyCount);
  const [localQuality, setLocalQuality] = useState(task.actualQualityCount);
  const [localProgress, setLocalProgress] = useState(task.actualProgressCount);
  const [localAssignedScore, setLocalAssignedScore] = useState(task.assignedScore);
  const [localNote, setLocalNote] = useState(task.note);

  // Sync state when task changes (e.g. employee switches)
  useEffect(() => {
    setLocalQty(task.actualQtyCount);
    setLocalQuality(task.actualQualityCount);
    setLocalProgress(task.actualProgressCount);
    setLocalAssignedScore(task.assignedScore);
    setLocalNote(task.note);
  }, [task]);

  const factor = localAssignedScore / 5;
  const targetConverted = task.targetQuantity * factor;
  
  const currentQtyConverted = localQty * factor;
  const currentQualityConverted = localQuality * factor;
  const currentProgressConverted = localProgress * factor;

  // Calculate local percentage to give immediate visual feedback
  const qtyPercent = task.targetQuantity > 0 ? (localQty / task.targetQuantity) * 100 : 0;
  const qualityPercent = task.targetQuantity > 0 ? (localQuality / task.targetQuantity) * 100 : 0;
  const progressPercent = task.targetQuantity > 0 ? (localProgress / task.targetQuantity) * 100 : 0;
  const averagePercent = (qtyPercent + qualityPercent + progressPercent) / 3;

  const handleSave = () => {
    const updatedTask: CivilServiceTask = {
      ...task,
      assignedScore: Number(localAssignedScore),
      actualQtyCount: Number(localQty),
      actualQualityCount: Number(localQuality),
      actualProgressCount: Number(localProgress),
      note: localNote,
    };
    onUpdateTask(updatedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset back to original
    setLocalQty(task.actualQtyCount);
    setLocalQuality(task.actualQualityCount);
    setLocalProgress(task.actualProgressCount);
    setLocalAssignedScore(task.assignedScore);
    setLocalNote(task.note);
    setIsEditing(false);
  };

  // Status visual color coding
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-500';
    if (percent >= 85) return 'bg-blue-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProgressBg = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (percent >= 85) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (percent >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getProgressText = (percent: number) => {
    if (percent >= 100) return 'Đạt hoàn toàn';
    if (percent >= 85) return 'Đạt khá';
    if (percent >= 50) return 'Cần đẩy nhanh';
    return 'Trễ hạn / Thiếu hụt';
  };

  return (
    <div 
      id={`task-card-${task.id}`}
      className={`bg-white rounded-2xl border transition-all duration-300 ${
        isExpanded ? 'shadow-md border-indigo-100 ring-1 ring-indigo-50/50' : 'border-slate-100 hover:border-slate-200 hover:shadow-xs'
      }`}
    >
      {/* Header View */}
      <div 
        className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => { if (!isEditing) setIsExpanded(!isExpanded); }}
      >
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {task.taskType && (
              <span className={`px-2 py-0.5 rounded-xs font-bold text-[10px] tracking-wide uppercase ${
                task.taskType === 'Định kỳ' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : task.taskType === 'Phát sinh' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-rose-600 text-white shadow-xs'
              }`}>
                {task.taskType}
              </span>
            )}
            <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-medium">
              Cấp trình: {task.reportingLevel}
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm font-medium">
              Sản phẩm: {task.productName}
            </span>
            <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-sm border border-slate-100">
              Hạn: {formatTimelineDisplay(task.timeline)}
            </span>
            <span className={`font-semibold border px-2.5 py-0.5 rounded-full ${getProgressBg(averagePercent)}`}>
              {getProgressText(averagePercent)} ({averagePercent.toFixed(1)}%)
            </span>
          </div>
          
          <h4 className="text-sm font-semibold text-slate-800 leading-snug">
            {task.mission}
          </h4>
          
          {task.note && (
            <p className="text-xs text-slate-400 italic">
              * Ghi chú: {task.note}
            </p>
          )}
        </div>

        {/* Dynamic Column Metrics */}
        <div className="flex items-center space-x-6 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50 justify-between">
          <div className="grid grid-cols-3 gap-5 text-left">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Điểm Công Việc</p>
              <p className="text-xs font-mono font-bold text-slate-700">
                {localAssignedScore} <span className="text-[10px] text-slate-400 font-normal font-sans">/{task.maxScore}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Hệ số quy đổi</p>
              <p className="text-xs font-mono font-bold text-indigo-600">
                {factor.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal font-sans">(đ/5)</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Quy đổi MT</p>
              <p className="text-xs font-mono font-bold text-slate-800">
                {targetConverted.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Mini Progress bar highlighting task completing */}
      <div className="h-1.5 w-full bg-slate-50 rounded-b-md overflow-hidden">
        <div 
          className={`h-full ${getProgressColor(averagePercent)} transition-all duration-500`}
          style={{ width: `${Math.min(averagePercent, 100)}%` }}
        />
      </div>

      {/* Expanded detailed configuration & editor */}
      {isExpanded && (
        <div id={`task-editor-${task.id}`} className="p-6 border-t border-slate-50 bg-slate-50/30 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left box: KPI Qty inputs & point weights */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Cập Nhật Số Liệu Thực Tế (Mục tiêu: {task.targetQuantity})
              </h5>

              {/* Slider / inputs for Actual Quantity */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100">
                {/* 1. Qty KPI */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Clipboard className="w-3 h-3 text-slate-400" /> 1. Số Lượng (Số lượng sản phẩm)
                    </span>
                    <span className="font-mono text-indigo-600 font-semibold">{localQty} / {task.targetQuantity} (QĐ: {currentQtyConverted.toFixed(1)})</span>
                  </div>
                  {isEditing ? (
                    <input 
                      type="range"
                      min="0"
                      max={task.targetQuantity * 2 || 10}
                      step="1"
                      value={localQty}
                      onChange={(e) => setLocalQty(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  ) : (
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.min(qtyPercent, 100)}%` }} />
                    </div>
                  )}
                </div>

                {/* 2. Quality KPI */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-slate-400" /> 2. Chất Lượng (Sản phẩm chuẩn)
                    </span>
                    <span className="font-mono text-emerald-600 font-semibold">{localQuality} / {task.targetQuantity} (QĐ: {currentQualityConverted.toFixed(1)})</span>
                  </div>
                  {isEditing ? (
                    <input 
                      type="range"
                      min="0"
                      max={task.targetQuantity * 2 || 10}
                      step="1"
                      value={localQuality}
                      onChange={(e) => setLocalQuality(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  ) : (
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(qualityPercent, 100)}%` }} />
                    </div>
                  )}
                </div>

                {/* 3. Progress KPI */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> 3. Tiến Độ (Sản phẩm đúng hạn)
                    </span>
                    <span className="font-mono text-amber-600 font-semibold">{localProgress} / {task.targetQuantity} (QĐ: {currentProgressConverted.toFixed(1)})</span>
                  </div>
                  {isEditing ? (
                    <input 
                      type="range"
                      min="0"
                      max={task.targetQuantity * 2 || 10}
                      step="1"
                      value={localProgress}
                      onChange={(e) => setLocalProgress(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  ) : (
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right box: Point and Metadata Configuration */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                Đánh Giá Công Việc & Điểm Số
              </h5>

              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Điểm chấm công việc (Thay đổi hệ số quy đổi)
                  </label>
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={localAssignedScore}
                        onChange={(e) => setLocalAssignedScore(Number(e.target.value))}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                      >
                        {[50, 60, 70, 80, 90, 100, 150, 180, 200, 300, 360, 400].map(val => {
                          if (val <= task.maxScore) {
                            return <option key={val} value={val}>{val}đ / {task.maxScore}đ (Hệ số: {(val/5).toFixed(1)})</option>;
                          }
                          return null;
                        })}
                        {/* Always include current in option list if not there */}
                        {!([50, 60, 70, 80, 90, 100, 150, 180, 200, 300, 360, 400].includes(localAssignedScore)) && (
                          <option value={localAssignedScore}>{localAssignedScore}đ / {task.maxScore}đ (Hệ số: {(localAssignedScore/5).toFixed(1)})</option>
                        )}
                      </select>
                      <input 
                        type="number"
                        min="1"
                        max={task.maxScore}
                        value={localAssignedScore}
                        onChange={(e) => setLocalAssignedScore(Math.min(Number(e.target.value), task.maxScore))}
                        className="w-24 text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono text-center font-bold"
                        placeholder="Khác"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                      <span className="text-slate-500">Điểm chấm: <strong className="text-slate-700 font-mono">{task.assignedScore}đ / {task.maxScore}đ</strong></span>
                      <span className="text-slate-500">Hệ số quy đổi: <strong className="text-indigo-600 font-mono">{(task.assignedScore/5).toFixed(1)}</strong></span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" /> Ghi chú nghiệp vụ / Sản phẩm chi tiết
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={localNote}
                      onChange={(e) => setLocalNote(e.target.value)}
                      placeholder="e.g. Công việc thường xuyên, Nghị quyết..."
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
                      {task.note || 'Không có ghi chú bổ sung.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Xác Nhận Lưu
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Chỉnh Sửa Chỉ Số & Điểm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
