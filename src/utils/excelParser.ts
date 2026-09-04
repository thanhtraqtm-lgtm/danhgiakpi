import * as XLSX from 'xlsx';


export async function parseExcelFile(file: File, expectedType?: string): Promise<ParsedExcelPreview> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = wb.SheetNames;
  const selectedSheet = sheetNames[0];
  const ws = wb.Sheets[selectedSheet];

  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  
  if (!aoa || aoa.length === 0) {
    throw new Error('File Excel rỗng!');
  }

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const rowStr = aoa[i].join(' ').toLowerCase();
    if (rowStr.includes('stt') || rowStr.includes('tên công việc') || rowStr.includes('nhiệm vụ') || rowStr.includes('họ và tên') || rowStr.includes('người') || rowStr.includes('công việc')) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = aoa[headerRowIdx] || [];
  const headers = rawHeaders.map((h: any) => String(h).trim()).filter(Boolean);

  let fileType: 'users' | 'jobs' | 'deadline' | 'template' | 'unknown' = 'unknown';
  const headerStr = headers.join(' ').toLowerCase();
  if (headerStr.includes('chức vụ') || headerStr.includes('tên đăng nhập')) {
    fileType = 'users';
  } else if (headerStr.includes('nhiệm vụ') && headerStr.includes('hệ số quy đổi')) {
    fileType = 'template';
  } else if (headerStr.includes('tên công việc') || headerStr.includes('hạn hoàn thành') || headerStr.includes('công việc') || headerStr.includes('nhiệm vụ') || headerStr.includes('người chủ trì') || headerStr.includes('đơn vị')) {
    fileType = 'jobs';
  }

  const allRows: Array<Record<string, any>> = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row.some((val: any) => val !== '')) continue;
    
    const rowData: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowData[h] = row[colIdx];
    });
    allRows.push(rowData);
  }

  if (allRows.length === 0) {
    throw new Error('File Excel không tìm thấy dòng dữ liệu nào hợp lệ! (Không nhận diện được dòng tiêu đề).');
  }

  const previewRows = allRows.slice(0, 5);
  return {
    fileName: file.name,
    fileType,
    sheetNames,
    selectedSheet,
    headers,
    previewRows,
    allRows,
    rawBuffer: buffer,
  };
}

export interface ParsedExcelPreview {
  fileName: string;
  fileType: 'users' | 'jobs' | 'deadline' | 'template' | 'unknown';
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  previewRows: Array<Record<string, any>>;
  allRows: Array<Record<string, any>>;
  rawBuffer: ArrayBuffer;
}

/**
 * Downloads standard sample Excel file for Task Catalog & Conversion Factors
 */

const catalogRawData = [
    ['BẢNG TỔNG HỢP DANH MỤC SẢN PHẨM/CÔNG VIỆC VÀ HỆ SỐ QUY ĐỔI VỀ SẢN PHẨM CHUẨN CỦA THỐNG KÊ TỈNH, THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG'],
    [],
    ['STT', 'Nhiệm vụ', 'Công việc chi tiết', 'Sản phẩm đầu ra', 'Phân nhóm', 'Khung điểm tối đa', 'Điểm chấm', 'Hệ số quy đổi', 'Ghi chú'],
["I", "LÃNH ĐẠO, QUẢN LÝ", "", "", "", "", "", "", ""],
["1", "Nhiệm vụ được giao thực hiện", "", "", "", "", "", "", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt xây dựng và tổ chức thực hiện chương trình, kế hoạch công tác", "Chương trình/Kế hoạch công tác năm được phê duyệt và báo cáo kết quả thực hiện", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kết quả thực hiện công tác thống kê trên địa bàn", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kiểm soát, đánh giá chất lượng số liệu thống kê", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt phối hợp với chính quyền địa phương và các cơ quan liên quan", "Báo cáo kết quả phối hợp công tác thống kê trên địa bàn", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Hồ sơ công bố và cung cấp thông tin thống kê theo quy định", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kết quả quản lý, sử dụng và phát triển nguồn nhân lực", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo quản lý tài chính, tài sản và sử dụng nguồn lực", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kết quả cải cách hành chính và chuyển đổi số", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kiểm tra, giám sát và xử lý sau kiểm tra", "5", "500", "490", "98", ""],
["", "", "Chỉ đạo, kiểm tra, rà soát, phê duyệt Chỉ đạo, kiểm tra, rà soát, phê duyệt", "Báo cáo kết quả xử lý nhiệm vụ đột xuất", "5", "500", "490", "98", ""],
["2", "Công tác lãnh đạo, chỉ đạo, điều hành", "", "", "", "", "", "", ""],
["II", "CÔNG TÁC CHUYÊN MÔN, NGHIỆP VỤ THỐNG KÊ", "", "", "", "", "", "", ""],
["", "Thu thập thông tin thống kê", "", "", "", "", "", "", ""],
["", "", "Rà soát hệ thống chỉ tiêu thống kê theo ngành, lĩnh vực được phân công; đối chiếu với danh mục chỉ tiêu hiện hành, xác định rõ nội dung cần thu", "Danh mục chỉ tiêu", "1", "100", "90", "18", ""],
["", "", "Xác định và chuẩn hóa nguồn thông tin (điều tra, báo cáo hành chính); loại bỏ trùng lặp, bảo đảm mỗi chỉ tiêu có nguồn duy nhất, rõ trách", "Danh mục nguồn", "1", "100", "90", "18", ""],
["", "", "Lập danh sách đơn vị điều tra theo ngành, lĩnh vực; kiểm tra đủ đối tượng, không bỏ sót, phân loại theo địa bàn và quy mô", "Danh sách đơn vị", "1", "100", "90", "18", ""],
["", "", "Theo dõi biến động đơn vị (tăng/giảm, thay đổi quy mô); cập nhật kịp thời để bảo đảm dãy số liệu liên tục giữa các kỳ", "DS cập nhật", "1", "100", "90", "18", ""],
["", "", "Phân loại đơn vị theo ngành kinh tế, loại hình và địa bàn; bảo đảm thống nhất mã ngành, mã địa bàn trước khi tổng hợp", "Danh mục phân loại", "1", "100", "90", "18", ""],
["", "", "Triển khai biểu mẫu thu thập; hướng dẫn đơn vị kê khai đúng khái niệm, phạm vi và phương pháp tính chỉ tiêu", "Bộ biểu mẫu", "1", "100", "90", "18", ""],
["", "", "Tiếp nhận dữ liệu; kiểm tra sơ bộ tính đầy đủ (đủ chỉ tiêu), hợp lệ (đúng định dạng, đơn vị tính) trước khi nhập xử lý", "Dữ liệu thô", "1", "100", "90", "18", ""],
["", "", "Theo dõi tiến độ thu thập; lập danh sách đơn vị chậm, sai; đôn đốc, yêu", "Báo cáo tiến độ", "1", "100", "90", "18", ""],
["", "Xử lý, kiểm tra số liệu", "", "", "", "", "", "", ""],
["", "", "Nhập dữ liệu vào hệ thống; kiểm tra trùng lặp, sai định dạng; bảo đảm mỗi đơn vị chỉ có một bản ghi hợp lệ", "CSDL ban đầu", "2", "200", "190", "38", ""],
["", "", "Chuẩn hóa dữ liệu: quy đổi đơn vị tính, mã ngành, mã địa bàn; bảo đảm", "CSDL chuẩn", "2", "200", "190", "38", ""],
["", "", "Kiểm tra tính đầy đủ: đối chiếu danh mục chỉ tiêu với dữ liệu nhận được;", "Báo cáo thiếu", "2", "200", "190", "38", ""],
["", "", "Kiểm tra logic: tổng = thành phần; tỷ trọng hợp lý; số âm, số đột biến bất", "DS sai lệch", "2", "200", "190", "38", ""],
["", "", "So sánh chuỗi thời gian: đối chiếu kỳ này với kỳ trước; xác định biến động vượt ngưỡng (±10% hoặc bất thường)", "Báo cáo biến động", "2", "200", "190", "38", ""],
["", "", "Đối chiếu liên ngành: so với số liệu nguồn hành chính hoặc ngành liên", "Báo cáo đối chiếu", "2", "200", "190", "38", ""],
["", "", "Yêu cầu đơn vị giải trình sai lệch; tổng hợp, đánh giá tính hợp lý của giải", "Biên bản", "2", "200", "190", "38", ""],
["", "", "Hiệu chỉnh và khóa dữ liệu; bảo đảm dữ liệu chính thức phục vụ tổng", "CSDL hoàn chỉnh", "2", "200", "190", "38", ""],
["", "Tổ chức điều tra thống kê", "", "", "", "", "", "", ""],
["", "", "Xây dựng đề cương điều tra; xác định mục tiêu, phạm vi, đối tượng điều", "Đề cương", "3", "300", "290", "58", ""],
["", "", "Xây dựng phương án điều tra; xác định phương pháp chọn mẫu, thu thập", "Phương án", "3", "300", "290", "58", ""],
["", "", "Thiết kế phiếu điều tra; bảo đảm rõ khái niệm, dễ thu thập, dễ tổng hợp", "Phiếu", "3", "300", "290", "58", ""],
["", "", "Lập danh sách đối tượng điều tra; bảo đảm đủ và đúng đối tượng", "Danh sách", "2", "200", "190", "38", ""],
["", "", "Tổ chức tập huấn điều tra viên; hướng dẫn cách hỏi, ghi phiếu, xử lý tình", "Tài liệu", "3", "300", "290", "58", ""],
["", "", "Tổ chức thu thập thông tin", "Dữ liệu phiếu điều tra", "4", "400", "390", "78", ""],
["", "", "Giám sát điều tra; kiểm tra thực địa, đối chiếu thông tin thu thập", "Biên bản", "3", "300", "290", "58", ""],
["", "", "Kiểm tra, nghiệm thu phiếu điều tra; phát hiện sai sót, yêu cầu sửa chữa", "Biên bản nghiệm thu, Thông báo lỗi cần kiểm tra, sửa chữa", "2", "200", "190", "38", ""],
["", "", "Tổng hợp kết quả điều tra; kiểm tra logic trước khi công bố", "Báo cáo", "3", "300", "290", "58", ""],
["", "Biên soạn báo cáo thống kê", "", "", "", "", "", "", ""],
["", "", "Xây dựng đề cương báo cáo; xác định nội dung, chỉ tiêu, bố cục", "Đề cương", "3", "300", "290", "58", ""],
["", "", "Lập hệ thống bảng biểu; bảo đảm liên kết giữa các chỉ tiêu", "Bảng biểu", "3", "300", "290", "58", ""],
["", "", "Biên soạn số liệu vào bảng; kiểm tra khớp đúng giữa các bảng", "Dự thảo", "3", "300", "290", "58", ""],
["", "", "Kiểm tra tính nhất quán giữa báo cáo và dữ liệu gốc", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Tổng hợp nội dung báo cáo; phản ánh đúng tình hình số liệu", "Báo cáo", "4", "400", "390", "78", ""],
["", "", "Cập nhật báo cáo định kỳ; bảo đảm đúng thời gian", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Giải trình số liệu khi có yêu cầu", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Hoàn thiện báo cáo trình duyệt", "Báo cáo chính thức", "4", "400", "390", "78", ""],
["", "Phân tích, dự báo số liệu thống kê", "", "", "", "", "", "", ""],
["", "", "Rà soát, lựa chọn bộ số liệu chính thức theo ngành/lĩnh vực; kiểm tra tính đồng nhất giữa các kỳ trước khi đưa vào phân tích", "Bộ số liệu phân tích", "3", "300", "290", "58", ""],
["", "", "Phân tích xu hướng biến động của chỉ tiêu theo chuỗi thời gian (tốc độ", "Báo cáo phân tích xu hướng", "4", "400", "390", "78", ""],
["", "", "Phân tích cơ cấu và chuyển dịch cơ cấu theo ngành, thành phần kinh tế,", "Báo cáo cơ cấu", "4", "400", "390", "78", ""],
["", "", "Phân tích mối quan hệ giữa các chỉ tiêu (đầu vào – đầu ra, liên ngành)", "Báo cáo phân tích", "4", "400", "390", "78", ""],
["", "", "So sánh số liệu cùng kỳ, kế hoạch, bình quân nhiều năm để đánh giá mức", "Báo cáo so sánh", "4", "400", "390", "78", ""],
["", "", "Phân tích nguyên nhân chủ yếu dẫn đến biến động số liệu (khách quan,", "Báo cáo chuyên sâu", "4", "400", "390", "78", ""],
["", "", "Đánh giá độ tin cậy của số liệu phục vụ phân tích (mức độ đầy đủ, sai số,", "Báo cáo đánh giá", "4", "400", "390", "78", ""],
["", "", "Tổng hợp nhận định, kết luận xu hướng và kiến nghị phục vụ điều hành", "Báo cáo tổng hợp", "4", "400", "390", "78", ""],
["", "Dự báo số liệu thống kê", "", "", "", "", "", "", ""],
["", "", "Rà soát chuỗi số liệu lịch sử theo ngành/lĩnh vực, đánh giá độ tin cậy", "Bộ số liệu chuẩn", "4", "400", "390", "78", ""],
["", "", "Lựa chọn biến đầu vào, xác định các yếu tố tác động chính đến chỉ tiêu", "Tài liệu giả định", "4", "400", "390", "78", ""],
["", "", "Xây dựng mô hình dự báo phù hợp (chuỗi thời gian, xu thế, hồi quy…)", "Mô hình dự báo", "4", "400", "390", "78", ""],
["", "", "Thực hiện dự báo theo các kịch bản (cơ sở, tích cực, tiêu cực)", "Báo cáo dự báo", "4", "400", "390", "78", ""],
["", "", "So sánh kết quả dự báo với thực tế kỳ trước, đánh giá sai lệch", "Báo cáo đánh giá", "4", "400", "390", "78", ""],
["", "", "Phân tích nguyên nhân sai số dự báo, điều chỉnh tham số mô hình", "Báo cáo phân tích", "4", "400", "390", "78", ""],
["", "", "Cập nhật mô hình dự báo theo số liệu mới phát sinh", "Mô hình cập nhật", "4", "400", "390", "78", ""],
["", "", "Tổng hợp kết quả dự báo phục vụ báo cáo lãnh đạo", "Báo cáo tổng hợp", "4", "400", "390", "78", ""],
["", "Công bố thông tin thống kê", "", "", "", "", "", "", ""],
["", "", "Rà soát danh mục chỉ tiêu công bố theo quy định và kế hoạch công bố", "Danh mục công bố", "3", "300", "290", "58 ", ""],
["", "", "Kiểm tra số liệu trước công bố (logic, nhất quán giữa các biểu)", "Báo cáo kiểm tra", "3", "300", "290", "58", ""],
["", "", "Đối chiếu số liệu với kỳ trước và nguồn liên quan trước khi công bố", "Báo cáo đối chiếu", "3", "300", "290", "58", ""],
["", "", "Biên soạn thông cáo báo chí, bảo đảm phản ánh đúng xu hướng số liệu", "Thông cáo", "3", "300", "290", "58", ""],
["", "", "Công bố số liệu thống kê theo đúng thời gian và hình thức quy định", "Bộ số liệu công bố", "3", "300", "290", "58", ""],
["", "", "Cập nhật số liệu đã công bố lên hệ thống thông tin thống kê", "CSDL công bố", "2", "200", "190", "38", ""],
["", "", "Theo dõi, tổng hợp phản hồi sau công bố, xử lý sai sót (nếu có)", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Lưu trữ, quản lý hồ sơ công bố thông tin thống kê", "Hồ sơ", "2", "200", "190", "38", ""],
["", "Phổ biến, cung cấp thông tin", "", "", "", "", "", "", ""],
["", "", "Tiếp nhận và phân loại yêu cầu khai thác thông tin thống kê", "Phiếu yêu cầu", "2", "200", "190", "38", ""],
["", "", "Xác định phạm vi dữ liệu cần cung cấp, bảo đảm phù hợp quy định", "Tài liệu xác định", "2", "200", "190", "38", ""],
["", "", "Trích xuất dữ liệu từ hệ thống, kiểm tra tính đầy đủ trước khi cung cấp", "Bộ dữ liệu", "2", "200", "190", "38", ""],
["", "", "Đối chiếu dữ liệu cung cấp với số liệu đã công bố chính thức", "Báo cáo đối chiếu", "3", "300", "290", "58", ""],
["", "", "Cung cấp thông tin thống kê cho tổ chức, cá nhân theo quy định", "Bộ dữ liệu", "2", "200", "190", "38", ""],
["", "", "Giải thích nội dung, phương pháp tính chỉ tiêu thống kê", "Văn bản giải thích", "3", "300", "290", "58", ""],
["", "", "Tổng hợp nhu cầu khai thác thông tin theo lĩnh vực", "Báo cáo tổng hợp", "3", "300", "290", "58", ""],
["", "", "Lưu trữ hồ sơ cung cấp thông tin thống kê", "Hồ sơ", "2", "200", "190", "38", ""],
["", "Kiểm tra, giám sát", "", "", "", "", "", "", ""],
["", "", "Xây dựng kế hoạch kiểm tra việc thực hiện chế độ báo cáo thống kê", "Kế hoạch", "3", "300", "290", "58", ""],
["", "", "Chuẩn bị nội dung, tài liệu kiểm tra theo ngành/lĩnh vực", "Hồ sơ kiểm tra", "3", "300", "290", "58", ""],
["", "", "Thực hiện kiểm tra tại đơn vị, đối chiếu số liệu với hồ sơ gốc", "Biên bản kiểm tra", "3", "300", "290", "58", ""],
["", "", "Đánh giá chất lượng số liệu thống kê sau kiểm tra", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Phát hiện, tổng hợp sai sót trong thực hiện chế độ báo cáo", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Kiến nghị biện pháp xử lý, khắc phục sai sót", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Theo dõi việc thực hiện kết luận kiểm tra", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Tổng hợp kết quả kiểm tra toàn ngành/lĩnh vực", "Báo cáo tổng hợp", "3", "300", "290", "58", ""],
["", "Phương pháp chế độ", "", "", "", "", "", "", ""],
["", "", "Rà soát hệ thống chỉ tiêu thống kê theo ngành/lĩnh vực", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Xây dựng, hoàn thiện biểu mẫu thống kê", "Biểu mẫu", "4", "400", "390", "78", ""],
["", "", "Xây dựng tài liệu hướng dẫn nghiệp vụ thống kê", "Tài liệu", "3", "300", "290", "58", ""],
["", "", "Chuẩn hóa khái niệm, nội dung, phương pháp tính chỉ tiêu", "Tài liệu", "4", "400", "390", "78", ""],
["", "", "Tham gia xây dựng chế độ báo cáo thống kê", "Văn bản", "4", "400", "390", "78", ""],
["", "", "Cập nhật phương pháp luận thống kê mới", "Báo cáo", "4", "400", "390", "78", ""],
["", "", "Tổ chức hướng dẫn áp dụng phương pháp thống kê", "Tài liệu", "3", "300", "290", "58", ""],
["", "", "Đánh giá hiệu quả áp dụng phương pháp", "Báo cáo", "4", "400", "390", "78", ""],
["", "Ứng dụng công nghệ thông tin", "", "", "", "", "", "", ""],
["", "", "Quản lý cơ sở dữ liệu thống kê theo ngành/lĩnh vực", "CSDL", "2", "200", "190", "38", ""],
["", "", "Kiểm tra tính toàn vẹn, nhất quán dữ liệu", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Chuẩn hóa cấu trúc dữ liệu phục vụ khai thác", "CSDL chuẩn", "3", "300", "290", "58", ""],
["", "", "Sao lưu dữ liệu định kỳ", "Dữ liệu", "2", "200", "190", "38", ""],
["", "", "Bảo mật dữ liệu thống kê theo quy định", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Hỗ trợ khai thác dữ liệu thống kê", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Cập nhật hệ thống phần mềm thống kê", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Xử lý sự cố dữ liệu, hệ thống", "Báo cáo", "3", "300", "290", "58", ""],
["", "Nhiệm vụ khác", "", "", "", "", "", "", ""],
["", "", "Thực hiện nhiệm vụ đột xuất theo chỉ đạo", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Tham gia phối hợp liên ngành trong thu thập, xử lý số liệu", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Tham gia hội nghị, tập huấn nghiệp vụ thống kê", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Tổng hợp báo cáo nội bộ phục vụ quản lý", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Thực hiện nhiệm vụ do lãnh đạo phân công", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Đề xuất cải tiến quy trình nghiệp vụ thống kê", "Báo cáo", "4", "400", "390", "78", ""],
["", "", "Tham gia xây dựng kế hoạch công tác thống kê", "Kế hoạch", "3", "300", "290", "58", ""],
["", "", "Tổng hợp đánh giá kết quả thực hiện nhiệm vụ", "Báo cáo", "3", "300", "290", "58", ""],
["III", "CÔNG TÁC CHUYÊN MÔN KHÁC", "", "", "", "", "", "", ""],
["", "Kế toán", "", "", "", "", "", "", ""],
["", "", "Tiếp nhận chứng từ; kiểm tra chữ ký, nội dung chi, định mức, nguồn kinh phí; đối chiếu với dự toán được giao; lập danh sách chứng từ sai để yêu", "Danh mục chứng từ hợp lệ/không hợp lệ", "2", "200", "190", "38 ", ""],
["", "", "Hạch toán nghiệp vụ vào phần mềm; lựa chọn đúng tài khoản, mục lục NSNN; kiểm tra cân đối phát sinh Nợ – Có sau khi nhập", "Sổ kế toán chi tiết", "2", "200", "190", "38", ""],
["", "", "Đối chiếu số liệu giữa sổ kế toán và chứng từ; phát hiện chênh lệch; xác định nguyên nhân và lập bút toán điều chỉnh", "Biên bản đối chiếu", "3", "300", "290", "58", ""],
["", "", "Theo dõi dự toán: cập nhật số đã chi theo từng khoản; so với dự toán", "Bảng theo dõi dự toán", "2", "200", "190", "38", ""],
["", "", "Lập báo cáo tài chính/quyết toán; kiểm tra khớp đúng giữa các biểu; rà soát số liệu bất thường trước khi trình ký", "Bộ báo cáo tài chính", "3", "300", "290", "58", ""],
["", "", "Kiểm tra hồ sơ thanh toán; đối chiếu khối lượng, định mức; từ chối hồ sơ", "Hồ sơ thanh toán hợp lệ", "2", "200", "190", "38", ""],
["", "", "Sắp xếp, lưu trữ chứng từ theo thời gian và nội dung; lập mục lục hồ sơ", "Hồ sơ kế toán", "1", "100", "90", "18", ""],
["", "", "Chuẩn bị hồ sơ giải trình; đối chiếu số liệu khi thanh tra, kiểm toán; lập", "Báo cáo giải trình", "3", "300", "290", "58", ""],
["", "", "Lập dự toán kinh phí các cuộc điều tra, tổng điều tra, dự toán lương và", "Dự toán", "2", "200", "190", "38", ""],
["", "", "Thực hiện các nghiệp vụ phát sinh về Thuế thu nhập cá nhân đối với công chức, người lao động và điều tra viên, quyết toán thuế TNCN theo", "Kê khai thuế, báo cáo quyết toán thuế", "2", "200", "190", "38", ""],
["", "", "Thực hiện khai báo tăng/giảm, các báo cáo về bảo hiểm (BHXH, BHYT,", "Khai báo, đối chiếu", "2", "200", "190", "38", ""],
["", "", "Dự thảo một số Quy chế", "Quy chế", "3", "300", "290", "58", ""],
["", "Kế toán trưởng", "", "", "", "", "", "", ""],
["", "", "Tổ chức kiểm soát chứng từ trước hạch toán; rà soát sai sót định mức, nguồn chi; yêu cầu chỉnh sửa trước khi ghi sổ", "Báo cáo kiểm soát", "3", "300", "290", "58", ""],
["", "", "Kiểm tra, phê duyệt số liệu kế toán; đối chiếu giữa sổ chi tiết – tổng hợp", "Báo cáo kiểm tra", "3", "300", "290", "58", ""],
["", "", "Chủ trì lập báo cáo tài chính; rà soát toàn bộ chỉ tiêu; xử lý số liệu bất", "Báo cáo tài chính", "4", "400", "390", "78", ""],
["", "", "Kiểm soát thực hiện dự toán; phân tích chênh lệch giữa dự toán và thực", "Báo cáo phân tích", "3", "300", "290", "58", ""],
["", "", "Hướng dẫn nghiệp vụ; kiểm tra việc chấp hành chế độ kế toán tại đơn vị", "Tài liệu + biên bản", "3", "300", "290", "58", ""],
["", "", "Làm việc với kiểm toán; chuẩn bị hồ sơ; giải trình số liệu", "Hồ sơ + báo cáo", "4", "400", "390", "78", ""],
["", "", "Đề xuất biện pháp quản lý tài chính; kiểm soát rủi ro chi sai", "Báo cáo đề xuất", "4", "400", "390", "78", ""],
["", "", "Kiểm tra việc lưu trữ chứng từ; bảo đảm đầy đủ, đúng quy định", "Báo cáo kiểm tra", "2", "200", "190", "38", ""],
["", "Văn thư, lưu trữ", "", "", "", "", "", "", ""],
["", "", "Tiếp nhận văn bản; kiểm tra thể thức, số trang, chữ ký; phân loại theo", "Sổ văn bản đến", "2", "200", "190", "38", ""],
["", "", "Đăng ký văn bản vào hệ thống; cập nhật đầy đủ thông tin; kiểm tra trùng", "CSDL văn bản", "2", "200", "190", "38", ""],
["", "", "Trình lãnh đạo phê duyệt xử lý văn bản; ghi rõ đơn vị xử lý; theo dõi tiến", "Phiếu trình", "2", "200", "190", "38", ""],
["", "", "Soạn thảo, phát hành văn bản; kiểm tra thể thức, căn cứ pháp lý trước", "Văn bản đi", "2", "200", "190", "38", ""],
["", "", "Quản lý con dấu; kiểm tra thẩm quyền trước khi đóng dấu; ghi sổ theo", "Sổ đóng dấu", "2", "200", "190", "38", ""],
["", "", "Lưu trữ văn bản; phân loại theo hồ sơ; kiểm tra đủ thành phần hồ sơ", "Hồ sơ văn bản", "1", "100", "90", "18", ""],
["", "", "Theo dõi văn bản đến hạn; lập danh sách quá hạn; đôn đốc xử lý", "Báo cáo tiến độ", "2", "200", "190", "38", ""],
["", "", "Trích xuất, cung cấp văn bản; kiểm tra quyền truy cập trước khi cung cấp", "Hồ sơ cung cấp", "2", "200", "190", "38", ""],
["", "", "Tiếp nhận hồ sơ; kiểm tra đủ thành phần; lập biên bản bàn giao", "Hồ sơ tiếp nhận", "2", "200", "190", "38", ""],
["", "", "Phân loại hồ sơ theo phông, mục lục; chuẩn hóa ký hiệu hồ sơ", "Danh mục hồ sơ", "2", "200", "190", "38", ""],
["", "", "Lập công cụ tra cứu; kiểm tra khả năng truy xuất hồ sơ nhanh", "Mục lục hồ sơ", "2", "200", "190", "38", ""],
["", "", "Kiểm tra điều kiện bảo quản; phát hiện ẩm mốc, hư hỏng; xử lý kịp thời", "Báo cáo bảo quản", "2", "200", "190", "38", ""],
["", "", "Cung cấp hồ sơ; kiểm tra thẩm quyền người yêu cầu; ghi nhận việc khai", "Sổ khai thác", "2", "200", "190", "38", ""],
["", "", "Xác định giá trị tài liệu; lập danh mục tiêu hủy; trình phê duyệt", "Danh mục", "3", "300", "290", "58", ""],
["", "", "Tổ chức tiêu hủy tài liệu; lập biên bản; bảo đảm đúng quy định", "Biên bản", "3", "300", "290", "58", ""],
["", "", "Số hóa hồ sơ; kiểm tra dữ liệu số hóa đầy đủ, không lỗi", "CSDL lưu trữ", "2", "200", "190", "38", ""],
["", "", "Công tác thi đua khen thưởng", "Hồ sơ", "3", "300", "290", "58", ""],
["", "Tổ chức cán bộ", "", "", "", "", "", "", ""],
["", "", "Rà soát hồ sơ cán bộ; kiểm tra đủ thành phần; cập nhật biến động", "Hồ sơ cán bộ", "2", "200", "190", "38", ""],
["", "", "Xây dựng kế hoạch biên chế; đối chiếu với nhu cầu thực tế", "Kế hoạch", "3", "300", "290", "58", ""],
["", "", "Thực hiện quy trình tuyển dụng/điều động; kiểm tra đủ điều kiện", "Hồ sơ", "3", "300", "290", "58", ""],
["", "", "Đánh giá cán bộ; tổng hợp kết quả; kiểm tra tính khách quan", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Thực hiện bổ nhiệm; rà soát tiêu chuẩn, quy trình", "Hồ sơ bổ nhiệm", "4", "400", "390", "78", ""],
["", "", "Thực hiện chế độ chính sách; kiểm tra điều kiện hưởng", "Hồ sơ", "3", "300", "290", "58", ""],
["", "", "Tổng hợp báo cáo nhân sự; kiểm tra số liệu trước trình", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Lưu trữ hồ sơ; bảo mật thông tin cán bộ", "Hồ sơ", "2", "200", "190", "38", ""],
["", "Hành chính, văn phòng", "", "", "", "", "", "", ""],
["", "", "Lập sổ theo dõi tài sản; cập nhật tăng/giảm; đối chiếu với thực tế sử dụng", "Sổ tài sản", "2", "200", "190", "38", ""],
["", "", "Tổ chức kiểm kê tài sản định kỳ; đối chiếu sổ sách – thực tế; lập biên bản", "Biên bản kiểm kê", "3", "300", "290", "58", ""],
["", "", "Lập kế hoạch mua sắm; tổng hợp nhu cầu; kiểm tra tính cần thiết trước", "Kế hoạch", "3", "300", "290", "58", ""],
["", "", "Theo dõi cấp phát tài sản; kiểm tra sử dụng đúng mục đích", "Danh mục cấp phát", "2", "200", "190", "38 ", ""],
["", "", "Tổ chức hậu cần; chuẩn bị phòng họp, tài liệu; kiểm tra điều kiện trước", "Biên bản", "2", "200", "190", "38", ""],
["", "", "Kiểm tra sử dụng tài sản công; phát hiện sai mục đích; đề xuất xử lý", "Báo cáo", "3", "300", "290", "58", ""],
["", "", "Theo dõi điện, nước, văn phòng phẩm; đối chiếu mức sử dụng; phát hiện", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Lưu trữ hồ sơ hành chính; lập mục lục hồ sơ", "Hồ sơ", "1", "100", "90", "18", ""],
["", "", "Báo cáo sơ kết, tổng kết", "Báo cáo", "2", "200", "190", "38", ""],
["", "", "Dự thảo một số Quy chế", "Quy chế", "3", "300", "290", "58", ""],
["", "", "Công tác tự vệ, phòng cháy chữa cháy (xây dựng kế hoạch, thực hiện các", "Kế hoạch/báo cáo", "2", "200", "190", "38", ""],
["", "", "Báo cáo sơ kết, tổng kết", "Báo cáo", "2", "200", "190", "38", ""],
["", "Công việc khác", "", "", "", "", "", "", ""],
["", "", "Tiếp nhận nhiệm vụ phát sinh theo chỉ đạo; xác định rõ nội dung công việc, phạm vi, thời hạn; lập kế hoạch thực hiện cụ thể trước khi triển khai", "Kế hoạch thực hiện", "3", "300", "290", "58", ""],
["", "", "Thu thập, rà soát hồ sơ, tài liệu liên quan đến nhiệm vụ phát sinh; kiểm tra tính đầy đủ, hợp lệ trước khi xử lý", "Bộ hồ sơ", "2", "200", "190", "38", ""],
["", "", "Tổ chức thực hiện nhiệm vụ phát sinh; theo dõi tiến độ, cập nhật tình hình xử lý theo từng bước công việc", "Báo cáo tiến độ", "3", "300", "290", "58", ""],
["", "", "Kiểm tra kết quả thực hiện nhiệm vụ; đối chiếu với yêu cầu ban đầu; phát hiện sai sót và điều chỉnh kịp thời", "Báo cáo kiểm tra", "3", "300", "290", "58", ""],
["", "", "Tổng hợp kết quả thực hiện; lập báo cáo chi tiết về nội dung, tiến độ, kết", "Báo cáo tổng hợp", "3", "300", "290", "58", ""],
["", "", "Phối hợp với các bộ phận liên quan để xử lý nhiệm vụ phát sinh; kiểm tra trách nhiệm từng bên và kết quả phối hợp", "Biên bản phối hợp", "3", "300", "290", "58", ""],
["", "", "Xử lý các tình huống phát sinh đột xuất (sai sót hồ sơ, sự cố hành chính…); xác định nguyên nhân và biện pháp khắc phục", "Báo cáo xử lý", "3", "300", "290", "58", ""],
["", "", "Đề xuất giải pháp cải tiến quy trình từ các nhiệm vụ phát sinh; tổng hợp bài học kinh nghiệm để áp dụng lâu dài", "Báo cáo đề xuất", "4", "400", "390", "78 ", ""],

  ];

export function downloadSampleCatalogExcel() {
  const ws = XLSX.utils.aoa_to_sheet(catalogRawData);

  // Set column widths
  const wscols = [
    { wch: 5 },  // STT
    { wch: 40 }, // Nhiệm vụ
    { wch: 60 }, // Công việc chi tiết
    { wch: 40 }, // Sản phẩm đầu ra
    { wch: 10 }, // Phân nhóm
    { wch: 15 }, // Khung điểm
    { wch: 15 }, // Điểm chấm
    { wch: 15 }, // Hệ số quy đổi
    { wch: 20 }, // Ghi chú
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhMucCongViec_HeSoQuyDoi');
  XLSX.writeFile(wb, 'Mau_Danh_Muc_Cong_Viec_Va_He_So_Quy_Doi.xlsx');
}




export const defaultCatalogItems = catalogRawData.slice(3).map((row, index) => {
  const getCell = (idx) => String(row[idx] || '').trim();
  let stt = getCell(0);
  let taskGroup = getCell(1);
  let detailTask = getCell(2);
  let outputProduct = getCell(3);
  let categoryGroupStr = getCell(4);
  let maxScoreStr = getCell(5);
  let evaluatedScoreStr = getCell(6);
  let conversionFactorStr = getCell(7);
  let notes = getCell(8);

  const parseNumeric = (val, defaultVal) => {
    if (typeof val === 'number') return val;
    if (!val) return defaultVal;
    const str = String(val).replace(',', '.');
    const match = str.match(/-?\d+(\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? defaultVal : num;
    }
    return defaultVal;
  };

  const categoryGroup = parseNumeric(categoryGroupStr, 1);
  const maxScore = parseNumeric(maxScoreStr, 100);
  const evaluatedScore = parseNumeric(evaluatedScoreStr, 90);
  let conversionFactor = parseNumeric(conversionFactorStr, 1);

  return {
    id: 'default_' + index,
    stt: stt || String(index + 1),
    taskGroup: taskGroup,
    detailTask: detailTask || outputProduct,
    outputProduct: outputProduct || detailTask,
    categoryGroup,
    maxScore,
    evaluatedScore,
    conversionFactor,
    notes
  };
}).filter(item => item.detailTask || item.outputProduct || item.taskGroup);

// To fix empty taskGroups (they should inherit)
let currentGroup = 'Nhiệm vụ chung';
defaultCatalogItems.forEach(item => {
    if (item.taskGroup && item.taskGroup.length > 5) {
        currentGroup = item.taskGroup;
    } else if (!item.taskGroup) {
        item.taskGroup = currentGroup;
    }
});

