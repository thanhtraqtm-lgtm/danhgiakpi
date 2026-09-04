import { DEPARTMENTS, User, KpiTask } from '../types/index';

export type TaskBlockGroup = 'PHONG' | 'VUNG1' | 'VUNG2' | 'OTHER';
export type TaskStatCategory = 'COMPLETED' | 'COMPLETED_LATE' | 'UNFINISHED' | 'LATE';

const textNormCache = new Map<string, string>();
export const normalizeText = (s: string | undefined | null): string => {
  if (!s) return '';
  const cached = textNormCache.get(s);
  if (cached !== undefined) return cached;
  const res = s
    .normalize('NFC')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  textNormCache.set(s, res);
  return res;
};

const noAccentCache = new Map<string, string>();
export const normalizeNoAccent = (s: string | undefined | null): string => {
  if (!s) return '';
  const cached = noAccentCache.get(s);
  if (cached !== undefined) return cached;
  const res = normalizeText(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'd');
  noAccentCache.set(s, res);
  return res;
};

export interface UnitDefinition {
  canonical: string;
  shortName: string;
  group: 'PHONG' | 'VUNG1' | 'VUNG2';
  keywords: string[];
}

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  // 5 Phòng chuyên môn
  {
    canonical: 'Phòng Thống kê Tổng hợp',
    shortName: 'P.TK Tổng hợp',
    group: 'PHONG',
    keywords: ['tong hop', 'thong ke tong hop', 'tkth', 'p. tong hop', 'p.tk tong hop', 'phong tong hop', 'lanh dao', 'ban lanh dao', 'cuc truong', 'pho cuc truong', 'cuc thong ke', 'cuc']
  },
  {
    canonical: 'Phòng TCHC',
    shortName: 'P. TCHC',
    group: 'PHONG',
    keywords: ['tchc', 'to chuc hanh chinh', 'to chuc - hanh chinh', 'to chuc', 'hanh chinh', 'van phong', 'p. tchc', 'to chuc can bo']
  },
  {
    canonical: 'Phòng Thống kê TMDV & Giá',
    shortName: 'P.TK TMDV & Giá',
    group: 'PHONG',
    keywords: ['tmdv', 'thuong mai', 'dich vu & gia', 'dich vu va gia', 'gia', 'p. tmdv', 'dich vu', 'thuong mai dich vu']
  },
  {
    canonical: 'Phòng Thống kê CNXD',
    shortName: 'P.TK CNXD',
    group: 'PHONG',
    keywords: ['cnxd', 'cong nghiep xay dung', 'cong nghiep', 'xay dung', 'p. cnxd', 'cn-xd']
  },
  {
    canonical: 'Phòng Thống kê NN&XH',
    shortName: 'P.TK NN&XH',
    group: 'PHONG',
    keywords: ['nn&xh', 'nnxh', 'nn va xh', 'nong nghiep', 'xa hoi', 'p. nn&xh', 'nn-xh', 'nong nghiep va xa hoi']
  },

  // 7 Chi cục / Cơ sở Vùng 1
  {
    canonical: 'Thống kê cơ sở Phố Hiến',
    shortName: 'CS Phố Hiến',
    group: 'VUNG1',
    keywords: ['pho hien', 'tp hung yen', 'hung yen']
  },
  {
    canonical: 'Thống kê cơ sở Như Quỳnh',
    shortName: 'CS Như Quỳnh',
    group: 'VUNG1',
    keywords: ['nhu quynh', 'van lam']
  },
  {
    canonical: 'Thống kê cơ sở Yên Mỹ',
    shortName: 'CS Yên Mỹ',
    group: 'VUNG1',
    keywords: ['yen my']
  },
  {
    canonical: 'Thống kê cơ sở Mỹ Hào',
    shortName: 'CS Mỹ Hào',
    group: 'VUNG1',
    keywords: ['my hao']
  },
  {
    canonical: 'Thống kê cơ sở Khoái Châu',
    shortName: 'CS Khoái Châu',
    group: 'VUNG1',
    keywords: ['khoai chau']
  },
  {
    canonical: 'Thống kê cơ sở Lương Bằng',
    shortName: 'CS Lương Bằng',
    group: 'VUNG1',
    keywords: ['luong bang', 'kim dong']
  },
  {
    canonical: 'Thống kê cơ sở Hoàng Hoa Thám',
    shortName: 'CS Hoàng Hoa Thám',
    group: 'VUNG1',
    keywords: ['hoang hoa tham', 'phu cu', 'an thi']
  },

  // 7 Chi cục / Cơ sở Vùng 2
  {
    canonical: 'Thống kê cơ sở Quỳnh Phụ',
    shortName: 'CS Quỳnh Phụ',
    group: 'VUNG2',
    keywords: ['quynh phu']
  },
  {
    canonical: 'Thống kê cơ sở Hưng Hà',
    shortName: 'CS Hưng Hà',
    group: 'VUNG2',
    keywords: ['hung ha']
  },
  {
    canonical: 'Thống kê cơ sở Đông Hưng',
    shortName: 'CS Đông Hưng',
    group: 'VUNG2',
    keywords: ['dong hung']
  },
  {
    canonical: 'Thống kê cơ sở Thái Thụy',
    shortName: 'CS Thái Thụy',
    group: 'VUNG2',
    keywords: ['thai thuy']
  },
  {
    canonical: 'Thống kê cơ sở Tiền Hải',
    shortName: 'CS Tiền Hải',
    group: 'VUNG2',
    keywords: ['tien hai']
  },
  {
    canonical: 'Thống kê cơ sở Kiến Xương',
    shortName: 'CS Kiến Xương',
    group: 'VUNG2',
    keywords: ['kien xuong']
  },
  {
    canonical: 'Thống kê cơ sở Vũ Thư',
    shortName: 'CS Vũ Thư',
    group: 'VUNG2',
    keywords: ['vu thu']
  }
];

// Pre-compute normalized forms for instant lookup
const UNIT_LOOKUP = UNIT_DEFINITIONS.map(def => ({
  canonical: def.canonical,
  shortName: def.shortName,
  group: def.group,
  normalizedCanonical: normalizeNoAccent(def.canonical),
  keywords: def.keywords
}));

export const UNIT_GROUP_BY_CANONICAL = new Map<string, TaskBlockGroup>();
UNIT_DEFINITIONS.forEach(d => UNIT_GROUP_BY_CANONICAL.set(d.canonical, d.group));

// Cache for raw department -> canonical string
const canonicalDeptCache = new Map<string, string>();

/**
 * Resolve any raw department string (and optionally user profile) to one of the 19 canonical units.
 */
export const resolveCanonicalDepartment = (
  rawDept: string | undefined | null,
  userName?: string | undefined | null,
  users?: User[]
): string | null => {
  if (rawDept && !userName) {
    const hit = canonicalDeptCache.get(rawDept);
    if (hit !== undefined) return hit;
  }

  let text = normalizeNoAccent(rawDept);

  // If empty or unassigned, try resolving via user's department
  if ((!text || text === 'chua phan bo' || text === 'khong xac dinh') && userName && users && users.length > 0) {
    const normU = normalizeNoAccent(userName);
    const matchedUser = users.find(u => {
      const uNorm = normalizeNoAccent(u.fullName);
      return uNorm === normU || uNorm.includes(normU) || normU.includes(uNorm);
    });
    if (matchedUser && matchedUser.department) {
      text = normalizeNoAccent(matchedUser.department);
    }
  }

  if (!text) return null;

  // 1. Exact match with canonical
  for (const def of UNIT_LOOKUP) {
    if (def.normalizedCanonical === text) {
      if (rawDept && !userName) canonicalDeptCache.set(rawDept, def.canonical);
      return def.canonical;
    }
  }

  // 2. Keyword/sub-phrase match
  for (const def of UNIT_LOOKUP) {
    if (def.keywords.some(k => text.includes(k))) {
      if (rawDept && !userName) canonicalDeptCache.set(rawDept, def.canonical);
      return def.canonical;
    }
  }

  // Fallback to general provincial office so no task in 4597 total is ever dropped
  const fallback = 'Phòng Thống kê Tổng hợp';
  if (rawDept && !userName) canonicalDeptCache.set(rawDept, fallback);
  return fallback;
};

/**
 * Determine which of the 3 main blocks ('PHONG' | 'VUNG1' | 'VUNG2') a task belongs to.
 */
export const getTaskBlockGroup = (
  taskDept: string | undefined | null,
  userName?: string | undefined | null,
  users?: User[]
): TaskBlockGroup => {
  const canonical = resolveCanonicalDepartment(taskDept, userName, users);
  if (canonical) {
    const grp = UNIT_GROUP_BY_CANONICAL.get(canonical);
    if (grp) return grp;
  }

  // Fallback checks for coarse department labels
  const text = normalizeNoAccent(taskDept);
  if (text.includes('vung 1') || text.includes('vung i') || text.includes('vung_1')) {
    return 'VUNG1';
  }
  if (text.includes('vung 2') || text.includes('vung ii') || text.includes('vung_2')) {
    return 'VUNG2';
  }

  return 'PHONG';
};

/**
 * Check if a task's department matches a target department name.
 */
export const isDepartmentMatch = (
  taskDept: string | undefined | null,
  targetDept: string,
  userName?: string | undefined | null,
  users?: User[]
): boolean => {
  if (!targetDept || targetDept.toUpperCase() === 'ALL') return true;
  if (taskDept === targetDept) return true;

  const taskCanonical = resolveCanonicalDepartment(taskDept, userName, users);
  const targetCanonical = resolveCanonicalDepartment(targetDept);

  if (taskCanonical && targetCanonical) {
    return taskCanonical === targetCanonical;
  }

  // Direct normalized text comparison fallback
  const normTask = normalizeNoAccent(taskDept);
  const normTarget = normalizeNoAccent(targetDept);
  return normTask === normTarget;
};

const statusCategoryCache = new Map<string, TaskStatCategory>();

/**
 * Classify a task's status into one of four mutually exclusive, exhaustive categories:
 * 1. 'COMPLETED': Hoàn thành (đúng hạn)
 * 2. 'COMPLETED_LATE': Hoàn thành trễ hạn
 * 3. 'UNFINISHED': Chưa hoàn thành
 * 4. 'LATE': Chưa hoàn thành trễ hạn
 *
 * This guarantees: Total = COMPLETED + COMPLETED_LATE + UNFINISHED + LATE
 */
export const classifyTaskStatus = (rawStatus: string | undefined | null): TaskStatCategory => {
  if (!rawStatus) return 'UNFINISHED';
  const hit = statusCategoryCache.get(rawStatus);
  if (hit !== undefined) return hit;

  const s = normalizeText(rawStatus);
  const noAccent = normalizeNoAccent(rawStatus);

  let result: TaskStatCategory;

  // Exact matches first for 100% precision
  if (
    s === 'hoàn thành' ||
    s === 'hoan thanh' ||
    noAccent === 'hoan thanh' ||
    s === 'đúng hạn' ||
    s === 'dung han' ||
    noAccent === 'dung han'
  ) {
    result = 'COMPLETED';
  } else if (
    s === 'hoàn thành trễ hạn' ||
    s === 'hoan thanh tre han' ||
    noAccent === 'hoan thanh tre han' ||
    s === 'hoàn thành muộn' ||
    s === 'hoan thanh muon' ||
    noAccent === 'hoan thanh muon'
  ) {
    result = 'COMPLETED_LATE';
  } else if (
    s === 'chưa hoàn thành' ||
    s === 'chua hoan thanh' ||
    noAccent === 'chua hoan thanh' ||
    s === 'đang thực hiện' ||
    s === 'dang thuc hien' ||
    noAccent === 'dang thuc hien' ||
    s === 'chưa thực hiện' ||
    s === 'chua thuc hien'
  ) {
    result = 'UNFINISHED';
  } else if (
    s === 'chưa hoàn thành trễ hạn' ||
    s === 'chua hoan thanh tre han' ||
    noAccent === 'chua hoan thanh tre han' ||
    s === 'trễ hạn' ||
    s === 'tre han' ||
    noAccent === 'tre han' ||
    s === 'quá hạn' ||
    s === 'qua han' ||
    noAccent === 'qua han'
  ) {
    result = 'LATE';
  } else {
    const hasChua = s.includes('chưa') || s.includes('chua') || noAccent.includes('chua');
    const hasTre =
      s.includes('trễ') ||
      s.includes('tre') ||
      s.includes('muộn') ||
      s.includes('muon') ||
      noAccent.includes('tre') ||
      s.includes('quá hạn') ||
      s.includes('qua han') ||
      s.includes('chậm tiến độ');
    const hasHoanThanh =
      s.includes('hoàn thành') ||
      s.includes('hoan thanh') ||
      s.includes('đúng hạn') ||
      s.includes('dung han') ||
      s.includes('đạt') ||
      s.includes('xong');

    // 1. Chưa hoàn thành trễ hạn (có "chưa" và có "trễ/muộn/quá hạn")
    if (hasChua && hasTre) {
      result = 'LATE';
    } else if (hasHoanThanh && hasTre && !hasChua) {
      result = 'COMPLETED_LATE';
    } else if (hasHoanThanh && !hasChua && !hasTre) {
      result = 'COMPLETED';
    } else if (hasTre || s === 'chtt') {
      result = 'LATE';
    } else {
      result = 'UNFINISHED';
    }
  }

  statusCategoryCache.set(rawStatus, result);
  return result;
};
