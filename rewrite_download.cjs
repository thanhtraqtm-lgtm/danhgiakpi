const fs = require('fs');
let code = fs.readFileSync('src/components/ExcelUploadModal.tsx', 'utf8');

// replace from const downloadTemplate to XLSX.writeFile
const regex = /const downloadTemplate = \([\s\S]*?XLSX\.writeFile\(wb, fileName\);\n  \};/;
const replacement = `const downloadTemplate = (layout?: 'image-based' | 'tracking') => {
    const wb = XLSX.utils.book_new();
    let wsData: any[] = [];
    let fileName = '';

    if (type === 'users') {
      const userHeadersWithOrgType = [...expectedUserHeaders, 'Loại hình'];
      wsData = [
        userHeadersWithOrgType,
        [1, 'Nguyễn Văn A', 'Trưởng phòng', 'CTNE', 'Phòng Kế hoạch Tài chính', 'nvanhhye@nso.nov.vn', '123654', 'Phòng ban'],
        [2, 'Nguyễn Văn B', 'Nhân viên', 'CTNE', 'Đơn vị cơ sở Chi bộ 1', 'nvbinhhye@nso.nov.vn', '123456', 'Đơn vị cơ sở'],
        [3, 'Nguyễn Văn C', 'Trưởng CS', 'CTNE', 'Đơn vị cơ sở Chi bộ 2', 'nvcanhhye@nso.nov.vn', '123654', 'Đơn vị cơ sở']
      ];
      fileName = 'Mau_Danh_Sach_Can_Bo.xlsx';
    } else {
      if (layout === 'image-based') {
        wsData = [
          expectedImageTaskHeaders,
          [
            1,
            'Báo cáo định kỳ công tác tháng của Ban chuyên môn',
            'Lãnh đạo đơn vị',
            'Báo cáo',
            3,
            'Hằng tháng',
            'Công việc chuẩn chỉnh',
            100,
            90,
            '25/07/2026'
          ],
          [
            2,
            'Báo cáo tổng kết công tác năm của chi đoàn bộ phận',
            'Lãnh đạo đơn vị',
            'Báo cáo',
            1,
            'Năm',
            'Đánh giá xếp loại',
            200,
            180,
            '31/12/2026'
          ]
        ];
        fileName = 'Mau_Bao_Cao_Cong_Viec_KPI_Chuan_Mau_Anh.xlsx';
      } else if (layout === 'tracking') {
        wsData = [
          expectedTrackingHeaders,
          [
            1,
            'Tổ chức, triển khai điều tra giá tiêu dùng kỳ 1 tháng 7 năm 2026',
            'Phát sinh',
            'Phạm Xuân Trường',
            '',
            '01/07/2026',
            '01/07/2026',
            'Hoàn thành trễ hạn',
            ''
          ],
          [
            2,
            'Kiểm tra, thanh toán kinh phí tự chủ, điều tra, Tổng điều tra cho các TKCS',
            'Phát sinh',
            'Hoàng Mai Hạnh',
            'Đào Thị Thanh Thảo',
            '06/05/2026',
            '01/07/2026',
            'Hoàn thành',
            ''
          ]
        ];
        fileName = 'Mau_Bang_Theo_Doi_Cong_Viec.xlsx';
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    if (type === 'tasks') {
      const deadlineColIdx = wsData[0].length - 1;
      const colWidths = new Array(wsData[0].length).fill({ wch: 16 });
      colWidths[1] = { wch: 45 };
      colWidths[deadlineColIdx] = { wch: 16 };
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Cong_Viec');
    XLSX.writeFile(wb, fileName);
  };`;
code = code.replace(regex, replacement);
fs.writeFileSync('src/components/ExcelUploadModal.tsx', code);
