import { Employee, CivilServiceTask, KPIResultSummary } from './types';

// Helper to calculate converted factor: (Point / 5)
export const getConvertedFactor = (task: CivilServiceTask): number => {
  return task.assignedScore / 5;
};

// Helper to calculate a task's Converted Target Qty
export const getConvertedTargetQty = (task: CivilServiceTask): number => {
  return task.targetQuantity * getConvertedFactor(task);
};

// Helper to calculate a task's Converted Actual Qty
export const getConvertedActualQty = (task: CivilServiceTask, type: 'qty' | 'quality' | 'progress'): number => {
  const factor = getConvertedFactor(task);
  if (type === 'qty') return task.actualQtyCount * factor;
  if (type === 'quality') return task.actualQualityCount * factor;
  return task.actualProgressCount * factor;
};

// Calculate all KPI summary scores for an employee
export const calculateKPIResultSummary = (tasks: CivilServiceTask[]): KPIResultSummary => {
  const validTasks = (tasks || []).filter(task => {
    if (!task || !task.mission) return false;
    const m = task.mission.toLowerCase().trim();
    return !(
      m === 'tổng số' || 
      m === 'tổng cộng' || 
      m === 'tổng' || 
      m === 'total' || 
      m.startsWith('tổng số') || 
      m.startsWith('tổng cộng') ||
      m.includes('tổng số') ||
      m.includes('tổng cộng')
    );
  });

  let totalTargetQty = 0;
  let totalTargetConverted = 0;
  
  let totalQtyActual = 0;
  let totalQtyConverted = 0;

  let totalQualityActual = 0;
  let totalQualityConverted = 0;

  let totalProgressActual = 0;
  let totalProgressConverted = 0;

  validTasks.forEach(task => {
    const factor = getConvertedFactor(task);
    
    totalTargetQty += task.targetQuantity;
    totalTargetConverted += task.targetQuantity * factor;

    totalQtyActual += task.actualQtyCount;
    totalQtyConverted += task.actualQtyCount * factor;

    totalQualityActual += task.actualQualityCount;
    totalQualityConverted += task.actualQualityCount * factor;

    totalProgressActual += task.actualProgressCount;
    totalProgressConverted += task.actualProgressCount * factor;
  });

  const qtyKPIPercentage = totalTargetConverted > 0 
    ? (totalQtyConverted / totalTargetConverted) * 100 
    : 100;
  
  const qualityKPIPercentage = totalTargetConverted > 0 
    ? (totalQualityConverted / totalTargetConverted) * 100 
    : 100;

  const progressKPIPercentage = totalTargetConverted > 0 
    ? (totalProgressConverted / totalTargetConverted) * 100 
    : 100;

  const overallTaskPerformanceScore = (qtyKPIPercentage + qualityKPIPercentage + progressKPIPercentage) / 3;
  const finalGradingScore = overallTaskPerformanceScore;

  return {
    totalTargetQty,
    totalTargetConverted,
    totalQtyActual,
    totalQtyConverted,
    qtyKPIPercentage,
    totalQualityActual,
    totalQualityConverted,
    qualityKPIPercentage,
    totalProgressActual,
    totalProgressConverted,
    progressKPIPercentage,
    overallTaskPerformanceScore,
    finalGradingScore
  };
};

// Generate default tasks as shown in the screenshots
export const DEFAULT_CIVIL_TASKS: CivilServiceTask[] = [
  {
    id: 't-1',
    mission: 'Báo cáo định kỳ công tác tháng của Ban chuyên môn',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Báo cáo',
    targetQuantity: 3,
    timeline: 'Hằng tháng',
    note: 'Công việc chuẩn',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 3,
    actualQualityCount: 3,
    actualProgressCount: 3
  },
  {
    id: 't-2',
    mission: 'Báo cáo sơ kết hoạt động nghiệp vụ nửa đầu năm',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: '6 tháng',
    note: 'Nhiệm vụ trọng tâm',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-3',
    mission: 'Tờ trình ban hành Quy chế nội bộ và Quyết định chỉ đạo điều hành',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Tờ trình/Quyết định',
    targetQuantity: 20,
    timeline: 'Theo yêu cầu cấp có thẩm quyền',
    note: 'Trực tiếp chỉ đạo',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 20,
    actualQualityCount: 20,
    actualProgressCount: 20
  },
  {
    id: 't-4',
    mission: 'Tờ trình xin ý kiến triển khai chuyên môn các cấp',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Tờ trình',
    targetQuantity: 50,
    timeline: 'Theo yêu cầu cấp có thẩm quyền',
    note: 'Công việc thường xuyên',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 50,
    actualQualityCount: 50,
    actualProgressCount: 49 // 1 task with delay as shown in screenshot (49/50)
  },
  {
    id: 't-5',
    mission: 'Báo cáo tổng kết công tác năm của chi đoàn bộ phận',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Năm',
    note: 'Đánh giá xếp loại',
    maxScore: 200,
    assignedScore: 180,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-6',
    mission: 'Tờ trình/Công văn hướng dẫn tổ chức Đại hội Công đoàn nhiệm kỳ mới',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Tờ trình/Công văn',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu cấp có thẩm quyền',
    note: 'Hoạt động đoàn thể',
    maxScore: 200,
    assignedScore: 180,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-7',
    mission: 'Báo cáo kiểm điểm kết quả công tác Đảng của Tập thể',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Năm',
    note: 'Đánh giá Đảng bộ',
    maxScore: 200,
    assignedScore: 180,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-8',
    mission: 'Tờ trình/Danh mục sản phẩm chuẩn phục vụ nghiên cứu khoa học',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Tờ trình/Danh mục sản phẩm',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu cấp có thẩm quyền',
    note: 'Hoạt động nghiên cứu',
    maxScore: 400,
    assignedScore: 360,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-9',
    mission: 'Tờ trình/Công văn kiến nghị phương hướng quản lý Ngân sách nhà nước',
    reportingLevel: 'Lãnh đạo đơn vị',
    productName: 'Tờ trình/Công văn',
    targetQuantity: 1,
    timeline: 'Hằng Quý',
    note: 'Nhiệm vụ quản lý',
    maxScore: 400,
    assignedScore: 360,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-10',
    mission: 'Tờ trình/Công văn báo cáo định hướng tư tưởng tư duy cán bộ',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Tờ trình/Công văn',
    targetQuantity: 1,
    timeline: 'Hằng Quý',
    note: 'Công tác chính trị',
    maxScore: 400,
    assignedScore: 360,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-11',
    mission: 'Tờ trình/Công văn gửi báo cáo đề xuất khen thưởng thi đua chi bộ',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Tờ trình/Công văn',
    targetQuantity: 7,
    timeline: 'Theo yêu cầu Đảng ủy Bộ Tài chính',
    note: 'Công tác thi đua',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 7,
    actualQualityCount: 7,
    actualProgressCount: 7
  },
  {
    id: 't-12',
    mission: 'Báo cáo tổng hợp tình hình hoạt động của Đảng viên quý',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 26,
    timeline: 'Theo yêu cầu Đảng ủy Bộ Tài chính',
    note: 'Công tác nhân sự',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 26,
    actualQualityCount: 26,
    actualProgressCount: 26
  },
  {
    id: 't-13',
    mission: 'Công văn phúc đáp chỉ đạo cấp trên trong hệ thống Đảng ủy',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Công văn',
    targetQuantity: 3,
    timeline: 'Theo yêu cầu Đảng ủy Bộ Tài chính',
    note: 'Văn bản hành chính',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 3,
    actualQualityCount: 3,
    actualProgressCount: 3
  },
  {
    id: 't-14',
    mission: 'Nội dung sinh hoạt chuyên đề quý chi bộ Ban Tổ chức',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Nội dung sinh hoạt',
    targetQuantity: 3,
    timeline: 'Theo quy định',
    note: 'Sinh hoạt định kỳ',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 3,
    actualQualityCount: 3,
    actualProgressCount: 3
  },
  {
    id: 't-15',
    mission: 'Chương trình phát triển tài năng trẻ và hỗ trợ đào tạo nghiệp vụ',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Phổ biến triển khai Chi bộ',
    targetQuantity: 2,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Đào tạo nội bộ',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 2,
    actualQualityCount: 2,
    actualProgressCount: 2
  },
  {
    id: 't-16',
    mission: 'Kế hoạch tuyên truyền Ngày Sách và Văn hóa đọc Việt Nam 21/4',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Phổ biến triển khai Chi bộ thực hiện',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Sự kiện văn hóa',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-17',
    mission: 'Báo cáo tổng rà soát an toàn thông tin & bảo mật cơ quan',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'An ninh thông tin',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-18',
    mission: 'Trình triển khai thực hiện và xây dựng Kế hoạch nghiên cứu, học tập, quán triệt và triển khai thực hiện Nghị quyết Hội nghị lần thứ hai, Ban Chấp hành Trung ương Đảng khóa XIV',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Triển khai Nghị quyết',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-19',
    mission: 'Báo cáo sơ kết 05 năm thực hiện Chỉ thị số 04-CT/TW ngày 02/6/2021 của Ban Bí thư',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Sơ kết Chỉ thị',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-20',
    mission: 'Báo cáo về việc thực hiện ứng dụng Sổ tay đảng viên điện tử và thủ tục hành chính của đảng trên môi trường điện tử',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Chuyển đổi số Đảng',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-21',
    mission: 'Triển khai khai thủ tục hành chính của Đảng trên môi trường điện tử',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Công văn',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Ứng dụng công nghệ',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-22',
    mission: 'Báo cáo sơ kết công tác Đảng 6 tháng đầu năm 2026 và phương hướng, nhiệm vụ công tác 6 tháng cuối năm 2026',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Báo cáo',
    targetQuantity: 1,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Kế hoạch công tác',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 1,
    actualQualityCount: 1,
    actualProgressCount: 1
  },
  {
    id: 't-23',
    mission: 'Góp ý các văn bản chỉ đạo hành chính của Đảng ủy cấp trên',
    reportingLevel: 'Bí thư chi bộ',
    productName: 'Công văn',
    targetQuantity: 5,
    timeline: 'Theo yêu cầu của cấp có thẩm quyền',
    note: 'Góp ý văn bản',
    maxScore: 100,
    assignedScore: 90,
    actualQtyCount: 5,
    actualQualityCount: 5,
    actualProgressCount: 5
  }
];


// Presets for Mẫu chấm điểm 1, 2, 3
export const SAMPLE_KPI_TEMPLATES: {
  template1: { name: string; tasks: CivilServiceTask[] };
  template2: { name: string; tasks: CivilServiceTask[] };
  template3: { name: string; tasks: CivilServiceTask[] };
} = {
  template1: {
    name: 'Mẫu chấm điểm 1: Khối Chuyên môn - Nghiệp vụ - Hành chính',
    tasks: [
      {
        id: 'tmpl1-1',
        mission: 'Xây dựng dự thảo tờ trình tham mưu công tác quản lý đầu tư và ngân sách',
        reportingLevel: 'Lãnh đạo đơn vị',
        productName: 'Tờ trình / Dự thảo',
        targetQuantity: 4,
        timeline: 'Hằng tháng',
        note: 'Biểu mẫu 1',
        maxScore: 100,
        assignedScore: 90,
        actualQtyCount: 4,
        actualQualityCount: 4,
        actualProgressCount: 4,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl1-2',
        mission: 'Báo cáo tổng hợp rà soát tiến độ giải ngân vốn đầu tư công bộ phận',
        reportingLevel: 'Trưởng phòng chuyên môn',
        productName: 'Báo cáo chuyên đề',
        targetQuantity: 2,
        timeline: '25 hằng tháng',
        note: 'Biểu mẫu 1',
        maxScore: 100,
        assignedScore: 85,
        actualQtyCount: 2,
        actualQualityCount: 2,
        actualProgressCount: 2,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl1-3',
        mission: 'Thẩm định kỹ thuật hồ sơ thiết kế công trình hạ tầng cơ sở',
        reportingLevel: 'Cơ quan quản lý chuyên ngành',
        productName: 'Văn bản thẩm định',
        targetQuantity: 12,
        timeline: 'Theo yêu cầu công việc',
        note: 'Biểu mẫu 1',
        maxScore: 100,
        assignedScore: 90,
        actualQtyCount: 12,
        actualQualityCount: 11,
        actualProgressCount: 12,
        taskType: 'Phát sinh'
      },
      {
        id: 'tmpl1-4',
        mission: 'Kiểm tra, giám sát thường trực công tác bảo trì hệ thống hạ tầng ban ngành',
        reportingLevel: 'Lãnh đạo đơn vị',
        productName: 'Biên bản kiểm tra',
        targetQuantity: 5,
        timeline: 'Đột xuất',
        note: 'Biểu mẫu 1',
        maxScore: 100,
        assignedScore: 80,
        actualQtyCount: 5,
        actualQualityCount: 5,
        actualProgressCount: 5,
        taskType: 'Đột xuất'
      }
    ]
  },
  template2: {
    name: 'Mẫu chấm điểm 2: Khối Chi bộ - Đảng ủy - Đoàn thể',
    tasks: [
      {
        id: 'tmpl2-1',
        mission: 'Chuẩn bị nội dung và dự thảo Nghị quyết sinh hoạt chuyên đề Chi bộ',
        reportingLevel: 'Chi ủy chi bộ',
        productName: 'Nghị quyết chuyên đề',
        targetQuantity: 1,
        timeline: 'Hằng Quý',
        note: 'Biểu mẫu 2',
        maxScore: 100,
        assignedScore: 95,
        actualQtyCount: 1,
        actualQualityCount: 1,
        actualProgressCount: 1,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl2-2',
        mission: 'Báo cáo kiểm điểm, đánh giá và phân loại chất lượng Đảng viên cuối năm',
        reportingLevel: 'Đảng ủy cấp trên',
        productName: 'Hồ sơ rà soát',
        targetQuantity: 1,
        timeline: 'Đúng hạn quy định',
        note: 'Biểu mẫu 2',
        maxScore: 100,
        assignedScore: 90,
        actualQtyCount: 1,
        actualQualityCount: 1,
        actualProgressCount: 1,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl2-3',
        mission: 'Kế hoạch tuyên truyền, học tập Nghị quyết Trung ương Đảng khóa mới',
        reportingLevel: 'Đảng ủy cơ quan',
        productName: 'Kế hoạch triển khai',
        targetQuantity: 2,
        timeline: 'Trong vòng 15 ngày sau ban hành',
        note: 'Biểu mẫu 2',
        maxScore: 100,
        assignedScore: 85,
        actualQtyCount: 2,
        actualQualityCount: 2,
        actualProgressCount: 2,
        taskType: 'Phát sinh'
      },
      {
        id: 'tmpl2-4',
        mission: 'Thực hiện thủ tục kết nạp Đảng viên mới và bồi dưỡng quần chúng ưu tú',
        reportingLevel: 'Chi ủy chi bộ',
        productName: 'Hồ sơ lý lịch',
        targetQuantity: 3,
        timeline: 'Theo quy trình',
        note: 'Biểu mẫu 2',
        maxScore: 100,
        assignedScore: 80,
        actualQtyCount: 3,
        actualQualityCount: 3,
        actualProgressCount: 3,
        taskType: 'Đột xuất'
      }
    ]
  },
  template3: {
    name: 'Mẫu chấm điểm 3: Khối Hỗ trợ - Kỹ thuật - Công nghệ - Phối hợp',
    tasks: [
      {
        id: 'tmpl3-1',
        mission: 'Quản lý, sao lưu định kỳ cơ sở dữ liệu và vận hành Sổ tay đảng viên điện tử',
        reportingLevel: 'Trung tâm dữ liệu',
        productName: 'Nhật ký vận hành',
        targetQuantity: 30,
        timeline: 'Hằng ngày',
        note: 'Biểu mẫu 3',
        maxScore: 100,
        assignedScore: 90,
        actualQtyCount: 30,
        actualQualityCount: 30,
        actualProgressCount: 30,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl3-2',
        mission: 'Xây dựng module tổng hợp báo cáo tự động hóa chỉ số KPI chi bộ',
        reportingLevel: 'Ban chỉ đạo công nghệ',
        productName: 'Phần mềm / Module',
        targetQuantity: 1,
        timeline: '15/07/2026',
        note: 'Biểu mẫu 3',
        maxScore: 100,
        assignedScore: 95,
        actualQtyCount: 1,
        actualQualityCount: 1,
        actualProgressCount: 1,
        taskType: 'Phát sinh'
      },
      {
        id: 'tmpl3-3',
        mission: 'Hỗ trợ kỹ thuật, khắc phục sự cố máy tính, mạng văn phòng các ban Đảng',
        reportingLevel: 'Cán bộ quản trị mạng',
        productName: 'Yêu cầu xử lý thành công',
        targetQuantity: 15,
        timeline: 'Dưới 2 giờ sau khi nhận tin',
        note: 'Biểu mẫu 3',
        maxScore: 100,
        assignedScore: 80,
        actualQtyCount: 15,
        actualQualityCount: 15,
        actualProgressCount: 14,
        taskType: 'Định kỳ'
      },
      {
        id: 'tmpl3-4',
        mission: 'Phối hợp đơn vị kiểm toán rà soát cơ sở hạ tầng an ninh thông tin',
        reportingLevel: 'Lãnh đạo đơn vị',
        productName: 'Biên bản phối hợp',
        targetQuantity: 2,
        timeline: 'Đột xuất',
        note: 'Biểu mẫu 3',
        maxScore: 100,
        assignedScore: 85,
        actualQtyCount: 2,
        actualQualityCount: 2,
        actualProgressCount: 2,
        taskType: 'Đột xuất'
      }
    ]
  }
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-admin',
    name: 'Đồng chí Quản trị viên',
    role: 'Ủy viên Ban Thường vụ - Quản trị hệ thống',
    department: 'Ban Tổ chức Đảng ủy',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    evaluationPeriod: 'Tháng 07 / Năm 2026',
    username: 'admin@nso.gov.vn',
    password: 'admin123',
    isAdmin: true,
    orgType: 'Lãnh đạo',
    tasks: []
  },
  {
    id: 'emp-leader-1',
    name: 'Đồng chí Lãnh Đạo Trưởng',
    role: 'Trưởng ban',
    department: 'Ban Lãnh Đạo',
    avatar: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?w=150&auto=format&fit=crop&q=80',
    evaluationPeriod: 'Tháng 07 / Năm 2026',
    username: 'truongban',
    password: '123',
    isAdmin: false,
    orgType: 'Ban Lãnh Đạo',
    leadershipRole: 'Trưởng',
    tasks: []
  },
  {
    id: 'emp-leader-2',
    name: 'Đồng chí Lãnh Đạo Phó 1',
    role: 'Phó ban',
    department: 'Ban Lãnh Đạo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    evaluationPeriod: 'Tháng 07 / Năm 2026',
    username: 'phoban1',
    password: '123',
    isAdmin: false,
    orgType: 'Ban Lãnh Đạo',
    leadershipRole: 'Phó',
    tasks: []
  },
  {
    id: 'emp-leader-3',
    name: 'Đồng chí Lãnh Đạo Phó 2',
    role: 'Phó ban',
    department: 'Ban Lãnh Đạo',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    evaluationPeriod: 'Tháng 07 / Năm 2026',
    username: 'phoban2',
    password: '123',
    isAdmin: false,
    orgType: 'Ban Lãnh Đạo',
    leadershipRole: 'Phó',
    tasks: []
  },
  {
    id: 'emp-leader-4',
    name: 'Đồng chí Lãnh Đạo Phó 3',
    role: 'Phó ban',
    department: 'Ban Lãnh Đạo',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    evaluationPeriod: 'Tháng 07 / Năm 2026',
    username: 'phoban3',
    password: '123',
    isAdmin: false,
    orgType: 'Ban Lãnh Đạo',
    leadershipRole: 'Phó',
    tasks: []
  }
];
