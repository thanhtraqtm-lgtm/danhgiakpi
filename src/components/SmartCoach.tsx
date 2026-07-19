import { Employee } from '../types';
import { Sparkles, CheckCircle, TrendingUp, Lightbulb, Target } from 'lucide-react';

interface SmartCoachProps {
  employee: Employee;
}

export default function SmartCoach({ employee }: SmartCoachProps) {
  // Analyze current employee tasks
  const analysis = (() => {
    if (!employee.tasks || employee.tasks.length === 0) {
      return { weakestTask: null, weakestScore: 100, strongestTask: null, strongestScore: 0 };
    }

    let weakestTask = employee.tasks[0];
    const getTaskAvg = (t: typeof weakestTask) => {
      const qty = t.targetQuantity > 0 ? (t.actualQtyCount / t.targetQuantity) * 100 : 0;
      const qual = t.targetQuantity > 0 ? (t.actualQualityCount / t.targetQuantity) * 100 : 0;
      const prog = t.targetQuantity > 0 ? (t.actualProgressCount / t.targetQuantity) * 100 : 0;
      return (qty + qual + prog) / 3;
    };

    let weakestScore = getTaskAvg(weakestTask);
    
    let strongestTask = employee.tasks[0];
    let strongestScore = getTaskAvg(strongestTask);

    employee.tasks.forEach(task => {
      const score = getTaskAvg(task);
      if (score < weakestScore) {
        weakestScore = score;
        weakestTask = task;
      }
      if (score > strongestScore) {
        strongestScore = score;
        strongestTask = task;
      }
    });

    return {
      weakestTask,
      weakestScore,
      strongestTask,
      strongestScore
    };
  })();

  const { weakestTask, weakestScore, strongestTask, strongestScore } = analysis;

  // Generate civil-service-specific advisory tips
  const getCoachAdvice = () => {
    if (!weakestTask) return { tips: [], summary: '' };

    const missionLower = weakestTask.mission.toLowerCase();
    const prodLower = weakestTask.productName.toLowerCase();

    if (missionLower.includes('tờ trình') || prodLower.includes('tờ trình') || prodLower.includes('quyết định')) {
      return {
        summary: 'Tập trung rà soát thể thức văn bản hành chính theo Nghị định 30/2020/NĐ-CP và phối hợp lấy ý kiến liên bộ/ngành sớm để tránh trễ hạn ban hành.',
        tips: [
          'Chủ động gửi dự thảo tờ trình xin ý kiến tham gia của các chuyên viên chuyên môn trước thời hạn 5-7 ngày.',
          'Đối chiếu kỹ lưỡng căn cứ pháp lý và thẩm quyền ban hành trước khi trình cấp có thẩm quyền phê duyệt.',
          'Xây dựng sơ đồ quy trình xin chữ ký số nội bộ để rút ngắn thời gian luân chuyển hồ sơ trình duyệt.'
        ]
      };
    }

    if (missionLower.includes('báo cáo') || prodLower.includes('báo cáo')) {
      return {
        summary: 'Chuẩn hóa quy trình tổng hợp số liệu thống kê định kỳ và thay thế các nhận định định tính bằng chỉ tiêu định lượng cụ thể.',
        tips: [
          'Xây dựng biểu mẫu tổng hợp dữ liệu tự động trên Google Sheets để các ban chuyên môn nhập liệu song song.',
          'Dành riêng 1 ngày trước hạn nộp báo cáo để đối chiếu chéo số liệu giữa các phòng ban, tránh sai lệch biên tập.',
          'Trình bày kết quả theo mô hình tóm tắt trực quan (executive summary) ở trang đầu để Lãnh đạo dễ dàng nắm bắt.'
        ]
      };
    }

    if (missionLower.includes('đảng') || missionLower.includes('chi bộ') || missionLower.includes('nghị quyết') || prodLower.includes('sinh hoạt')) {
      return {
        summary: 'Đẩy mạnh sinh hoạt chuyên đề chính trị tư tưởng chất lượng cao và tăng cường ứng dụng Sổ tay đảng viên điện tử.',
        tips: [
          'Chuẩn bị đề cương sinh hoạt chi bộ chi tiết gửi trước cho toàn thể đảng viên nghiên cứu tối thiểu 3 ngày.',
          'Phân công cụ thể cấp ủy viên đôn đốc tiến độ thực hiện các Nghị quyết, Kết luận sau cuộc họp chi bộ.',
          'Sử dụng các nền tảng số để quản lý thủ tục hành chính Đảng, điểm danh và lưu trữ tài liệu sinh hoạt trực tuyến.'
        ]
      };
    }

    // Default general civil service advice
    return {
      summary: 'Duy trì tiến độ hoàn thành các chỉ tiêu sản phẩm quy đổi hành chính, nâng cao hiệu quả phối hợp công tác giữa các ban Đảng và chuyên môn.',
      tips: [
        'Sắp xếp thứ tự ưu tiên xử lý các văn bản đến theo độ khẩn (Hỏa tốc, Thượng khẩn, Khẩn).',
        'Ứng dụng phần mềm quản lý văn bản điều hành (e-Office) để kiểm soát vết xử lý hồ sơ công việc.',
        'Tham gia đầy đủ các lớp đào tạo bồi dưỡng nâng cao trình độ quản lý nhà nước và nghiệp vụ chuyên ngành.'
      ]
    };
  };

  const advice = getCoachAdvice();

  return (
    <div id={`smart-coach-${employee.id}`} className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight">Trợ Lý Tham Mưu Hiệu Suất (AI)</h4>
            <p className="text-[10px] text-slate-400">Gợi ý tháo gỡ điểm nghẽn nghiệp vụ dựa trên dữ liệu sản phẩm quy đổi</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase">
          Khối Hành Chính Nhà Nước
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric Peak (Strongest) */}
        {strongestTask && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Điểm Sáng Nhiệm Vụ</p>
              <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">{strongestTask.mission}</p>
              <p className="text-xs text-slate-400 mt-1">
                Hoàn thành xuất sắc <span className="text-emerald-400 font-bold">{strongestScore.toFixed(1)}%</span> mục tiêu quy đổi.
              </p>
            </div>
          </div>
        )}

        {/* Metric Valley (Weakest) */}
        {weakestTask && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Điểm Cần Đẩy Nhanh</p>
              <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">{weakestTask.mission}</p>
              <p className="text-xs text-slate-400 mt-1">
                Tỷ lệ đạt hiện tại: <span className="text-amber-400 font-bold">{weakestScore.toFixed(1)}%</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Structured Advice block */}
      {weakestTask && (
        <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-900/40 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-300">
            <Lightbulb className="w-4.5 h-4.5 shrink-0" />
            <h5 className="text-xs font-bold uppercase tracking-wide">Giải pháp & Hành động nghiệp vụ Khuyến nghị</h5>
          </div>
          
          <p className="text-xs text-slate-300 font-medium">
            {advice.summary}
          </p>

          <ul className="space-y-2 pt-2 border-t border-indigo-900/30">
            {advice.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-xs text-slate-400">
                <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
