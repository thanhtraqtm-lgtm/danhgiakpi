import React, { useState } from 'react';
import { Calculator, MinusCircle, FileText, CheckCircle2, ChevronDown, ChevronRight, Award, Users, Clock, BookOpen, AlertTriangle } from 'lucide-react';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-md shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2 font-bold text-[14px] text-[#1e293b]">
          {icon}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-[#64748b]" /> : <ChevronRight className="w-4 h-4 text-[#64748b]" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
};

export const RulesDocumentViewer = () => {
  return (
    <div className="space-y-4 max-w-[1100px] mx-auto pb-12 p-4">

      {/* Banner thông báo */}
      <div className="bg-[#f0f7fd] border-y border-[#d3e3f1] p-4 flex flex-col gap-1">
        <h3 className="text-[#005b8f] font-bold text-[16px]">Quy chế Đánh giá, Xếp loại Chất lượng Công chức (Từ Quý II/2026)</h3>
        <p className="text-[#006699] text-[13px]">
          Căn cứ: Nghị định số 335/2025/NĐ-CP ngày 21/12/2025 của Chính phủ; Hướng dẫn số 02-HD/BTCTW ngày 22/5/2026 của Ban Tổ chức Trung ương; Công văn số 427/TKT-TCHC của Thống kê tỉnh Hưng Yên.
        </p>
      </div>

      {/* 1. Quy trình 4 bước */}
      <Section title="1. Quy trình Đánh giá Hằng Quý (4 Bước)" icon={<Clock className="w-5 h-5 text-blue-600" />}>
        <div className="space-y-3">
          {[
            {
              step: 'Bước 1', title: 'Xác định mục tiêu, nhiệm vụ, kết quả sản phẩm hằng quý',
              desc: 'Trên cơ sở kế hoạch, chương trình công tác năm, các cá nhân xác định mục tiêu, nhiệm vụ, sản phẩm công việc và kết quả cần đạt của từng quý.',
              color: 'blue',
            },
            {
              step: 'Bước 2', title: 'Cá nhân tự chấm điểm, đánh giá và đề xuất mức xếp loại',
              desc: 'Cuối mỗi quý, cá nhân tự nhận xét, đánh giá; tự chấm điểm theo Bộ tiêu chí kết quả thực hiện nhiệm vụ và đề xuất mức xếp loại theo Mẫu số 01 Phụ lục II (Nghị định 335/2025/NĐ-CP).',
              color: 'green',
            },
            {
              step: 'Bước 3', title: 'Nhận xét, đánh giá và đề xuất mức xếp loại của cấp có thẩm quyền',
              desc: 'Trưởng các đơn vị nhận xét, đề xuất mức xếp loại căn cứ vào tiến độ; chất lượng sản phẩm đầu ra; mức độ khó, phức tạp, phạm vi tác động của từng nhiệm vụ. Đánh giá chất lượng sản phẩm theo 3 mức: (1) Chủ động tiếp cận, giải quyết hiệu quả, có kết quả cụ thể; (2) Cơ bản đáp ứng nhưng còn hạn chế; (3) Không đáp ứng yêu cầu.',
              color: 'orange',
            },
            {
              step: 'Bước 4', title: 'Quyết định mức xếp loại',
              desc: 'Trưởng Thống kê tỉnh quyết định, phê duyệt mức xếp loại theo phân cấp quản lý cán bộ; xem xét điều chuyển cán bộ có vi phạm hoặc không hoàn thành nhiệm vụ (nếu có).',
              color: 'purple',
            },
          ].map((s) => (
            <div key={s.step} className={`border-l-4 pl-4 py-2 ${
              s.color === 'blue' ? 'border-blue-500 bg-blue-50' :
              s.color === 'green' ? 'border-green-500 bg-green-50' :
              s.color === 'orange' ? 'border-orange-500 bg-orange-50' :
              'border-purple-500 bg-purple-50'
            } rounded-r-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  s.color === 'blue' ? 'bg-blue-200 text-blue-800' :
                  s.color === 'green' ? 'bg-green-200 text-green-800' :
                  s.color === 'orange' ? 'bg-orange-200 text-orange-800' :
                  'bg-purple-200 text-purple-800'
                }`}>{s.step}</span>
                <span className="font-semibold text-[13px] text-[#1e293b]">{s.title}</span>
              </div>
              <p className="text-[12px] text-[#475569]">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Công thức tính điểm */}
      <Section title="2. Công thức Tính Điểm Tiêu chí Kết quả Thực hiện Nhiệm vụ" icon={<Calculator className="w-5 h-5 text-indigo-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lãnh đạo quản lý */}
          <div className="border border-indigo-200 rounded-md p-4 bg-indigo-50">
            <h4 className="font-bold text-[13px] text-indigo-800 mb-3 flex items-center gap-1">
              <Users className="w-4 h-4" /> Đối với Công chức Lãnh đạo Quản lý
            </h4>
            <div className="bg-white border border-indigo-200 rounded p-3 text-center mb-3">
              <p className="text-[12px] text-[#475569] mb-1">Điểm tiêu chí kết quả thực hiện nhiệm vụ =</p>
              <p className="text-[16px] font-bold text-indigo-700">( a + b + c + d + đ + e ) ÷ 6</p>
            </div>
            <div className="space-y-1.5 text-[12px]">
              {[
                { k: 'a', desc: '% về số lượng kết quả thực hiện nhiệm vụ (Điều 14.2.a)' },
                { k: 'b', desc: '% về chất lượng kết quả thực hiện nhiệm vụ (Điều 14.2.b)' },
                { k: 'c', desc: '% về tiến độ kết quả thực hiện nhiệm vụ (Điều 14.2.c)' },
                { k: 'd', desc: '% về kết quả hoạt động của lĩnh vực được giao lãnh đạo (Điều 15.3.a)' },
                { k: 'đ', desc: '% về khả năng tổ chức triển khai thực hiện nhiệm vụ (Điều 15.3.b)' },
                { k: 'e', desc: '% về năng lực tập hợp, đoàn kết công chức thuộc phạm vi quản lý (Điều 15.3.c)' },
              ].map(x => (
                <div key={x.k} className="flex gap-2">
                  <span className="font-bold text-indigo-700 w-5 shrink-0">{x.k}:</span>
                  <span className="text-[#475569]">{x.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Công chức không lãnh đạo */}
          <div className="border border-green-200 rounded-md p-4 bg-green-50">
            <h4 className="font-bold text-[13px] text-green-800 mb-3 flex items-center gap-1">
              <Users className="w-4 h-4" /> Đối với Công chức (không giữ chức vụ lãnh đạo)
            </h4>
            <div className="bg-white border border-green-200 rounded p-3 text-center mb-3">
              <p className="text-[12px] text-[#475569] mb-1">Điểm tiêu chí kết quả thực hiện nhiệm vụ =</p>
              <p className="text-[16px] font-bold text-green-700">( a + b + c ) ÷ 3</p>
            </div>
            <div className="space-y-1.5 text-[12px]">
              {[
                { k: 'a', desc: '% về số lượng kết quả thực hiện nhiệm vụ (Điều 14.2.a)' },
                { k: 'b', desc: '% về chất lượng kết quả thực hiện nhiệm vụ (Điều 14.2.b)' },
                { k: 'c', desc: '% về tiến độ kết quả thực hiện nhiệm vụ (Điều 14.2.c)' },
              ].map(x => (
                <div key={x.k} className="flex gap-2">
                  <span className="font-bold text-green-700 w-5 shrink-0">{x.k}:</span>
                  <span className="text-[#475569]">{x.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-green-700 mt-3 italic">* Căn cứ Điều 16 Nghị định số 335/2025/NĐ-CP</p>
          </div>
        </div>
      </Section>

      {/* 3. Hệ số chức vụ */}
      <Section title="3. Hệ số Chức vụ Áp dụng cho Tổng Điểm Sản phẩm" icon={<Calculator className="w-5 h-5 text-orange-500" />}>
        <p className="text-[12px] text-[#64748b] mb-3">
          Điểm công việc = Điểm từng sản phẩm × Hệ số chức vụ × Hệ số quy đổi sản phẩm
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: 'Trưởng Thống kê tỉnh/thành phố', val: '1.8', color: 'bg-red-100 border-red-300 text-red-800' },
            { label: 'Phó Trưởng Thống kê tỉnh', val: '1.6', color: 'bg-orange-100 border-orange-300 text-orange-800' },
            { label: 'Trưởng phòng', val: '1.4', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
            { label: 'Trưởng Thống kê cơ sở', val: '1.3', color: 'bg-lime-100 border-lime-300 text-lime-800' },
            { label: 'Phó Trưởng phòng', val: '1.2', color: 'bg-green-100 border-green-300 text-green-800' },
            { label: 'Phó Trưởng Thống kê cơ sở', val: '1.1', color: 'bg-teal-100 border-teal-300 text-teal-800' },
            { label: 'Công chức (không chức vụ)', val: '1.0', color: 'bg-blue-100 border-blue-300 text-blue-800' },
          ].map(hs => (
            <div key={hs.label} className={`border rounded-sm px-3 py-2.5 flex items-center justify-between gap-2 ${hs.color}`}>
              <span className="text-[12px]">{hs.label}</span>
              <span className="text-[18px] font-bold shrink-0">×{hs.val}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Bảng xếp loại chất lượng */}
      <Section title="4. Mức Xếp loại Chất lượng Công chức (Điều 20 NĐ 335/2025)" icon={<Award className="w-5 h-5 text-yellow-500" />}>
        <div className="overflow-hidden border border-[#e2e8f0] rounded-md mb-4">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#f1f5f9]">
                <th className="px-4 py-2.5 font-bold text-left border-b border-r border-[#e2e8f0]">Mức xếp loại</th>
                <th className="px-4 py-2.5 font-bold text-left border-b border-r border-[#e2e8f0]">Điểm số</th>
                <th className="px-4 py-2.5 font-bold text-left border-b border-[#e2e8f0]">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr className="bg-yellow-50">
                <td className="px-4 py-2.5 font-bold text-yellow-700 border-r border-[#e2e8f0]">🏆 Hoàn thành xuất sắc nhiệm vụ</td>
                <td className="px-4 py-2.5 font-bold text-yellow-700 border-r border-[#e2e8f0]">≥ 90 điểm</td>
                <td className="px-4 py-2.5 text-[12px] text-[#64748b]">Không vượt quá 20% tổng số CC xếp loại "Hoàn thành tốt" trong cùng đơn vị</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-4 py-2.5 font-bold text-green-700 border-r border-[#e2e8f0]">✅ Hoàn thành tốt nhiệm vụ</td>
                <td className="px-4 py-2.5 font-bold text-green-700 border-r border-[#e2e8f0]">70 – 89 điểm</td>
                <td className="px-4 py-2.5 text-[12px] text-[#64748b]"></td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-blue-700 border-r border-[#e2e8f0]">📋 Hoàn thành nhiệm vụ</td>
                <td className="px-4 py-2.5 font-bold text-blue-700 border-r border-[#e2e8f0]">50 – 69 điểm</td>
                <td className="px-4 py-2.5 text-[12px] text-[#64748b]"></td>
              </tr>
              <tr className="bg-red-50">
                <td className="px-4 py-2.5 font-bold text-red-700 border-r border-[#e2e8f0]">❌ Không hoàn thành nhiệm vụ</td>
                <td className="px-4 py-2.5 font-bold text-red-700 border-r border-[#e2e8f0]">&lt; 50 điểm</td>
                <td className="px-4 py-2.5 text-[12px] text-[#64748b]">Hoặc hoàn thành dưới 100% nhiệm vụ được giao trong quý (trừ lý do bất khả kháng)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-[12px] text-amber-800">
          <strong>⚠ Lưu ý:</strong> Cá nhân hoàn thành dưới 100% nhiệm vụ được giao trong quý thì xếp loại "Không hoàn thành nhiệm vụ", trừ trường hợp vì lý do khách quan, bất khả kháng được cấp có thẩm quyền xác nhận (Điểm 7 Công văn 427/TKT-TCHC).
        </div>
      </Section>

      {/* 5. Quy định trừ điểm */}
      <Section title="5. Quy định Trừ điểm và Điều kiện Đặc biệt" icon={<MinusCircle className="w-5 h-5 text-red-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-[13px] text-[#334155] mb-2">Trừ điểm chất lượng & tiến độ:</h4>
            <ul className="space-y-2">
              {[
                'Sai sót lớn về nội dung/chất lượng: Trừ 25% điểm chất lượng/lần.',
                'Không đảm bảo đúng tiến độ: Trừ 25% điểm tiến độ/lần.',
                'Sai sót do nguyên nhân khách quan được cấp có thẩm quyền xem xét miễn trừ.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-[#334155]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[13px] text-[#334155] mb-2">Trường hợp đặc biệt – Người đứng đầu:</h4>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-[12px] text-red-800 space-y-1.5">
              <p>• Tập thể hoàn thành <strong>dưới 70%</strong> các nhiệm vụ/chỉ tiêu được giao → Người đứng đầu xếp loại <strong>"Không hoàn thành nhiệm vụ"</strong>.</p>
              <p>• Cấp phó và thành viên lãnh đạo trong tập thể đó <strong>không được xếp loại "Hoàn thành xuất sắc"</strong>.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 6. Thẩm quyền đánh giá */}
      <Section title="6. Thẩm quyền Theo dõi, Đánh giá" icon={<Users className="w-5 h-5 text-blue-600" />}>
        <div className="space-y-2 text-[12px]">
          {[
            {
              nguoi: 'Trưởng Thống kê tỉnh',
              phamVi: 'Phó Trưởng Thống kê tỉnh, Trưởng phòng, Trưởng Thống kê cơ sở (kể cả Quyền Trưởng), công chức và người lao động toàn đơn vị.',
            },
            {
              nguoi: 'Lãnh đạo Thống kê tỉnh (Phó Trưởng)',
              phamVi: 'Theo dõi, đánh giá, đề nghị xếp loại Trưởng phòng và Trưởng Thống kê cơ sở thuộc đơn vị được giao phụ trách.',
            },
            {
              nguoi: 'Trưởng phòng / Trưởng Thống kê cơ sở',
              phamVi: 'Phó Trưởng phòng / Phó Trưởng Thống kê cơ sở; công chức không giữ chức vụ lãnh đạo và người lao động của đơn vị.',
            },
          ].map((r, i) => (
            <div key={i} className="border border-[#e2e8f0] rounded p-3 flex gap-3">
              <span className="font-bold text-blue-700 min-w-[200px] shrink-0">{r.nguoi}:</span>
              <span className="text-[#475569]">{r.phamVi}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Sử dụng kết quả hằng quý để xếp loại cuối năm */}
      <Section title="7. Sử dụng Kết quả Xếp loại Hằng Quý để Xếp loại Cuối Năm" icon={<Award className="w-5 h-5 text-purple-600" />}>
        <ul className="space-y-2.5 text-[12px]">
          {[
            'Có 01 quý xếp loại "Không hoàn thành nhiệm vụ" → Không được xếp loại "Hoàn thành xuất sắc" cả năm.',
            'Xếp loại cuối năm căn cứ kết quả từng quý + kết quả Quý IV. Ưu tiên cá nhân có nhiều quý được đề xuất "Hoàn thành xuất sắc".',
            'Cán bộ xếp loại "Không hoàn thành nhiệm vụ" từ 02 quý liên tiếp trở lên → Báo cáo Lãnh đạo Thống kê tỉnh để xem xét thay thế, điều chuyển.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-[#334155]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 8. Thời hạn nộp hồ sơ */}
      <Section title="8. Thời hạn Nộp Hồ sơ Đánh giá" icon={<Clock className="w-5 h-5 text-teal-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
          <div className="bg-teal-50 border border-teal-200 rounded p-3">
            <p className="font-bold text-teal-800 mb-1">Thông thường (hằng quý):</p>
            <p className="text-teal-700">Nộp trước ngày <strong>25 tháng cuối quý</strong> (bản giấy + file mềm).</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <p className="font-bold text-orange-800 mb-1">Quý II/2026 (đặc biệt):</p>
            <p className="text-orange-700">Nộp trước ngày <strong>08/7/2026</strong>.</p>
          </div>
        </div>
        <div className="mt-3 text-[12px] text-[#475569]">
          <p className="font-semibold mb-1">Hồ sơ gồm có:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Tờ trình (Phụ lục số 01)</li>
            <li>Báo cáo sản phẩm công việc (Phụ lục số 02)</li>
            <li>Phiếu theo dõi, đánh giá công chức, lao động (Mẫu số 01)</li>
            <li>Các văn bản khác liên quan (nếu có)</li>
          </ul>
          <p className="mt-2">Gửi về: <strong>Phòng Tổ chức - Hành chính</strong> qua email <a href="mailto:tochuchanhchinhhye@nso.gov.vn" className="text-blue-600 underline">tochuchanhchinhhye@nso.gov.vn</a></p>
        </div>
      </Section>

      {/* 9. Danh mục sản phẩm & hệ số quy đổi */}
      <Section title="9. Danh mục Sản phẩm & Hệ số Quy đổi (Trích yếu)" icon={<BookOpen className="w-5 h-5 text-indigo-600" />} defaultOpen={false}>
        <p className="text-[12px] text-[#64748b] mb-3">
          Căn cứ: Bảng tổng hợp danh mục sản phẩm/công việc và hệ số quy đổi về sản phẩm chuẩn của Thống kê tỉnh (tính trên sản phẩm đầu ra thực tế đã phê duyệt).
        </p>

        {/* Phân nhóm */}
        <div className="mb-4">
          <h4 className="font-semibold text-[13px] text-[#334155] mb-2">Phân nhóm công việc và khung điểm:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { nhom: 'Nhóm 1', diem: '100 điểm', heso: '18', vi_du: 'Văn bản HC, sắp xếp lưu trữ, hỗ trợ khai thác...' },
              { nhom: 'Nhóm 2', diem: '200 điểm', heso: '38', vi_du: 'CSDL, kiểm tra logic, xử lý số liệu, văn thư...' },
              { nhom: 'Nhóm 3', diem: '300 điểm', heso: '58', vi_du: 'Báo cáo, kiểm tra, giám sát, điều tra...' },
              { nhom: 'Nhóm 4', diem: '400 điểm', heso: '78', vi_du: 'Điều tra, biểu mẫu, phương pháp luận, BC tài chính...' },
              { nhom: 'Nhóm 5', diem: '500 điểm', heso: '98', vi_du: 'Chương trình/kế hoạch cấp Cục, báo cáo chiến lược...' },
            ].map(g => (
              <div key={g.nhom} className="border border-[#e2e8f0] rounded p-2 text-[11px]">
                <div className="font-bold text-indigo-700">{g.nhom}</div>
                <div className="text-[#1e293b] font-semibold">{g.diem}</div>
                <div className="text-[#64748b]">Hệ số: {g.heso}</div>
                <div className="text-[#94a3b8] mt-1 italic">{g.vi_du}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nhóm I: Lãnh đạo quản lý */}
        <div className="mb-4">
          <h4 className="font-semibold text-[13px] text-[#334155] mb-2 border-l-4 border-blue-500 pl-2">I. LÃNH ĐẠO, QUẢN LÝ</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-[#e2e8f0]">
              <thead className="bg-[#f1f5f9]">
                <tr>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Công việc chi tiết</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Sản phẩm đầu ra</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Nhóm</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-20">Điểm tối đa</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Hệ số QĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  ['Chỉ đạo, kiểm tra, phê duyệt xây dựng và tổ chức thực hiện chương trình, kế hoạch công tác', 'Chương trình/Kế hoạch công tác năm', '5', '500', '98'],
                  ['Chỉ đạo, kiểm tra, phê duyệt báo cáo kết quả thực hiện công tác thống kê trên địa bàn', 'Báo cáo kết quả thực hiện', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo kiểm soát, đánh giá chất lượng số liệu thống kê', 'Báo cáo kiểm soát, đánh giá', '5', '500', '98'],
                  ['Chỉ đạo phối hợp với chính quyền địa phương và các cơ quan liên quan', 'Báo cáo kết quả phối hợp', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt hồ sơ công bố và cung cấp thông tin thống kê', 'Hồ sơ công bố thông tin', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo quản lý, sử dụng và phát triển nguồn nhân lực', 'Báo cáo nhân lực', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo quản lý tài chính, tài sản', 'Báo cáo tài chính, tài sản', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo kết quả cải cách hành chính và chuyển đổi số', 'Báo cáo CCHC & CĐS', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo kiểm tra, giám sát và xử lý sau kiểm tra', 'Báo cáo kiểm tra', '5', '500', '98'],
                  ['Chỉ đạo, phê duyệt báo cáo kết quả xử lý nhiệm vụ đột xuất', 'Báo cáo đột xuất', '5', '500', '98'],
                  ['Soạn thảo văn bản hành chính', 'Văn bản hành chính', '1', '100', '5'],
                ].map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <td className="border border-[#e2e8f0] px-2 py-1">{r[0]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-[#475569]">{r[1]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold text-indigo-700">{r[2]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold">{r[3]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center text-green-700 font-bold">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
            <strong>Hệ số lãnh đạo cho công tác lãnh đạo, chỉ đạo, điều hành:</strong><br />
            Trưởng TK tỉnh: ×1.8 &nbsp;|&nbsp; Phó Trưởng TK tỉnh: ×1.6 &nbsp;|&nbsp; Trưởng phòng: ×1.4 &nbsp;|&nbsp; Phó Trưởng phòng: ×1.2 &nbsp;|&nbsp; Trưởng TK CS: ×1.3 &nbsp;|&nbsp; Phó TK CS: ×1.1
          </div>
        </div>

        {/* Nhóm II: Công tác chuyên môn thống kê */}
        <div className="mb-4">
          <h4 className="font-semibold text-[13px] text-[#334155] mb-2 border-l-4 border-green-500 pl-2">II. CÔNG TÁC CHUYÊN MÔN, NGHIỆP VỤ THỐNG KÊ</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-[#e2e8f0]">
              <thead className="bg-[#f1f5f9]">
                <tr>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Nhóm nhiệm vụ</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Sản phẩm tiêu biểu</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Nhóm</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-20">Điểm tối đa</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Hệ số QĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  ['Thu thập thông tin thống kê', 'Danh mục chỉ tiêu, Danh sách đơn vị, Bộ biểu mẫu, Dữ liệu thô, Báo cáo tiến độ', '1', '100', '18'],
                  ['Xử lý, kiểm tra số liệu (CSDL, chuẩn hóa, kiểm tra logic)', 'CSDL ban đầu, CSDL chuẩn, Báo cáo biến động', '2', '200', '38'],
                  ['Tổ chức điều tra thống kê (Đề cương, Phương án, Phiếu)', 'Đề cương, Phương án, Phiếu điều tra', '3', '300', '58'],
                  ['Thu thập thông tin điều tra thực địa', 'Dữ liệu phiếu điều tra', '4', '400', '78'],
                  ['Biên soạn báo cáo thống kê / công bố số liệu', 'Báo cáo, Bộ số liệu công bố', '3', '300', '58'],
                  ['Phổ biến, cung cấp thông tin thống kê', 'Bộ dữ liệu, Văn bản giải thích', '2', '200', '38'],
                  ['Kiểm tra, giám sát thực hiện chế độ báo cáo', 'Biên bản kiểm tra, Báo cáo tổng hợp', '3', '300', '58'],
                  ['Xây dựng biểu mẫu, phương pháp chế độ thống kê', 'Biểu mẫu, Tài liệu phương pháp', '4', '400', '78'],
                  ['Ứng dụng CNTT, quản lý CSDL thống kê', 'CSDL, Báo cáo bảo mật', '2', '200', '38'],
                  ['Nhiệm vụ khác (đột xuất, tập huấn, phối hợp...)', 'Báo cáo', '2-3', '200–300', '38–58'],
                ].map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <td className="border border-[#e2e8f0] px-2 py-1">{r[0]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-[#475569]">{r[1]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold text-green-700">{r[2]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold">{r[3]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center text-green-700 font-bold">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nhóm III: Chuyên môn hành chính */}
        <div>
          <h4 className="font-semibold text-[13px] text-[#334155] mb-2 border-l-4 border-orange-500 pl-2">III. CÔNG TÁC CHUYÊN MÔN HÀNH CHÍNH (Kế toán, Văn thư, Tổ chức cán bộ, Hành chính)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-[#e2e8f0]">
              <thead className="bg-[#f1f5f9]">
                <tr>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Nhóm nhiệm vụ</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-left">Sản phẩm tiêu biểu</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Nhóm</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-20">Điểm tối đa</th>
                  <th className="border border-[#e2e8f0] px-2 py-1.5 text-center w-16">Hệ số QĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  ['Kế toán – Tiếp nhận, hạch toán, đối chiếu chứng từ', 'Sổ kế toán, CSDL chứng từ', '2', '200', '38'],
                  ['Kế toán – Lập báo cáo tài chính/quyết toán', 'Bộ báo cáo tài chính', '3', '300', '58'],
                  ['Kế toán trưởng – Kiểm soát, phê duyệt, chủ trì BC tài chính', 'Báo cáo tài chính', '4', '400', '78'],
                  ['Văn thư – Tiếp nhận, đăng ký, phát hành, lưu trữ văn bản', 'Sổ văn bản, CSDL văn bản', '2', '200', '38'],
                  ['Văn thư – Số hóa hồ sơ lưu trữ', 'CSDL lưu trữ', '2', '200', '38'],
                  ['Tổ chức cán bộ – Tuyển dụng, điều động, bổ nhiệm, chế độ chính sách', 'Hồ sơ bổ nhiệm, Báo cáo', '3–4', '300–400', '58–78'],
                  ['Hành chính – Kiểm kê tài sản, mua sắm, hậu cần', 'Biên bản kiểm kê, Kế hoạch', '2–3', '200–300', '38–58'],
                  ['Công việc khác / Nhiệm vụ đột xuất', 'Báo cáo tiến độ, Biên bản phối hợp', '3', '300', '58'],
                  ['Đề xuất cải tiến quy trình từ nhiệm vụ phát sinh', 'Báo cáo đề xuất', '4', '400', '78'],
                ].map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <td className="border border-[#e2e8f0] px-2 py-1">{r[0]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-[#475569]">{r[1]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold text-orange-700">{r[2]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center font-bold">{r[3]}</td>
                    <td className="border border-[#e2e8f0] px-2 py-1 text-center text-green-700 font-bold">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-[11px] text-[#94a3b8] text-center pt-2">
        Căn cứ: Nghị định 335/2025/NĐ-CP • Hướng dẫn 02-HD/BTCTW ngày 22/5/2026 • Công văn 427/TKT-TCHC • Bảng Danh mục sản phẩm/Hệ số quy đổi Thống kê tỉnh Hưng Yên
      </div>
    </div>
  );
};
