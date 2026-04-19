import { create } from 'zustand';

/**
 * Task — Đơn vị đầu việc trong hệ thống KPI
 *
 * Phân loại task:
 *  • isNhiemVuCu=false               → Task kế hoạch tuần tới (Bảng 2)
 *  • isNhiemVuCu=true, isPhatSinh=false → Task từ Kế hoạch cũ (Bảng 1, khóa tên/trọng số, không xóa)
 *  • isNhiemVuCu=true, isPhatSinh=true  → Task phát sinh trong tuần (Bảng 1, cho điền, cho xóa)
 */
export type Task = {
  id: string;
  noiDung: string;
  ghiChu: string;
  donVi: string;
  keHoach: number | '';   // Rỗng = chưa điền, buộc NV tự nhập số
  thucHien: number | null;
  trongSo: number | '';   // Rỗng = chưa điền, buộc NV tự chọn
  yeuCau: number;
  isNhiemVuCu: boolean;   // true = thuộc Bảng 1 (báo cáo tuần trước)
  isPhatSinh?: boolean;   // true = task phát sinh (không từ KH cũ), cho sửa + xóa

  // Các field tự tính toán, không cần người dùng nhập
  phanTram: number;
  datDuoc: number;
};

export type MonthlyReportData = {
  achievements: string;
  difficulties: string;
  proposals: string;
  priorities: string;
  rating: number; // 1-5
};

type KpiStore = {
  tasks: Task[];
  monthlyData: MonthlyReportData;
  initTasks: (tasks: Task[]) => void;
  initMonthlyData: (data: Partial<MonthlyReportData>) => void;
  updateThucHien: (id: string, value: number | null) => void;
  addTask: () => void;
  addOldTask: () => void;           // Bảng 1 — lần đầu: tự nhập từ Excel
  addPhatSinhTask: () => void;      // Bảng 1 — thêm task phát sinh ngoài kế hoạch
  updateTaskField: <K extends keyof Task>(id: string, field: K, value: Task[K]) => void;
  updateMonthlyField: <K extends keyof MonthlyReportData>(field: K, value: MonthlyReportData[K]) => void;
  removeTask: (id: string) => void;
  getTotalScore: () => number;
  resetStore: () => void;
};

/**
 * Tính phanTram và datDuoc từ các trường số.
 * Trả về {0, 0} nếu chưa điền đủ.
 */
function calculateFields(thucHien: number | null, keHoach: number | '', trongSo: number | '', yeuCau: number) {
  if (thucHien === null || isNaN(thucHien) || !keHoach || !trongSo) {
    return { phanTram: 0, datDuoc: 0 };
  }
  const phanTram = Math.min((thucHien / keHoach) * 100, 999); // Cap 999%
  const datDuoc = (thucHien / keHoach) * trongSo;
  return {
    phanTram: parseFloat(phanTram.toFixed(1)),
    datDuoc:  parseFloat(datDuoc.toFixed(2)),
  };
}

export const useKpiStore = create<KpiStore>((set, get) => ({
  tasks: [],
  monthlyData: {
    achievements: '',
    difficulties: '',
    proposals:    '',
    priorities:   '',
    rating: 4,
  },

  // Khởi tạo tasks từ server (tự tính phanTram/datDuoc luôn)
  initTasks: (serverTasks) => {
    const mapped = serverTasks.map(t => {
      const calc = calculateFields(t.thucHien, t.keHoach, t.trongSo, t.yeuCau);
      return { ...t, ...calc };
    });
    set({ tasks: mapped });
  },

  initMonthlyData: (data) => set((state) => ({
    monthlyData: { ...state.monthlyData, ...data }
  })),

  // Cập nhật cột "Thực hiện" và tự tính lại điểm
  updateThucHien: (id, value) => set((state) => ({
    tasks: state.tasks.map(t => {
      if (t.id !== id) return t;
      const calc = calculateFields(value, t.keHoach, t.trongSo, t.yeuCau);
      return { ...t, thucHien: value, ...calc };
    })
  })),

  // Bảng 2 — thêm task kế hoạch tuần tới (luôn trống)
  addTask: () => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        id:          'new_' + Date.now(),
        noiDung:     '', ghiChu: '', donVi: '',
        keHoach:     '',
        thucHien:    null,
        trongSo:     '',
        yeuCau:      1,
        isNhiemVuCu: false,
        isPhatSinh:  false,
        phanTram:    0, datDuoc: 0,
      }
    ]
  })),

  // Bảng 1 — lần đầu: NV tự nhập từ Excel (toàn bộ cột được điền)
  addOldTask: () => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        id:          'old_' + Date.now(),
        noiDung:     '', ghiChu: '', donVi: '',
        keHoach:     '',
        thucHien:    null,
        trongSo:     '',
        yeuCau:      1,
        isNhiemVuCu: true,
        isPhatSinh:  false, // lần đầu cũng không phải phát sinh
        phanTram:    0, datDuoc: 0,
      }
    ]
  })),

  // Bảng 1 — thêm task phát sinh ngoài kế hoạch (cho sửa + xóa)
  addPhatSinhTask: () => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        id:          'ps_' + Date.now(),
        noiDung:     '', ghiChu: '', donVi: '',
        keHoach:     '',
        thucHien:    null,
        trongSo:     '',
        yeuCau:      1,
        isNhiemVuCu: true,   // thuộc Bảng 1 (báo cáo thực hiện)
        isPhatSinh:  true,   // cho phép sửa + xóa
        phanTram:    0, datDuoc: 0,
      }
    ]
  })),

  // Cập nhật bất kỳ field nào, tự tính lại nếu là field số
  updateTaskField: (id, field, value) => set((state) => ({
    tasks: state.tasks.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      if (['keHoach', 'thucHien', 'trongSo', 'yeuCau'].includes(field as string)) {
        const calc = calculateFields(updated.thucHien, updated.keHoach, updated.trongSo, updated.yeuCau);
        return { ...updated, ...calc };
      }
      return updated;
    })
  })),

  updateMonthlyField: (field, value) => set((state) => ({
    monthlyData: { ...state.monthlyData, [field]: value }
  })),

  // Chỉ cho xóa task phát sinh (isPhatSinh=true) hoặc Bảng 2 (isNhiemVuCu=false)
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),

  getTotalScore: () => get().tasks.reduce((sum, t) => sum + t.datDuoc, 0),

  resetStore: () => set({
    tasks: [],
    monthlyData: {
      achievements: '',
      difficulties: '',
      proposals:    '',
      priorities:   '',
      rating: 4,
    }
  })
}));
