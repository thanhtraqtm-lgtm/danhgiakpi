import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  Clock,
  Info,
} from 'lucide-react';
import { EvaluationPeriodConfig } from '../types';

interface EvaluationLockManagerProps {
  periodConfig: EvaluationPeriodConfig;
  onUpdatePeriodConfig: (cfg: EvaluationPeriodConfig) => void;
  currentUser?: { id: string; fullName: string; position?: string } | null;
  globalRole?: 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER' | 'ADMIN';
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

export const EvaluationLockManager: React.FC<EvaluationLockManagerProps> = ({
  periodConfig,
  onUpdatePeriodConfig,
  currentUser,
  globalRole = 'ADMIN',
  addToast,
}) => {
  const [confirmLockPeriod, setConfirmLockPeriod] = useState<string | null>(null);
  const [confirmUnlockPeriod, setConfirmUnlockPeriod] = useState<string | null>(null);

  // Chỉ ADMIN và PROVINCE_LEADER (Trưởng TKT tỉnh) mới được khóa/mở sổ
  const canManageLock = globalRole === 'ADMIN' || globalRole === 'PROVINCE_LEADER';
  const allPeriods: string[] = periodConfig.periods || [periodConfig.periodName];
  const currentPeriod = periodConfig.periodName;

  const handleLockPeriod = (periodName: string) => {
    onUpdatePeriodConfig({
      ...periodConfig,
      periodName,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: currentUser?.fullName || 'Lãnh đạo',
    });
    setConfirmLockPeriod(null);
    addToast(
      'success',
      'Đã Khóa Sổ Kỳ Đánh Giá!',
      `Kỳ "${periodName}" đã bị khóa. Toàn bộ dữ liệu đánh giá giờ chỉ xem được, không thể chỉnh sửa. Khóa bởi ${currentUser?.fullName || 'lãnh đạo'}.`
    );
  };

  const handleUnlockPeriod = (periodName: string) => {
    onUpdatePeriodConfig({
      ...periodConfig,
      periodName,
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined,
    });
    setConfirmUnlockPeriod(null);
    addToast(
      'info',
      'Đã Mở Khóa Kỳ Đánh Giá',
      `Kỳ "${periodName}" đã được mở khóa. Người dùng có thể tiếp tục gửi và chỉnh sửa phiếu đánh giá.`
    );
  };

  const isPeriodLocked = (periodName: string) => {
    // Kỳ hiện tại đang active → kiểm tra periodConfig.isLocked
    if (periodName === currentPeriod) return periodConfig.isLocked;
    // Các kỳ khác → mặc định chưa khóa (chỉ active kỳ mới có trạng thái khóa)
    return false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            Khóa Sổ Kỳ Đánh Giá
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Trưởng Thống kê tỉnh / Quản trị viên khóa sổ để cố định kết quả đánh giá — chỉ xem, không sửa.
          </p>
        </div>
        {!canManageLock && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Bạn không có quyền khóa/mở sổ (chỉ Trưởng TKT tỉnh & Admin)
            </span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-sm text-sky-800 dark:text-sky-200">
          <p className="font-bold mb-1">Quy trình khóa sổ đánh giá:</p>
          <p className="text-xs leading-relaxed">
            Sau khi Trưởng phòng phê duyệt và Trưởng TKT tỉnh chấm điểm cuối cùng, lãnh đạo tiến hành <b>khóa sổ</b> kỳ đánh giá.
            Khi đã khóa: người dùng không thể gửi phiếu mới, trưởng phòng không thể phê duyệt, kết quả đánh giá chỉ đọc (view-only).
            Nếu cần chỉnh sửa, lãnh đạo phải <b>mở khóa</b> trước.
          </p>
        </div>
      </div>

      {/* Current Active Period Status */}
      <div className={`rounded-xl border-2 p-5 ${periodConfig.isLocked ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20' : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {periodConfig.isLocked ? (
              <ShieldCheck className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            ) : (
              <Unlock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            )}
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Kỳ đang hoạt động
              </h3>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-0.5">
                <Calendar className="w-4 h-4" />
                {currentPeriod}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${periodConfig.isLocked ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {periodConfig.isLocked ? <><Lock className="w-3.5 h-3.5" /> ĐÃ KHÓA SỔ</> : <><Unlock className="w-3.5 h-3.5" /> ĐANG MỞ</>}
            </span>
            {periodConfig.isLocked && periodConfig.lockedAt && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(periodConfig.lockedAt).toLocaleString('vi-VN')}
              </span>
            )}
            {periodConfig.isLocked && periodConfig.lockedBy && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                {periodConfig.lockedBy}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Period List with Lock/Unlock Buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            Danh Sách Kỳ Đánh Giá & Trạng Thái Khóa
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {allPeriods.map((period, idx) => {
            const locked = isPeriodLocked(period);
            const isActive = period === currentPeriod;
            return (
              <div key={idx} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${locked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {period}
                      {isActive && (
                        <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded text-[10px] font-bold">
                          KỲ HIỆN TẠI
                        </span>
                      )}
                    </p>
                    {locked ? (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" />
                        Đã khóa sổ — chỉ xem, không sửa được
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Unlock className="w-3 h-3" />
                        Đang mở — có thể gửi & chỉnh sửa
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {canManageLock ? (
                    locked ? (
                      confirmUnlockPeriod === period ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnlockPeriod(period)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Xác nhận mở khóa
                          </button>
                          <button
                            onClick={() => setConfirmUnlockPeriod(null)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmUnlockPeriod(period)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Mở khóa
                        </button>
                      )
                    ) : (
                      confirmLockPeriod === period ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLockPeriod(period)}
                            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Xác nhận khóa sổ
                          </button>
                          <button
                            onClick={() => setConfirmLockPeriod(null)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmLockPeriod(period)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Khóa sổ
                        </button>
                      )
                    )
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Không có quyền</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning when locked */}
      {periodConfig.isLocked && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-bold">Kỳ hiện tại đang bị khóa!</p>
            <p className="text-xs mt-1">
              Toàn bộ người dùng không thể gửi phiếu đánh giá mới. Trưởng phòng không thể phê duyệt/từ chối.
              Kết quả đánh giá ở tab "Kết quả đánh giá" chỉ xem được. Nếu cần điều chỉnh, hãy mở khóa kỳ này.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
