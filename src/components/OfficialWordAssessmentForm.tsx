import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  UploadCloud, 
  Printer, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  User as UserIcon, 
  Building2, 
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  Send
} from 'lucide-react';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableCell, 
  TableRow, 
  TextRun, 
  AlignmentType, 
  WidthType, 
  BorderStyle 
} from 'docx';
import { User, SelfAssessmentDoc, SelfEvalCriterion, EvaluationPeriodConfig, CLASSIFICATION_OPTIONS } from '../types';
import { evaluateOverallKPI, EvaluationResult } from '../utils/kpiLogic';

interface OfficialWordAssessmentFormProps {
  users: User[];
  currentUser?: User | null;
  selectedDepartment?: string;
  periodConfig?: EvaluationPeriodConfig;
  submissions?: any[];
  tasks?: any[];
  docs?: SelfAssessmentDoc[];
  onSaveDoc?: (doc: Omit<SelfAssessmentDoc, 'id'>) => void;
  onSubmitWorkflow?: (sub: any) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

export const OfficialWordAssessmentForm: React.FC<OfficialWordAssessmentFormProps> = ({
  users = [],
  currentUser,
  selectedDepartment,
  periodConfig,
  submissions = [],
  tasks = [],
  docs = [],
  onSaveDoc,
  onSubmitWorkflow,
  addToast
}) => {
  // Main Header State
  const [provinceUnit, setProvinceUnit] = useState('THỐNG KÊ TỈNH HƯNG YÊN');
  const [departmentUnit, setDepartmentUnit] = useState(currentUser?.department?.toUpperCase() || '');
  const [quarterName, setQuarterName] = useState(`Tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`);

  // Employee Information
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [positionTitle, setPositionTitle] = useState(currentUser?.position || '');
  const [workUnit, setWorkUnit] = useState(currentUser?.department || '');

  // Department & Staff Filtering Logic
  const [selectedDept, setSelectedDept] = useState<string>(
    selectedDepartment && selectedDepartment !== 'ALL' ? selectedDepartment : (currentUser?.department || 'ALL')
  );

  const availableDepts = useMemo(() => {
    return Array.from(new Set((users || []).map((u) => u.department).filter(Boolean)));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!selectedDept || selectedDept === 'ALL') {
      return users || [];
    }
    const matches = (users || []).filter((u) => u.department === selectedDept);
    return matches.length > 0 ? matches : (users || []);
  }, [users, selectedDept]);

  // Determine Department Head / Approver dynamically based on current staff's department
  const approverInfo = useMemo(() => {
    const targetDept = workUnit || currentUser?.department || (selectedDept !== 'ALL' ? selectedDept : '');
    
    const isHeadOfUnit = (u?: User | null) => {
      if (!u) return false;
      const pos = (u.position || '').toLowerCase().trim();
      if (pos.includes('phó') || pos.includes('pho')) return false;
      return (
        u.role === 'DEPT_HEAD' ||
        pos.includes('trưởng') ||
        pos.includes('chi cục trưởng') ||
        pos.includes('phụ trách') ||
        pos.includes('đội trưởng') ||
        pos.includes('q.') ||
        pos.includes('quyền')
      );
    };

    // Check if the current user being evaluated is a Dept Head or Province Leader
    const currentStaffObj = (users || []).find((u) => u.fullName === fullName) || currentUser;
    const isDeptHead = isHeadOfUnit(currentStaffObj);

    if (isDeptHead || currentStaffObj?.role === 'PROVINCE_LEADER') {
      const leader = (users || []).find((u) => u.role === 'PROVINCE_LEADER' || u.department === 'Lãnh đạo');
      return {
        title: 'LÃNH ĐẠO CƠ QUAN PHÊ DUYỆT',
        roleLabel: 'Lãnh đạo cơ quan',
        name: leader ? leader.fullName : 'Lãnh đạo Cục Thống kê',
        isLeader: true
      };
    }

    const isCoSo = (targetDept || '').toLowerCase().includes('thống kê cơ sở') || (targetDept || '').toLowerCase().includes('cơ sở');
    const defaultTitle = isCoSo ? 'TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : 'TRƯỞNG PHÒNG PHÊ DUYỆT';
    const defaultRoleLabel = isCoSo ? 'Trưởng Thống kê cơ sở' : 'Trưởng phòng';

    // Normal staff: Look up the Department Head in that specific department (including Q. Trưởng Thống kê cơ sở)
    const deptHead = (users || []).find((u) => 
      u.department === targetDept && isHeadOfUnit(u)
    );

    if (deptHead) {
      return {
        title: isCoSo ? 'TRƯỞNG THỐNG KÊ CƠ SỞ PHÊ DUYỆT' : (deptHead.position ? `${deptHead.position.toUpperCase()} PHÊ DUYỆT` : defaultTitle),
        roleLabel: deptHead.position || defaultRoleLabel,
        name: deptHead.fullName,
        isLeader: false
      };
    }

    // Fallback: search for any other person in department or leader
    const fallbackUser = (users || []).find((u) => u.department === targetDept && u.fullName !== fullName);
    if (fallbackUser) {
      return {
        title: defaultTitle,
        roleLabel: defaultRoleLabel,
        name: fallbackUser.fullName,
        isLeader: false
      };
    }

    return {
      title: defaultTitle,
      roleLabel: defaultRoleLabel,
      name: targetDept ? (isCoSo ? `Trưởng ${targetDept}` : `Trưởng phòng ${targetDept}`) : `(Chưa có thông tin ${defaultRoleLabel})`,
      isLeader: false
    };
  }, [users, workUnit, currentUser, selectedDept, fullName]);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPositionTitle(currentUser.position || currentUser.title || 'Thống kê viên');
      setWorkUnit(currentUser.department || '');
      setDepartmentUnit(currentUser.department ? currentUser.department.toUpperCase() : '');
      setSelectedDept(currentUser.department || 'ALL');
    } else if (selectedDepartment && selectedDepartment !== 'ALL') {
      setSelectedDept(selectedDepartment);
      const matches = (users || []).filter((u) => u.department === selectedDepartment);
      if (matches.length > 0) {
        setFullName(matches[0].fullName);
        setPositionTitle(matches[0].position || matches[0].title || 'Thống kê viên');
        setWorkUnit(matches[0].department || selectedDepartment);
        setDepartmentUnit(selectedDepartment.toUpperCase());
      } else {
        setDepartmentUnit(selectedDepartment.toUpperCase());
      }
    } else {
      setDepartmentUnit('');
      setWorkUnit('');
    }
  }, [selectedDepartment, users, currentUser]);

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    if (dept !== 'ALL') {
      setWorkUnit(dept);
      setDepartmentUnit(dept.toUpperCase());
    } else {
      setWorkUnit('');
      setDepartmentUnit('');
    }
    const matches = dept === 'ALL' ? (users || []) : (users || []).filter((u) => u.department === dept);
    if (matches.length > 0) {
      handleSelectUser(matches[0].fullName);
    }
  };

  // Sections & Criteria Scoring with strict benchmark clamping
  const clampScoreValue = (valStr: string | number, maxVal: number): number => {
    if (valStr === '' || valStr === undefined || valStr === null) return 0;
    const normalized = String(valStr).replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return 0;
    if (parsed < 0) return 0;
    if (parsed > maxVal) return maxVal;
    return Number(parsed.toFixed(1));
  };

  // Section I: Criteria Scores (30 Points Max) - Initialized to 0 so user enters their own numbers
  // Category I (10 pts)
  const [scoreI1, setScoreI1] = useState<number>(0); // Max 5.0
  const [scoreI2, setScoreI2] = useState<number>(0); // Max 5.0

  // Category II (10 pts)
  const [scoreII1, setScoreII1] = useState<number>(0); // Max 2.5
  const [scoreII2, setScoreII2] = useState<number>(0); // Max 2.5
  const [scoreII3, setScoreII3] = useState<number>(0); // Max 2.5
  const [scoreII4, setScoreII4] = useState<number>(0); // Max 2.5

  // Category III (10 pts)
  const [scoreIII1, setScoreIII1] = useState<number>(0); // Max 2.5
  const [scoreIII2, setScoreIII2] = useState<number>(0); // Max 2.5
  const [scoreIII3, setScoreIII3] = useState<number>(0); // Max 2.5
  const [scoreIII4, setScoreIII4] = useState<number>(0); // Max 2.5

  // KPI Task Score (100 pts)
  const [kpiTaskScore, setKpiTaskScore] = useState<number>(0);

  // Section II Text Evaluation
  const [strengthsText, setStrengthsText] = useState(
    'Có phẩm chất chính trị vững vàng, phẩm chất đạo đức tốt. Năng lực chuyên môn, nghiệp vụ đáp ứng yêu cầu của vị trí việc làm; đáp ứng được yêu cầu thực thi nhiệm vụ được giao; có tinh thần trách nhiệm trong thực thi công vụ và có khả năng phối hợp với đồng nghiệp.'
  );

  const [weaknessesText, setWeaknessesText] = useState(
    'Đôi lúc còn bị động trong giải quyết công việc, chưa mạnh dạn tham mưu, đề xuất các giải pháp mang tính đột phá.'
  );

  const [managerOpinionText, setManagerOpinionText] = useState(
    'Đồng ý với kết quả tự nhận xét, đánh giá của công chức.'
  );

  // Signatures
  const [managerName, setManagerName] = useState('');

  // Calculated Totals
  const sumCat1 = useMemo(() => Number((scoreI1 + scoreI2).toFixed(1)), [scoreI1, scoreI2]);
  const sumCat2 = useMemo(() => Number((scoreII1 + scoreII2 + scoreII3 + scoreII4).toFixed(1)), [scoreII1, scoreII2, scoreII3, scoreII4]);
  const sumCat3 = useMemo(() => Number((scoreIII1 + scoreIII2 + scoreIII3 + scoreIII4).toFixed(1)), [scoreIII1, scoreIII2, scoreIII3, scoreIII4]);
  
  const totalGeneralScore = useMemo(() => Number((sumCat1 + sumCat2 + sumCat3).toFixed(1)), [sumCat1, sumCat2, sumCat3]);
  const taskWeightedScore = useMemo(() => Number(((kpiTaskScore / 100) * 70).toFixed(1)), [kpiTaskScore]);
  const grandTotalScore = useMemo(() => Number((totalGeneralScore + taskWeightedScore).toFixed(1)), [totalGeneralScore, taskWeightedScore]);

  // Classification suggestion based on quy định
  const classificationResult = useMemo(() => {
    const isLeader = currentUser?.role === 'PROVINCE_LEADER' || currentUser?.role === 'DEPT_HEAD';
    return evaluateOverallKPI(100, 100, 100, totalGeneralScore, isLeader);
  }, [totalGeneralScore, kpiTaskScore, currentUser]);

  // Self-selected classification by the user (Không tự động gán cứng - cho phép người dùng tự chọn mức thi đua)
  const [selfClassification, setSelfClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');

  // Auto-sync or restore user scores from localStorage / existing submission / 3-Sheet KPI
  useEffect(() => {
    if (!fullName) return;
    try {
      const savedKey = `kpi_general_scores_${fullName.trim()}`;
      const savedDataStr = localStorage.getItem(savedKey);
      if (savedDataStr) {
        const d = JSON.parse(savedDataStr);
        if (d.scoreI1 !== undefined) setScoreI1(d.scoreI1);
        if (d.scoreI2 !== undefined) setScoreI2(d.scoreI2);
        if (d.scoreII1 !== undefined) setScoreII1(d.scoreII1);
        if (d.scoreII2 !== undefined) setScoreII2(d.scoreII2);
        if (d.scoreII3 !== undefined) setScoreII3(d.scoreII3);
        if (d.scoreII4 !== undefined) setScoreII4(d.scoreII4);
        if (d.scoreIII1 !== undefined) setScoreIII1(d.scoreIII1);
        if (d.scoreIII2 !== undefined) setScoreIII2(d.scoreIII2);
        if (d.scoreIII3 !== undefined) setScoreIII3(d.scoreIII3);
        if (d.scoreIII4 !== undefined) setScoreIII4(d.scoreIII4);
        if (d.kpiTaskScore !== undefined && d.kpiTaskScore > 0) setKpiTaskScore(d.kpiTaskScore);
        if (d.strengthsText) setStrengthsText(d.strengthsText);
        if (d.weaknessesText) setWeaknessesText(d.weaknessesText);
        if (d.selfClassification) setSelfClassification(d.selfClassification);
      }
    } catch {
      // ignore
    }

    // Look for KPI task score from submissions or sheet summary
    const matchedSub = (submissions || []).find((s: any) => 
      s.userName?.normalize('NFC').trim().toLowerCase() === fullName.normalize('NFC').trim().toLowerCase()
    );
    if (matchedSub && matchedSub.criteria && matchedSub.criteria.length > 0) {
      const kpiCrit = matchedSub.criteria.find((c: any) => c.id === 'crit_IV_kpi' || c.id === 'crit_IV_KPI' || c.categoryName?.includes('KPI') || c.categoryName?.includes('IV.'));
      if (kpiCrit && kpiCrit.selfScore !== undefined) {
        const raw100 = kpiCrit.maxScore === 70 ? Number(((kpiCrit.selfScore / 70) * 100).toFixed(1)) : Number(kpiCrit.selfScore);
        if (raw100 > 0) setKpiTaskScore(raw100);
      }
    }
  }, [fullName, submissions]);

  // Auto-save general criteria scores to localStorage
  useEffect(() => {
    if (!fullName) return;
    try {
      const savedKey = `kpi_general_scores_${fullName.trim()}`;
      localStorage.setItem(savedKey, JSON.stringify({
        scoreI1, scoreI2,
        scoreII1, scoreII2, scoreII3, scoreII4,
        scoreIII1, scoreIII2, scoreIII3, scoreIII4,
        kpiTaskScore,
        totalGeneralScore,
        strengthsText,
        weaknessesText,
        selfClassification
      }));
    } catch {
      // ignore
    }
  }, [fullName, scoreI1, scoreI2, scoreII1, scoreII2, scoreII3, scoreII4, scoreIII1, scoreIII2, scoreIII3, scoreIII4, kpiTaskScore, totalGeneralScore, strengthsText, weaknessesText, selfClassification]);

  // Handle user select auto-fill
  const handleSelectUser = (userName: string) => {
    setFullName(userName);
    const matched = (users || []).find((u) => u.fullName === userName);
    if (matched) {
      if (matched.position) setPositionTitle(matched.position);
      if (matched.department) {
        setWorkUnit(matched.department);
        setDepartmentUnit(matched.department.toUpperCase());
      }
    }
  };

  // Upload Word (.docx) parser using mammoth
  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast('info', 'Đang đọc tệp Word...', 'Hệ thống đang trích xuất dữ liệu từ mẫu phiếu .docx');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      if (!text) {
        addToast('warning', 'Tệp rỗng hoặc không đọc được nội dung text');
        return;
      }

      // Quick Regex pattern matching to auto-extract fields from uploaded Word file
      const quarterMatch = text.match(/(Tháng\s+\d+\s+năm\s+\d{4}|Quý\s+[IVX1-4\s]+năm\s+\d{4})/i);
      if (quarterMatch) setQuarterName(quarterMatch[1].trim());

      const strengthsMatch = text.match(/4\.\s*Ưu điểm[:\s]*([\s\S]*?)(?=5\.\s*Hạn chế|6\.\s*Ý kiến|$)/i);
      if (strengthsMatch && strengthsMatch[1]) setStrengthsText(strengthsMatch[1].trim());

      const weaknessesMatch = text.match(/5\.\s*Hạn chế[,\s]*khuyết điểm[:\s]*([\s\S]*?)(?=6\.\s*Ý kiến|Hưng Yên|CÔNG CHỨC|$)/i);
      if (weaknessesMatch && weaknessesMatch[1]) setWeaknessesText(weaknessesMatch[1].trim());

      addToast('success', 'Nhập tệp Word thành công!', `Đã trích xuất thông tin của ${fullName || 'công chức'}`);
    } catch {
      addToast('error', 'Lỗi tải tệp Word', 'Không thể trích xuất dữ liệu từ file .docx đã chọn.');
    }
  };

  // Export to authentic .docx file using docx library
  const handleExportDocx = async () => {
    try {
      addToast('info', 'Đang tạo tệp Word...', 'Đang đóng gói file .docx chuẩn văn bản hành chính');

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1134, // ~2cm
                  bottom: 1134,
                  left: 1417, // ~2.5cm
                  right: 1134,
                },
              },
            },
            children: [
              // Header table (2 columns: Left agency, Right National Motto)
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.NONE },
                  insideVertical: { style: BorderStyle.NONE },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 45, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: provinceUnit.toUpperCase(), size: 20 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: departmentUnit.toUpperCase(), bold: true, size: 20 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: '____________________', size: 18 })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 55, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 20 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 20, underline: {} })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              new Paragraph({ text: '', spacing: { after: 200 } }),

              // Document Title
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC', bold: true, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: quarterName, bold: true, size: 24 }),
                ],
                spacing: { after: 300 },
              }),

              // Staff Information
              new Paragraph({
                children: [
                  new TextRun({ text: 'Họ và tên: ', size: 24 }),
                  new TextRun({ text: fullName, bold: true, size: 24 }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Chức vụ, chức danh: ', size: 24 }),
                  new TextRun({ text: positionTitle, size: 24 }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Đơn vị công tác: ', size: 24 }),
                  new TextRun({ text: workUnit, size: 24 }),
                ],
                spacing: { after: 240 },
              }),

              // Section I Title
              new Paragraph({
                children: [
                  new TextRun({ text: 'I. KẾT QUẢ THEO DÕI, ĐÁNH GIÁ THEO TIÊU CHÍ CHUNG', bold: true, size: 24 }),
                ],
                spacing: { after: 200 },
              }),

              // Table Criteria
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Table Header
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 8, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', bold: true, size: 20 })] })],
                      }),
                      new TableCell({
                        width: { size: 62, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tiêu chí chấm điểm', bold: true, size: 20 })] })],
                      }),
                      new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm tối đa', bold: true, size: 20 })] })],
                      }),
                      new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm cá nhân tự chấm', bold: true, size: 20 })] })],
                      }),
                    ],
                  }),
                  // Row (1) (2) (3) (4)
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(1)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(2)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(3)', italics: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(4)', italics: true, size: 18 })] })] }),
                    ],
                  }),

                  // Category I
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'I', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sumCat1.toString(), bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreI1.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreI2.toString(), size: 20 })] })] }),
                    ],
                  }),

                  // Category II
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'II', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sumCat2.toString(), bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreII1.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreII2.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tinh thần trách nhiệm trong thực thi công vụ', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreII3.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreII4.toString(), size: 20 })] })] }),
                    ],
                  }),

                  // Category III
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'III', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sumCat3.toString(), bold: true, size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực, tác động tích cực đến kết quả thực hiện nhiệm vụ của cơ quan, tổ chức, đơn vị.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreIII1.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, nhiệm vụ có tính chất đột xuất, phức tạp hoặc trong điều kiện khó khăn.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreIII2.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm khi có sai sót và có biện pháp khắc phục rõ ràng, cụ thể.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreIII3.toString(), size: 20 })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chủ động đưa ra quyết định trong phạm vi thẩm quyền, không né tránh; có tinh thần tiên phong trong thực hiện những nhiệm vụ mới.', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2,5', size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: scoreIII4.toString(), size: 20 })] })] }),
                    ],
                  }),

                  // Total Row
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: '' })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng cộng', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '30', bold: true, size: 20 })] })] }),
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: totalGeneralScore.toString(), bold: true, size: 20 })] })] }),
                    ],
                  }),
                ],
              }),

              new Paragraph({ text: '', spacing: { after: 300 } }),

              // Section II Title
              new Paragraph({
                children: [
                  new TextRun({ text: 'II. TỔNG HỢP KẾT QUẢ THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC, LAO ĐỘNG', bold: true, size: 24 }),
                ],
                spacing: { after: 200 },
              }),

              // Items 1-6
              new Paragraph({
                children: [
                  new TextRun({ text: '1. Điểm tiêu chí chung: ', bold: true, size: 22 }),
                  new TextRun({ text: `${totalGeneralScore} / 30 điểm`, bold: true, size: 22 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 1 (Phẩm chất chính trị, đạo đức, lối sống, kỷ luật): ${sumCat1} / 10 điểm`, size: 20 }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 2 (Năng lực chuyên môn, trách nhiệm, tác phong): ${sumCat2} / 10 điểm`, size: 20 }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `   - Tiêu chí 3 (Đổi mới, sáng tạo, dám nghĩ dám làm): ${sumCat3} / 10 điểm`, size: 20 }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '2. Điểm tiêu chí kết quả thực hiện nhiệm vụ (Tổng điểm KPI/100 x 70): ', bold: true, size: 22 }),
                  new TextRun({ text: `${taskWeightedScore} / 70 điểm (Điểm gốc: ${kpiTaskScore}/100)`, bold: true, size: 22 }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '3. Tổng điểm theo dõi, đánh giá công chức, lao động: ', bold: true, size: 22 }),
                  new TextRun({ text: `${grandTotalScore} / 100 điểm`, bold: true, size: 22, color: '166534' }),
                  new TextRun({ text: ` (Tiêu chí chung: ${totalGeneralScore}đ + Điểm thực hiện nhiệm vụ: ${taskWeightedScore}đ)`, size: 20, color: '64748B' }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '3.1. Mức tự xếp loại đề xuất (Công chức tự chọn): ', bold: true, size: 22, color: '2563EB' }),
                  new TextRun({ text: selfClassification, bold: true, size: 22, color: '2563EB' }),
                  new TextRun({ text: ` (Điểm tự chấm: ${grandTotalScore}đ)`, size: 22, color: '2563EB' }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '   * Lưu ý: Mức xếp loại do người dùng và cấp quản lý chủ động đánh giá & lựa chọn, điểm số mang tính chất tham chiếu.', italics: true, size: 18, color: '64748B' }),
                ],
                spacing: { after: 160 },
              }),

              new Paragraph({
                children: [
                  new TextRun({ text: '4. Ưu điểm: ', bold: true, size: 22 }),
                  new TextRun({ text: strengthsText, size: 22 }),
                ],
                spacing: { after: 160 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '5. Hạn chế, khuyết điểm: ', bold: true, size: 22 }),
                  new TextRun({ text: weaknessesText, size: 22 }),
                ],
                spacing: { after: 160 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '6. Ý kiến nhận xét của cấp có thẩm quyền theo dõi, đánh giá: ', bold: true, size: 22 }),
                  new TextRun({ text: managerOpinionText, size: 22 }),
                ],
                spacing: { after: 300 },
              }),

              // Signatures Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.NONE },
                  insideVertical: { style: BorderStyle.NONE },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'CÔNG CHỨC TỰ ĐÁNH GIÁ', bold: true, size: 22 })],
                          }),
                          new Paragraph({ text: '', spacing: { after: 600 } }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: fullName, bold: true, size: 22 })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: approverInfo.title, bold: true, size: 22 })],
                          }),
                          new Paragraph({ text: '', spacing: { after: 600 } }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: approverInfo.name, bold: true, size: 22 })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFileName = `Phieu_Danh_Gia_Cong_Chuc_${fullName.replace(/\s+/g, '_')}_${quarterName.replace(/\s+/g, '_')}.docx`;
      saveAs(blob, safeFileName);

      addToast('success', 'Xuất Word (.docx) thành công!', `Đã tải tệp ${safeFileName} về máy tính.`);
    } catch {
      addToast('error', 'Không thể tạo file Word', 'Đã xảy ra lỗi khi tạo tệp Word.');
    }
  };

  // Submit to System Storage & Workflow Approval
  const handleSaveToSystem = () => {
    // Khóa sổ kỳ đánh giá → không cho gửi mới
    if (periodConfig?.isLocked) {
      addToast('error', 'Kỳ Đã Khóa Sổ!', `Kỳ "${periodConfig.periodName}" đã bị khóa bởi ${periodConfig.lockedBy || 'lãnh đạo'}. Không thể gửi phiếu đánh giá mới. Vui lòng liên hệ quản trị viên.`);
      return;
    }
    if (!fullName.trim()) {
      addToast('warning', 'Thiếu thông tin!', 'Vui lòng nhập họ tên cán bộ trước khi gửi.');
      return;
    }

    // Strict validation: Both "Điểm Tiêu chí chung" (Section I - 30đ) and "Điểm thực hiện nhiệm vụ" (Section IV/KPI - 70đ) must be completed
    if (totalGeneralScore <= 0 || (taskWeightedScore <= 0 && kpiTaskScore <= 0)) {
      addToast(
        'error',
        'Chưa Hoàn Thành Đủ 2 Bản Đánh Giá!',
        'Để gửi phê duyệt, bạn phải hoàn thành đủ cả 2 phần: (1) "Điểm Tiêu chí chung" (tối đa 30đ) và (2) "Điểm thực hiện nhiệm vụ" (tối đa 70đ).'
      );
      return;
    }
    // Generate full criteria list with benchmark points and self scores
    const criteriaList: SelfEvalCriterion[] = [
      {
        id: 'crit_I_1',
        categoryName: 'I. Phẩm chất chính trị, đạo đức, lối sống',
        targetDescription: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreI1,
        maxScore: 5.0,
      },
      {
        id: 'crit_I_2',
        categoryName: 'I. Phẩm chất chính trị, đạo đức, lối sống',
        targetDescription: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreI2,
        maxScore: 5.0,
      },
      {
        id: 'crit_II_1',
        categoryName: 'II. Năng lực chuyên môn, trách nhiệm',
        targetDescription: 'Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreII1,
        maxScore: 2.5,
      },
      {
        id: 'crit_II_2',
        categoryName: 'II. Năng lực chuyên môn, trách nhiệm',
        targetDescription: 'Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreII2,
        maxScore: 2.5,
      },
      {
        id: 'crit_II_3',
        categoryName: 'II. Năng lực chuyên môn, trách nhiệm',
        targetDescription: 'Tinh thần trách nhiệm trong thực thi công vụ',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreII3,
        maxScore: 2.5,
      },
      {
        id: 'crit_II_4',
        categoryName: 'II. Năng lực chuyên môn, trách nhiệm',
        targetDescription: 'Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreII4,
        maxScore: 2.5,
      },
      {
        id: 'crit_III_1',
        categoryName: 'III. Đổi mới, sáng tạo, dám nghĩ dám làm',
        targetDescription: 'Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreIII1,
        maxScore: 2.5,
      },
      {
        id: 'crit_III_2',
        categoryName: 'III. Đổi mới, sáng tạo, dám nghĩ dám làm',
        targetDescription: 'Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, đột xuất, phức tạp',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreIII2,
        maxScore: 2.5,
      },
      {
        id: 'crit_III_3',
        categoryName: 'III. Đổi mới, sáng tạo, dám nghĩ dám làm',
        targetDescription: 'Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreIII3,
        maxScore: 2.5,
      },
      {
        id: 'crit_III_4',
        categoryName: 'III. Đổi mới, sáng tạo, dám nghĩ dám làm',
        targetDescription: 'Chủ động đưa ra quyết định trong thẩm quyền, tiên phong thực hiện nhiệm vụ mới',
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: scoreIII4,
        maxScore: 2.5,
      },
      {
        id: 'crit_IV_KPI',
        categoryName: 'IV. Điểm kết quả thực hiện nhiệm vụ (KPI)',
        targetDescription: `Kết quả thực hiện nhiệm vụ chuyên môn theo danh mục công việc (Điểm gốc: ${kpiTaskScore}/100 x 70%)`,
        plannedDeadline: 'Kỳ này',
        actualStatus: 'Hoàn thành',
        selfScore: taskWeightedScore,
        maxScore: 70.0,
      }
    ];

    if (onSaveDoc) {
      onSaveDoc({
        fileName: `Phieu_Danh_Gia_${fullName}_${quarterName}.docx`,
        userName: fullName,
        uploadDate: new Date().toISOString().split('T')[0],
        extractedContent: `PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC - ${quarterName}\nCán bộ: ${fullName} (${positionTitle})\nPhòng ban: ${workUnit}\nTổng điểm tiêu chí chung: ${totalGeneralScore}/30\nTổng điểm KPI: ${taskWeightedScore}/70\nTổng điểm đánh giá: ${grandTotalScore}/100\nĐề xuất xếp loại: ${selfClassification} (Điểm: ${grandTotalScore}đ)\nNgười ký duyệt: ${approverInfo.name} (${approverInfo.roleLabel})\nƯu điểm: ${strengthsText}\nHạn chế: ${weaknessesText}`,
        wordCount: 250,
      });
    }

    if (onSubmitWorkflow) {
      onSubmitWorkflow({
        userId: currentUser?.id || 'usr_' + Date.now(),
        userName: fullName,
        userPosition: positionTitle,
        department: workUnit,
        period: quarterName,
        selfScoreTotal: grandTotalScore,
        selfClassification: selfClassification,
        generalScore: totalGeneralScore,
        taskWeightedScore: taskWeightedScore,
        kpiTaskScore: kpiTaskScore,
        strengthsText: strengthsText,
        weaknessesText: weaknessesText,
        managerOpinionText: managerOpinionText,
        provinceUnit: provinceUnit,
        departmentUnit: departmentUnit,
        criteria: criteriaList,
        selfExplanation: `Ưu điểm: ${strengthsText}\n\nHạn chế: ${weaknessesText}\n\nĐề xuất xếp loại: ${selfClassification} (Điểm: ${grandTotalScore}đ)`,
        status: 'PENDING_DEPT',
        submittedAt: new Date().toLocaleString('vi-VN'),
        approverName: approverInfo.name,
        approverTitle: approverInfo.title,
        attachedFileName: `Phieu_Danh_Gia_${fullName.replace(/\s+/g, '_')}_${quarterName.replace(/\s+/g, '_')}.docx`,
      });
    }
    addToast(
      'success',
      'Đã Lưu & Gửi Phê Duyệt Thành Công!',
      `Phiếu đánh giá của ${fullName} (${workUnit}) - Tổng điểm: ${grandTotalScore}đ - Đề xuất: ${selfClassification} đã được chuyển đến ${approverInfo.roleLabel} ${approverInfo.name} để ký duyệt.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Right Action Bar - Short & concise buttons */}
      <div className="w-full bg-white dark:bg-slate-900 border-t-2 border-amber-400 shadow-xs rounded-lg px-4 py-3 -mt-2 mb-2 flex flex-wrap items-center justify-between gap-4">
        {/* Left side: Buttons (Nhập/Xuất Word, etc. sang phía bên trái) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Docx Button */}
          <label className="flex items-center justify-center px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded shadow-sm hover:bg-sky-700 transition-colors cursor-pointer">
            Nhập Word
            <input type="file" accept=".docx,.doc" onChange={handleWordUpload} className="hidden" />
          </label>

          {/* Export Docx Button */}
          <button
            onClick={handleExportDocx}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Xuất Word
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded shadow-sm hover:bg-slate-700 transition-colors"
          >
            In PDF
          </button>

          {/* Save & Submit to Manager */}
          <button
            onClick={handleSaveToSystem}
            className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Gửi phê duyệt
          </button>
        </div>

        {/* Right side: Filters */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Phòng ban:</span>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Tất cả phòng ban ({users.length})</option>
              {availableDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cán bộ:</span>
            <select
              value={fullName}
              onChange={(e) => handleSelectUser(e.target.value)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[240px]"
            >
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.fullName}>
                  {u.fullName} - {u.position}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Paper Container */}
      {/* Main Interactive Paper Container with Filter Strip directly on top of A4 Paper */}
      <div className="bg-slate-200/70 dark:bg-slate-950 p-4 sm:p-8 rounded-3xl overflow-x-auto flex flex-col items-center">

        {/* Printable Canvas A4 Document */}
        <div 
          id="official-word-document-canvas" 
          className="bg-white text-slate-900 shadow-2xl rounded-b-sm p-8 sm:p-14 w-full max-w-[950px] font-serif text-[14px] leading-normal print:p-0 print:shadow-none print:max-w-none print:w-full"
          style={{ minHeight: '1050px' }}
        >
          {/* Document Header 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            <div>
              <input
                type="text"
                value={provinceUnit}
                onChange={(e) => setProvinceUnit(e.target.value)}
                className="w-full text-center font-serif text-xs uppercase tracking-wide bg-transparent border-b border-dashed border-slate-300 hover:border-slate-400 focus:outline-none"
              />
              <div className="w-full text-center font-serif font-bold text-xs uppercase tracking-wide border-b border-dashed border-slate-300 pb-1 min-h-[22px] flex items-center justify-center">
                {departmentUnit ? (
                  <span>{departmentUnit}</span>
                ) : (
                  <span className="text-slate-400 normal-case font-normal italic text-[11px]">(Chờ đăng nhập để hiển thị phòng ban)</span>
                )}
              </div>
              <div className="w-24 mx-auto border-b border-slate-800 my-1"></div>
            </div>

            <div>
              <p className="font-serif font-bold text-xs uppercase tracking-wide">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="font-serif font-bold text-xs underline underline-offset-4">
                Độc lập - Tự do - Hạnh phúc
              </p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-6">
            <h1 className="font-serif font-bold text-xl uppercase tracking-wide">
              PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC
            </h1>
            <div className="flex justify-center mt-1">
              <input
                type="text"
                value={quarterName}
                onChange={(e) => setQuarterName(e.target.value)}
                className="text-center font-serif font-bold text-base bg-transparent border-b border-dashed border-slate-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Personal Info Lines - Read-only from currentUser */}
          <div className="space-y-2 mb-6 font-serif">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Họ và tên:</span>
              <span className="flex-1 font-bold text-slate-900 border-b border-dashed border-slate-300 pb-1">
                {fullName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Chức vụ, chức danh:</span>
              <span className="flex-1 text-slate-900 border-b border-dashed border-slate-300 pb-1">
                {positionTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Đơn vị công tác:</span>
              <span className="flex-1 text-slate-900 border-b border-dashed border-slate-300 pb-1">
                {workUnit}
              </span>
            </div>
          </div>

          {/* SECTION I: CRITERIA TABLE */}
          <div className="mb-6">
            <h2 className="font-serif font-bold text-sm uppercase mb-3">
              I. KẾT QUẢ THEO DÕI, ĐÁNH GIÁ THEO TIÊU CHÍ CHUNG
            </h2>

            <table className="w-full border-collapse border border-slate-900 text-xs font-serif">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-900 p-2 text-center w-10">TT</th>
                  <th className="border border-slate-900 p-2 text-center">Tiêu chí chấm điểm</th>
                  <th className="border border-slate-900 p-2 text-center w-20">Điểm tối đa</th>
                  <th className="border border-slate-900 p-2 text-center w-24">Điểm do cá nhân tự chấm</th>
                </tr>
                <tr className="italic text-[11px] text-center">
                  <td className="border border-slate-900 p-1">(1)</td>
                  <td className="border border-slate-900 p-1">(2)</td>
                  <td className="border border-slate-900 p-1">(3)</td>
                  <td className="border border-slate-900 p-1">(4)</td>
                </tr>
              </thead>
              <tbody>
                {/* CATEGORY I */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-900 p-2 text-center">I</td>
                  <td className="border border-slate-900 p-2">
                    Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ và ý thức kỷ luật, kỷ cương trong thực thi công vụ
                  </td>
                  <td className="border border-slate-900 p-2 text-center font-bold">10</td>
                  <td className="border border-slate-900 p-2 text-center font-bold text-indigo-700">
                    {sumCat1}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">1</td>
                  <td className="border border-slate-900 p-2">
                    Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ
                  </td>
                  <td className="border border-slate-900 p-2 text-center">5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      placeholder="0"
                      value={scoreI1 === 0 ? '' : scoreI1}
                      onChange={(e) => setScoreI1(clampScoreValue(e.target.value, 5.0))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">2</td>
                  <td className="border border-slate-900 p-2">
                    Ý thức kỷ luật, kỷ cương trong thực thi công vụ
                  </td>
                  <td className="border border-slate-900 p-2 text-center">5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      placeholder="0"
                      value={scoreI2 === 0 ? '' : scoreI2}
                      onChange={(e) => setScoreI2(clampScoreValue(e.target.value, 5.0))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>

                {/* CATEGORY II */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-900 p-2 text-center">II</td>
                  <td className="border border-slate-900 p-2">
                    Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm; khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao; tinh thần trách nhiệm trong thực thi công vụ; thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp
                  </td>
                  <td className="border border-slate-900 p-2 text-center font-bold">10</td>
                  <td className="border border-slate-900 p-2 text-center font-bold text-indigo-700">
                    {sumCat2}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">1</td>
                  <td className="border border-slate-900 p-2">
                    Năng lực chuyên môn, nghiệp vụ theo yêu cầu của vị trí việc làm
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreII1 === 0 ? '' : scoreII1}
                      onChange={(e) => setScoreII1(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">2</td>
                  <td className="border border-slate-900 p-2">
                    Khả năng đáp ứng yêu cầu thực thi nhiệm vụ được giao thường xuyên, đột xuất
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreII2 === 0 ? '' : scoreII2}
                      onChange={(e) => setScoreII2(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">3</td>
                  <td className="border border-slate-900 p-2">
                    Tinh thần trách nhiệm trong thực thi công vụ
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreII3 === 0 ? '' : scoreII3}
                      onChange={(e) => setScoreII3(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">4</td>
                  <td className="border border-slate-900 p-2">
                    Thái độ phục vụ người dân, doanh nghiệp và khả năng phối hợp với đồng nghiệp
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreII4 === 0 ? '' : scoreII4}
                      onChange={(e) => setScoreII4(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>

                {/* CATEGORY III */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-900 p-2 text-center">III</td>
                  <td className="border border-slate-900 p-2">
                    Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm vì lợi ích chung trong thực thi công vụ
                  </td>
                  <td className="border border-slate-900 p-2 text-center font-bold">10</td>
                  <td className="border border-slate-900 p-2 text-center font-bold text-indigo-700">
                    {sumCat3}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">1</td>
                  <td className="border border-slate-900 p-2">
                    Có sản phẩm, giải pháp đột phá, sáng tạo đem lại giá trị, hiệu quả thiết thực, tác động tích cực đến kết quả thực hiện nhiệm vụ của cơ quan, tổ chức, đơn vị.
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreIII1 === 0 ? '' : scoreIII1}
                      onChange={(e) => setScoreIII1(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">2</td>
                  <td className="border border-slate-900 p-2">
                    Sẵn sàng tham gia thực hiện nhiệm vụ chính trị đặc biệt quan trọng, nhiệm vụ có tính chất đột xuất, phức tạp hoặc trong điều kiện khó khăn.
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreIII2 === 0 ? '' : scoreIII2}
                      onChange={(e) => setScoreIII2(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">3</td>
                  <td className="border border-slate-900 p-2">
                    Có tinh thần chịu trách nhiệm trước kết quả công việc; chủ động nhận trách nhiệm khi có sai sót và có biện pháp khắc phục rõ ràng, cụ thể.
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreIII3 === 0 ? '' : scoreIII3}
                      onChange={(e) => setScoreIII3(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-900 p-2 text-center">4</td>
                  <td className="border border-slate-900 p-2">
                    Chủ động đưa ra quyết định trong phạm vi thẩm quyền, không né tránh; có tinh thần tiên phong trong thực hiện những nhiệm vụ mới.
                  </td>
                  <td className="border border-slate-900 p-2 text-center">2,5</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2.5"
                      placeholder="0"
                      value={scoreIII4 === 0 ? '' : scoreIII4}
                      onChange={(e) => setScoreIII4(clampScoreValue(e.target.value, 2.5))}
                      className="w-16 p-1 text-center font-bold bg-amber-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                </tr>

                {/* TOTAL ROW */}
                <tr className="font-bold bg-amber-100/60 text-slate-900">
                  <td colSpan={2} className="border border-slate-900 p-2 text-center font-bold uppercase">
                    Tổng cộng
                  </td>
                  <td className="border border-slate-900 p-2 text-center font-bold">30</td>
                  <td className="border border-slate-900 p-2 text-center font-bold text-base text-indigo-800">
                    {totalGeneralScore}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION II: SUMMARY EVALUATION */}
          <div className="space-y-4 font-serif">
            <h2 className="font-serif font-bold text-sm uppercase">
              II. TỔNG HỢP KẾT QUẢ THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC, LAO ĐỘNG
            </h2>

            <div className="space-y-3 text-sm pl-2">
              <div>
                <div className="flex items-center gap-2">
                  <strong>1. Điểm tiêu chí chung:</strong>{' '}
                  <span className="font-bold text-indigo-700 text-base">{totalGeneralScore} / 30 điểm</span>
                </div>
                {/* Bổ sung điểm đã chấm vào 3 tiêu chí chung */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-0.5">
                  <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Tiêu chí 1: Phẩm chất chính trị, đạo đức, lối sống, kỷ luật
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400">{sumCat1}đ</span>
                      <span className="text-[11px] text-slate-400">/ 10đ</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Tiêu chí 2: Năng lực chuyên môn, trách nhiệm, tác phong
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400">{sumCat2}đ</span>
                      <span className="text-[11px] text-slate-400">/ 10đ</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Tiêu chí 3: Đổi mới, sáng tạo, dám nghĩ dám làm
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400">{sumCat3}đ</span>
                      <span className="text-[11px] text-slate-400">/ 10đ</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <strong>2. Điểm tiêu chí kết quả thực hiện nhiệm vụ (Tổng điểm KPI/100 x 70):</strong>
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
                  <span className="text-xs text-slate-500">KPI Gốc:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={kpiTaskScore === 0 ? '' : kpiTaskScore}
                    onChange={(e) => setKpiTaskScore(clampScoreValue(e.target.value, 100))}
                    className="w-14 text-center font-bold font-mono text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-400">=&gt;</span>
                  <span className="font-extrabold font-mono text-sm text-indigo-700 dark:text-indigo-400">
                    {taskWeightedScore} / 70đ
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">
                    3. Tổng điểm theo dõi, đánh giá công chức, lao động:
                  </strong>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    (Tiêu chí chung: <strong>{totalGeneralScore}đ</strong> + Điểm thực hiện nhiệm vụ: <strong>{taskWeightedScore}đ</strong>)
                  </span>
                </div>
                <span className="font-extrabold text-lg text-emerald-700 dark:text-emerald-400 font-mono">
                  {grandTotalScore} / 100 điểm
                </span>
              </div>

              {/* Classification Selector - Không tự động gán cứng mà cho người dùng chủ động chọn */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                    3.1. Tự nhận xét & chọn mức xếp loại thi đua (Người dùng tự chọn):
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelfClassification(classificationResult.classificationLabel)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                    title="Gợi ý mức theo điểm tổng hợp"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gợi ý theo điểm ({classificationResult.classificationLabel})</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                  {CLASSIFICATION_OPTIONS.map((opt, idx) => {
                    const isSelected = selfClassification === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelfClassification(opt)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                          isSelected ? 'bg-white text-indigo-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate">{opt}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500">Mức đề xuất hiện tại:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {selfClassification}
                  </span>
                </div>
              </div>
            </div>

            {/* Strengths Text */}
            <div className="space-y-1">
              <label className="block font-bold text-sm">4. Ưu điểm:</label>
              <textarea
                rows={4}
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
                className="w-full p-2.5 text-xs font-serif bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Weaknesses Text */}
            <div className="space-y-1">
              <label className="block font-bold text-sm">5. Hạn chế, khuyết điểm:</label>
              <textarea
                rows={3}
                value={weaknessesText}
                onChange={(e) => setWeaknessesText(e.target.value)}
                className="w-full p-2.5 text-xs font-serif bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Leader Comments */}
            <div className="space-y-1">
              <label className="block font-bold text-sm">
                6. Ý kiến nhận xét của cấp có thẩm quyền theo dõi, đánh giá:
              </label>
              <textarea
                rows={3}
                value={managerOpinionText}
                onChange={(e) => setManagerOpinionText(e.target.value)}
                className="w-full p-2.5 text-xs font-serif bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Signatures Grid */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center font-serif text-xs">
              <div>
                <p className="font-bold uppercase tracking-wide">CÔNG CHỨC TỰ ĐÁNH GIÁ</p>
                <p className="italic text-slate-500 font-serif text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-20" />
                <p className="font-bold text-sm text-slate-900">{fullName}</p>
              </div>

              <div>
                <p className="font-bold uppercase tracking-wide">{approverInfo.title}</p>
                <p className="italic text-slate-500 font-serif text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-20" />
                <p className="font-bold text-sm text-slate-900">{approverInfo.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
