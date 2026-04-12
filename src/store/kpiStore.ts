import { create } from 'zustand';

export type Task = {
  id: string;
  noiDung: string;
  ghiChu: string;
  donVi: string;
  keHoach: number | '';   // Rỗng = chưa điền, buộc NH phải tự tay nhập số
  thucHien: number | null;
  trongSo: number | '';   // Rỗng = chưa điền, buộc NV tự chọn
  yeuCau: number;
  isNhiemVuCu: boolean; // Nếu = true => Khóa các cột, mờ đi, chỉ cho sửa Thực hiện
  
  // Các field tự tính toán không cần cho người dùng nhập
  phanTram: number; 
  datDuoc: number;
};

type KpiStore = {
  tasks: Task[];
  initTasks: (tasks: Task[]) => void;
  updateThucHien: (id: string, value: number) => void;
  addTask: () => void;
  addOldTask: () => void; // Thêm dòng mới ở Phân vùng 1 (dành cho lần đầu tự điền)
  updateTaskField: <K extends keyof Task>(id: string, field: K, value: Task[K]) => void;
  removeTask: (id: string) => void;
  getTotalScore: () => number;
};

function calculateFields(thucHien: number | null, keHoach: number | '', trongSo: number | '', yeuCau: number) {
  // Guard: chưa nhập số hoặc số không hợp lệ thì trả về 0
  if (thucHien === null || isNaN(thucHien) || !keHoach || !trongSo) {
    return { phanTram: 0, datDuoc: 0 };
  }
  const phanTram = (thucHien / keHoach) * 100;
  const datDuoc = (thucHien / keHoach) * trongSo;
  
  return { phanTram: parseFloat(phanTram.toFixed(1)), datDuoc: parseFloat(datDuoc.toFixed(2)) };
}

export const useKpiStore = create<KpiStore>((set, get) => ({
  tasks: [],

  initTasks: (serverTasks) => {
    // Chạy qua 1 lượt tính số luôn
    const mapped = serverTasks.map(t => {
      const calc = calculateFields(t.thucHien, t.keHoach, t.trongSo, t.yeuCau);
      return { ...t, ...calc };
    });
    set({ tasks: mapped });
  },

  updateThucHien: (id, value) => set((state) => {
    const newTasks = state.tasks.map(t => {
      if (t.id === id) {
        const calc = calculateFields(value, t.keHoach, t.trongSo, t.yeuCau);
        return { ...t, thucHien: value, ...calc };
      }
      return t;
    });
    return { tasks: newTasks };
  }),

  addTask: () => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        id: 'new_' + Date.now(),
        noiDung: '', ghiChu: '', donVi: '',
        keHoach: '', // Rỗng buộc NV tự điền
        thucHien: null,
        trongSo: '', // Rỗng buộc NV tự chọn
        yeuCau: 1,
        isNhiemVuCu: false,
        phanTram: 0, datDuoc: 0
      }
    ]
  })),

  // Thêm dòng báo cáo tuần cũ (lần đầu NV tự điền từ Excel sang)
  // isNhiemVuCu=true → submit sẽ ghi vào cột O = 'Báo cáo thực hiện'
  addOldTask: () => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        id: 'old_' + Date.now(),
        noiDung: '', ghiChu: '', donVi: '',
        keHoach: '', // Rỗng buộc NV tự điền
        thucHien: null,
        trongSo: '', // Rỗng buộc NV tự chọn
        yeuCau: 1,
        isNhiemVuCu: true,
        phanTram: 0, datDuoc: 0,
      }
    ]
  })),

  updateTaskField: (id, field, value) => set((state) => {
    const newTasks = state.tasks.map(t => {
      if (t.id === id) {
        const updated = { ...t, [field]: value };
        // Tự động tính toán lại nếu sửa các field liên quan số học
        if (['keHoach', 'thucHien', 'trongSo', 'yeuCau'].includes(field as string)) {
          const calc = calculateFields(updated.thucHien, updated.keHoach, updated.trongSo, updated.yeuCau);
          return { ...updated, ...calc };
        }
        return updated;
      }
      return t;
    });
    return { tasks: newTasks };
  }),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),

  getTotalScore: () => {
    return get().tasks.reduce((sum, t) => sum + t.datDuoc, 0);
  }
}));
