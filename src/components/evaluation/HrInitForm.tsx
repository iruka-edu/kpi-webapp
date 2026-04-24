"use client";

/**
 * HrInitForm.tsx — Form HR tạo phiếu đánh giá nhân sự
 * -------------------------------------------------------
 * Đã được đắp giao diện chuẩn Pixel-Perfect từ evaluation-mockup.html
 */

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Plus, PlusCircle, Send, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const MANAGER_LIST = [
  { name: 'CEO (Mr. Đào)', discord_id: process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '' },
  { name: 'Tùng', discord_id: process.env.NEXT_PUBLIC_TUNG_DISCORD_ID || '' },
  { name: 'Inh', discord_id: process.env.NEXT_PUBLIC_INH_DISCORD_ID || '' },
];

const DEFAULT_CRITERIA = [
  { name: 'Kiến thức chuyên môn / Nghiệp vụ', expectation: 'Nắm vững kiến thức nền tảng cho vị trí, có thể áp dụng vào công việc thực tế.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN' },
  { name: 'Hiểu quy trình & văn hóa công ty', expectation: 'Nắm rõ cách làm việc, quy trình nội bộ, và hòa nhập văn hóa IruKa trong giai đoạn thử việc.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN' },
  { name: 'Tốc độ học hỏi & thích nghi', expectation: 'Khả năng tiếp thu công việc mới, platform nội bộ, công cụ AI và phần mềm nghiệp vụ.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN' },
  { name: 'Giao tiếp & Phối hợp nhóm', expectation: 'Trao đổi rõ ràng, lắng nghe tốt, phối hợp với đồng nghiệp và các bộ phận hiệu quả.', group: '💪 3.2 KỸ NĂNG' },
  { name: 'Quản lý thời gian & Deadline', expectation: 'Hoàn thành công việc đúng hạn, biết ưu tiên và báo cáo kịp thời khi có vướng mắc.', group: '💪 3.2 KỸ NĂNG' },
  { name: 'Sử dụng công cụ AI & Năng suất', expectation: 'Ứng dụng AI vào công việc hằng ngày để tối ưu năng suất, chất lượng đầu ra.', group: '💪 3.2 KỸ NĂNG' },
  { name: 'Tính kỷ luật & Gương mẫu', expectation: 'Đúng giờ, tuân thủ các quy định, tác phong làm việc chuyên nghiệp.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG' },
  { name: 'Tinh thần trách nhiệm', expectation: 'Chịu trách nhiệm với kết quả công việc đến cùng, không đổ lỗi.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG' },
  { name: 'Chủ động & Nhiệt tình', expectation: 'Tự giác tìm việc, đề xuất cải tiến, không chờ nhắc nhở liên tục.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG' },
];

const emptyCriteria = () => ({ name: '', expectation: '', group: '💡 TIÊU CHÍ KHÁC' });

interface Criteria {
  name: string;
  expectation: string;
  group: string;
}

// Cấu trúc 1 đầu việc trong mục "Tổng kết công việc"
interface WorkItem {
  task: string;      // Mảng việc lớn
  details: string;   // Chi tiết các đầu việc nhỏ
  result: string;    // Kết quả tự đánh giá (NV điền sau)
}

interface FormData {
  name: string;
  discord_id: string;
  dept: string;
  role: string;
  manager_name: string;
  manager_discord_id: string;
  trial_start: string;
  trial_end: string;
  eval_date: string;
  hr_discord_id: string;
  criteria: Criteria[];
  work_items: WorkItem[];
}

// Cấu trúc 1 nhân viên từ /api/members
interface MemberOption {
  name: string;
  username: string;
  discordId: string;
  dept: string;
  contractType: string;
  joinedAt: string | null;
  managerName: string;
  managerDiscordId: string;
}

interface HrInitFormProps {
  hrDiscordId: string;
  dashboardPassword: string;
}

export default function HrInitForm({ hrDiscordId, dashboardPassword }: HrInitFormProps) {
  // ── Đọc URL params bằng useSearchParams (Next.js App Router — đúng cách, tránh lỗi SSR) ──
  const urlParams = useSearchParams();
  const urlToken        = urlParams.get('token')          || '';
  const urlHrId         = urlParams.get('hr_discord_id')  || hrDiscordId;
  const preEmpDiscordId = urlParams.get('emp_discord_id') || '';
  const preEmpName      = urlParams.get('emp_name')       || '';
  const preEmpDept      = urlParams.get('emp_dept')       || '';
  const preEmpJoined    = urlParams.get('emp_joined')     || '';
  const preMgrName      = urlParams.get('mgr_name')       || '';
  const preMgrDiscordId = urlParams.get('mgr_discord_id') || '';

  // Form state — khởi tạo rỗng, sẽ được fill bằng useEffect sau khi params sẵn sàng
  const [form, setForm] = useState<FormData>({
    name: '',
    discord_id: '',
    dept: '',
    role: '',
    manager_name: MANAGER_LIST[0].name,
    manager_discord_id: MANAGER_LIST[0].discord_id,
    trial_start: '',
    trial_end: '',
    eval_date: new Date().toISOString().slice(0, 10),
    hr_discord_id: hrDiscordId,
    criteria: [...DEFAULT_CRITERIA],
    work_items: [
      { task: 'Nghiên cứu & nắm bắt sản phẩm', details: 'Tìm hiểu toàn bộ sản phẩm IruKa, quy trình nội bộ, công cụ AI sử dụng hàng ngày', result: '' },
      { task: 'Thực hiện task được giao', details: 'Hoàn thành các đầu công việc được phân công trong giai đoạn thử việc', result: '' },
    ],
  });

  // ── Sau khi component mount, fill form từ URL params (nếu có) ──
  useEffect(() => {
    if (preEmpName || preEmpDiscordId) {
      setForm(prev => ({
        ...prev,
        name: preEmpName || prev.name,
        discord_id: preEmpDiscordId || prev.discord_id,
        dept: preEmpDept || prev.dept,
        manager_name: preMgrName || prev.manager_name,
        manager_discord_id: preMgrDiscordId || prev.manager_discord_id,
        trial_start: preEmpJoined ? preEmpJoined.slice(0, 10) : prev.trial_start,
      }));
    }
  // Chỉ chạy 1 lần sau mount — params từ URL không thay đổi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preEmpName, preEmpDiscordId]);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Employee Picker state ──────────────────────────────────────
  const [memberList, setMemberList] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);

  // Sau mount: set selectedMember và searchQuery từ URL params (nếu có)
  useEffect(() => {
    if (preEmpDiscordId) {
      setSearchQuery(preEmpName);
      setSelectedMember({
        name: preEmpName, username: '', discordId: preEmpDiscordId,
        dept: preEmpDept, contractType: 'fulltime',
        joinedAt: preEmpJoined || null,
        managerName: preMgrName, managerDiscordId: preMgrDiscordId,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preEmpDiscordId]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load danh sách nhân viên từ /api/members khi form mount
  // Ưu tiên auth bằng token URL (mở từ Discord), fallback sang dashboardPassword
  useEffect(() => {
    setLoadingMembers(true);
    const fetchUrl = urlToken && urlHrId
      ? `/api/members?token=${encodeURIComponent(urlToken)}&hr_discord_id=${encodeURIComponent(urlHrId)}`
      : '/api/members';
    const headers: Record<string, string> = {};
    if (!urlToken && dashboardPassword) headers['x-dashboard-auth'] = dashboardPassword;

    fetch(fetchUrl, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.members) setMemberList(data.members);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const setField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const selectManager = (managerName: string) => {
    const mgr = MANAGER_LIST.find(m => m.name === managerName);
    if (mgr) {
      setForm(prev => ({
        ...prev,
        manager_name: mgr.name,
        manager_discord_id: mgr.discord_id,
      }));
    }
  };

  // Khi HR chọn nhân viên từ dropdown → auto-fill toàn bộ thông tin
  const selectEmployee = (member: MemberOption) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setShowDropdown(false);

    // Tìm manager trong MANAGER_LIST theo discordId (ưu tiên)
    // hoặc dùng managerName từ members.json nếu không match
    const mgrInList = MANAGER_LIST.find(m => m.discord_id === member.managerDiscordId);
    const mgrName = mgrInList ? mgrInList.name : (member.managerName || MANAGER_LIST[0].name);
    const mgrId   = mgrInList ? mgrInList.discord_id : (member.managerDiscordId || MANAGER_LIST[0].discord_id);

    // Chuyển joinedAt ISO → YYYY-MM-DD cho input[type=date]
    const trialStart = member.joinedAt
      ? member.joinedAt.slice(0, 10)
      : '';

    setForm(prev => ({
      ...prev,
      name:               member.name,
      discord_id:         member.discordId,
      dept:               member.dept,
      manager_name:       mgrName,
      manager_discord_id: mgrId,
      trial_start:        trialStart,
    }));
  };

  const addCriteria = () => {
    setForm(prev => ({ ...prev, criteria: [...prev.criteria, emptyCriteria()] }));
  };

  const removeCriteria = (index: number) => {
    setForm(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index),
    }));
  };

  const updateCriteria = (index: number, field: keyof Criteria, value: string) => {
    setForm(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  // ── Hàm xử lý bảng Đầu Việc (Mục 2) ──────────────────────────
  const addWorkItem = () => {
    setForm(prev => ({ ...prev, work_items: [...prev.work_items, { task: '', details: '', result: '' }] }));
  };

  const removeWorkItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      work_items: prev.work_items.filter((_, i) => i !== index),
    }));
  };

  const updateWorkItem = (index: number, field: keyof WorkItem, value: string) => {
    setForm(prev => ({
      ...prev,
      work_items: prev.work_items.map((w, i) => i === index ? { ...w, [field]: value } : w),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluation/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardPassword,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi tạo phiếu');

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CheckCircle size={64} className="text-[#16a34a]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã tạo phiếu thành công!</h2>
        <p className="text-[#6b7280] max-w-md">
          Bot Discord đã gửi link form đến <strong className="text-[#1e3a5f]">{form.manager_name}</strong> để điền công việc.
          CEO đã được CC thông báo.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm(f => ({ ...f, name: '', discord_id: '', dept: '', role: '', trial_start: '', trial_end: '', criteria: [...DEFAULT_CRITERIA] })); }}
          className="mt-4 px-6 py-2 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] text-white rounded-[10px] font-black border-b-[4px] border-[#1e3a5f] hover:scale-[1.03] active:scale-[0.98] transition-all"
        >
          Tạo phiếu mới
        </button>
      </div>
    );
  }

  // Nhóm criteria theo group để render giống table
  const groupedCriteria: Record<string, { item: Criteria, index: number }[]> = {};
  form.criteria.forEach((c, index) => {
    if (!groupedCriteria[c.group]) groupedCriteria[c.group] = [];
    groupedCriteria[c.group].push({ item: c, index });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm font-medium">
          {errorMsg}
        </div>
      )}



      {/* ── 1. THÔNG TIN CHUNG ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-[15px] font-black text-[#1e3a5f] uppercase tracking-wide">1. Thông Tin Chung</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ── Ô Họ và Tên NV — tích hợp Employee Picker ── */}
            <div className="flex flex-col gap-1.5" ref={pickerRef}>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em] flex items-center gap-1.5">
                Họ và tên NV <span className="text-[#dc2626]">*</span>
                {loadingMembers && <Loader2 size={11} className="animate-spin text-blue-400" />}
                {memberList.length > 0 && !loadingMembers && (
                  <span className="ml-auto text-[10px] text-slate-400 font-normal normal-case tracking-normal">{memberList.length} nhân viên</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={searchQuery || form.name}
                  onChange={e => { setSearchQuery(e.target.value); setForm(prev => ({ ...prev, name: e.target.value })); setShowDropdown(true); }}
                  onFocus={() => { if (memberList.length > 0) setShowDropdown(true); }}
                  placeholder={loadingMembers ? 'Đang tải danh sách...' : 'Gõ tên hoặc chọn từ danh sách...'}
                  className="font-sans text-[13px] border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] pr-[28px] outline-none text-[#111] font-medium bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all w-full"
                />
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(null); setSearchQuery(''); setForm(prev => ({ ...prev, name: '', discord_id: '', dept: '', trial_start: '' })); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors text-base leading-none"
                    title="Xóa chọn"
                  >×</button>
                )}
                {/* Dropdown danh sách nhân viên */}
                {showDropdown && !loadingMembers && memberList.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#d1d5db] rounded-[8px] shadow-lg max-h-52 overflow-y-auto">
                    {memberList
                      .filter(m =>
                        !searchQuery ||
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.dept.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(member => (
                        <button
                          key={member.discordId}
                          type="button"
                          onClick={() => selectEmployee(member)}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#eff6ff] transition-colors border-b border-[#f1f5f9] last:border-0 flex items-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-black text-[11px] shrink-0">
                            {member.name.split(' ').pop()?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-slate-800 truncate">{member.name}</div>
                          </div>
                          {member.joinedAt && (
                            <div className="text-[10px] text-slate-400 shrink-0">
                              {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </button>
                      ))}
                    {memberList.filter(m =>
                      !searchQuery ||
                      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.dept.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-[13px] text-slate-400 text-center">Không tìm thấy nhân viên</div>
                    )}
                  </div>
                )}
              </div>
              {/* Preview mini khi đã chọn */}
              {selectedMember && (
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mt-0.5">
                  {selectedMember.joinedAt && <span className="bg-[#f0f9ff] border border-[#bae6fd] rounded px-2 py-0.5">📅 {new Date(selectedMember.joinedAt).toLocaleDateString('vi-VN')}</span>}
                </div>
              )}
            </div>
            {/* Discord ID và Vị trí đã được ẩn theo yêu cầu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em]">Ngày bắt đầu thử việc <span className="text-[#dc2626]">*</span></label>
              <input type="date" required value={form.trial_start} onChange={e => setField('trial_start', e.target.value)} className="font-sans text-[13px] border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] font-medium bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em]">Ngày kết thúc thử việc</label>
              <input type="date" value={form.trial_end} onChange={e => setField('trial_end', e.target.value)} className="font-sans text-[13px] border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] font-medium bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em]">Bộ phận <span className="text-[#dc2626]">*</span></label>
              <input type="text" required value={form.dept} onChange={e => setField('dept', e.target.value)} placeholder="Kỹ thuật / Marketing / HCNS..." className="font-sans text-[13px] border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] font-medium bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em]">Quản lý trực tiếp <span className="text-[#dc2626]">*</span></label>
              <select value={form.manager_name} onChange={e => selectManager(e.target.value)} className="font-sans text-[13px] border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] font-medium bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all w-full cursor-pointer">
                {MANAGER_LIST.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-[#d1d5db] text-[12px] text-[#6b7280] italic flex items-center gap-1.5">
            <span>📅 Ngày thực hiện đánh giá:</span>
            <strong className="text-[#1e3a5f] not-italic">{form.eval_date}</strong>
          </div>
        </div>
      </div>

      {/* ── THANG ĐIỂM ── */}
      <div className="flex flex-wrap justify-center items-center gap-2 px-5">
        <span className="text-[12px] font-bold text-[#6b7280] mr-1">Thang điểm:</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold"><span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black text-white bg-[#dc2626]">1</span><span className="text-[#374151]">Chưa đạt</span></span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold"><span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black text-white bg-[#f97316]">2</span><span className="text-[#374151]">Đạt một phần</span></span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold"><span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black text-white bg-[#eab308]">3</span><span className="text-[#374151]">Đạt</span></span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold"><span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black text-white bg-[#22c55e]">4</span><span className="text-[#374151]">Tốt</span></span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold"><span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black text-white bg-[#16a34a]">5</span><span className="text-[#374151]">Xuất sắc</span></span>
      </div>

      {/* ── 2. TỔNG KẾT CÔNG VIỆC — HR/Quản lý có thể thêm/sửa/xóa ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗂️</span>
            <span className="text-[15px] font-black text-[#1e3a5f] uppercase tracking-wide">2. Tổng Kết Công Việc Thời Gian Thử Việc</span>
            <span className="text-[11px] font-medium text-[#6b7280] ml-2">(HR điền sẵn, Quản lý &amp; Nhân viên bổ sung sau)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[40px] text-center">STT</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[200px]">Mảng việc lớn</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[260px]">Chi tiết các đầu việc nhỏ</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[160px] opacity-70">Kết quả tự đánh giá</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[44px] text-center">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {form.work_items.map((item, index) => (
                <tr key={index} className="hover:bg-[#eff6ff] transition-colors">
                  <td className="border border-[#d1d5db] p-[6px] text-center font-bold text-[#6b7280] w-[40px]">{index + 1}</td>
                  <td className="border border-[#d1d5db] p-[6px]">
                    <textarea
                      rows={2}
                      value={item.task}
                      onChange={e => updateWorkItem(index, 'task', e.target.value)}
                      placeholder="Nhập mảng việc lớn..."
                      className="w-full font-sans text-[13px] border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] font-bold bg-transparent focus:bg-white resize-y min-h-[44px] transition-all"
                    />
                  </td>
                  <td className="border border-[#d1d5db] p-[6px]">
                    <textarea
                      rows={2}
                      value={item.details}
                      onChange={e => updateWorkItem(index, 'details', e.target.value)}
                      placeholder="Ghi chi tiết các đầu việc nhỏ..."
                      className="w-full font-sans text-[12px] border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] bg-transparent focus:bg-white resize-y min-h-[44px] transition-all leading-relaxed"
                    />
                  </td>
                  <td className="border border-[#d1d5db] p-[6px] bg-[#f9fafb]">
                    <div className="text-[11px] text-[#9ca3af] italic px-1">Nhân viên tự điền...</div>
                  </td>
                  <td className="border border-[#d1d5db] p-[6px] text-center">
                    <button
                      type="button"
                      onClick={() => removeWorkItem(index)}
                      className="text-red-400 hover:text-red-700 p-2 transition-colors"
                      title="Xóa đầu việc"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {form.work_items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 text-sm italic border border-[#d1d5db]">
                    Chưa có đầu việc nào. Nhấn &quot;Thêm đầu việc&quot; để bắt đầu.
                  </td>
                </tr>
              )}
              {/* Nút thêm cuối bảng — đồng bộ với ReportGrid */}
              <tr>
                <td colSpan={5} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-xs"
                  >
                    <PlusCircle size={15} className="text-[#1e3a5f]" />
                    Thêm đầu việc
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. ĐÁNH GIÁ NĂNG LỰC (MẪU) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-[15px] font-black text-[#1e3a5f] uppercase tracking-wide">3. Đánh Giá Năng Lực (Tiêu Chí Mẫu)</span>
          </div>
          <button type="button" onClick={addCriteria} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#1e3a5f] bg-white border border-[#d1d5db] rounded-[8px] hover:bg-[#f8fafc] hover:border-[#1e3a5f] transition-colors">
            <Plus size={14} /> Thêm tiêu chí
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[40px] text-center">STT</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[250px]">Tiêu chí đánh giá</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-center min-w-[250px]">Mô tả kỳ vọng</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[90px] text-center opacity-70">Tự ĐG</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[90px] text-center opacity-70">QL ĐG</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[44px] text-center">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedCriteria).map(([group, items]) => (
                <React.Fragment key={group}>
                  <tr>
                    <td colSpan={6} className="bg-[#1e3a5f]/5 text-[#1e3a5f] font-black text-[12px] uppercase tracking-[0.06em] p-[8px_12px] border border-[#d1d5db]">
                      {group}
                    </td>
                  </tr>
                  {items.map(({ item, index }) => (
                    <tr key={index} className="hover:bg-[#eff6ff] transition-colors">
                      <td className="border border-[#d1d5db] p-[6px] text-center font-bold text-[#6b7280] w-[40px]">{index + 1}</td>
                      <td className="border border-[#d1d5db] p-[6px]">
                        <textarea
                          rows={2}
                          value={item.name}
                          onChange={e => updateCriteria(index, 'name', e.target.value)}
                          placeholder="Nhập tên tiêu chí..."
                          className="w-full font-sans text-[13px] border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] font-bold bg-transparent focus:bg-white resize-y min-h-[44px] transition-all"
                        />
                      </td>
                      <td className="border border-[#d1d5db] p-[6px]">
                        <textarea
                          rows={2}
                          value={item.expectation}
                          onChange={e => updateCriteria(index, 'expectation', e.target.value)}
                          placeholder="Mô tả kỳ vọng..."
                          className="w-full font-sans text-[12px] border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] bg-transparent focus:bg-white resize-y min-h-[44px] transition-all leading-relaxed"
                        />
                      </td>
                      <td className="border border-[#d1d5db] p-[6px] bg-[#f9fafb]"></td>
                      <td className="border border-[#d1d5db] p-[6px] bg-[#f9fafb]"></td>
                      <td className="border border-[#d1d5db] p-[6px] text-center">
                        <button
                          type="button"
                          onClick={() => removeCriteria(index)}
                          className="w-[28px] h-[28px] inline-flex items-center justify-center rounded-[6px] text-[#fca5a5] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                          title="Xóa"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {form.criteria.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-sm border border-[#d1d5db]">
                    Chưa có tiêu chí mẫu. Hãy thêm tiêu chí mới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PREVIEW KHÁC ── */}
      <div className="opacity-70 cursor-not-allowed grayscale-[20%] space-y-6">
        {/* 4. TỔNG ĐIỂM */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden flex flex-wrap divide-x divide-[#d1d5db]">
          <div className="p-4 flex-1 min-w-[150px]">
            <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em] mb-1">Điểm nhân viên</div>
            <div className="text-[28px] font-black text-[#111] leading-none">—</div>
          </div>
          <div className="p-4 flex-1 min-w-[150px]">
            <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em] mb-1">Điểm quản lý</div>
            <div className="text-[28px] font-black text-[#111] leading-none">—</div>
          </div>
          <div className="p-4 flex-1 min-w-[150px] bg-[#eff6ff]">
            <div className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-[0.04em] mb-1">Kết quả sơ bộ</div>
            <span className="inline-block mt-1 px-3 py-1 bg-[#d1d5db] text-[#374151] rounded-full text-[12px] font-bold">Chưa đánh giá</span>
          </div>
        </div>

        {/* 5. QUẢN LÝ ĐÁNH GIÁ & KẾT LUẬN */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-lg">👔</span>
            <span className="text-[15px] font-black text-[#1e3a5f] uppercase tracking-wide">Quản Lý Đánh Giá & Kết Luận</span>
          </div>
          <div className="p-5">
            <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.04em] mb-3">Quyết định</div>
            <div className="flex flex-wrap gap-2">
              <div className="border-2 border-[#d1d5db] rounded-[8px] p-[10px_16px] flex items-center gap-2 opacity-60">
                <div className="w-4 h-4 rounded-full border-2 border-[#d1d5db]"></div>
                <div>
                  <div className="text-[13px] font-bold text-[#111]">CHÍNH THỨC</div>
                  <div className="text-[11px] font-medium text-[#6b7280]">Đạt yêu cầu, ký HĐ chính thức</div>
                </div>
              </div>
              <div className="border-2 border-[#d1d5db] rounded-[8px] p-[10px_16px] flex items-center gap-2 opacity-60">
                <div className="w-4 h-4 rounded-full border-2 border-[#d1d5db]"></div>
                <div>
                  <div className="text-[13px] font-bold text-[#111]">GIA HẠN THỬ VIỆC</div>
                  <div className="text-[11px] font-medium text-[#6b7280]">Theo dõi thêm</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. KÝ XÁC NHẬN */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-lg">✍️</span>
            <span className="text-[15px] font-black text-[#1e3a5f] uppercase tracking-wide">Ký Xác Nhận</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-[1.5px] border-[#d1d5db] rounded-[8px] p-4 text-center bg-[#f9fafb]">
              <div className="text-[11px] font-black uppercase text-[#1e3a5f] tracking-[0.06em] mb-2">Nhân Sự</div>
              <div className="h-[60px] border-b-[1.5px] border-dashed border-[#d1d5db] mb-2"></div>
              <div className="text-[11px] text-[#9ca3af] italic">Ký, ghi rõ họ tên</div>
            </div>
            <div className="border-[1.5px] border-[#d1d5db] rounded-[8px] p-4 text-center bg-[#f9fafb]">
              <div className="text-[11px] font-black uppercase text-[#1e3a5f] tracking-[0.06em] mb-2">Quản Lý</div>
              <div className="h-[60px] border-b-[1.5px] border-dashed border-[#d1d5db] mb-2"></div>
              <div className="text-[11px] text-[#9ca3af] italic">Ký, ghi rõ họ tên</div>
            </div>
            <div className="border-[1.5px] border-[#d1d5db] rounded-[8px] p-4 text-center bg-[#f9fafb]">
              <div className="text-[11px] font-black uppercase text-[#1e3a5f] tracking-[0.06em] mb-2">HCNS</div>
              <div className="h-[60px] border-b-[1.5px] border-dashed border-[#d1d5db] mb-2"></div>
              <div className="text-[11px] text-[#9ca3af] italic">Ký, ghi rõ họ tên</div>
            </div>
            <div className="border-[1.5px] border-[#d1d5db] rounded-[8px] p-4 text-center bg-[#f9fafb]">
              <div className="text-[11px] font-black uppercase text-[#1e3a5f] tracking-[0.06em] mb-2">Giám Đốc</div>
              <div className="h-[60px] border-b-[1.5px] border-dashed border-[#d1d5db] mb-2"></div>
              <div className="text-[11px] text-[#9ca3af] italic">Ký, ghi rõ họ tên</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR (FIXED) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-[2px] border-[#1e3a5f] shadow-[0_-8px_20px_rgba(0,0,0,0.1)] px-6 py-3 flex justify-between items-center z-50">
        <div className="hidden md:flex items-center gap-4 text-[12px] text-[#6b7280]">
          <div>Đang khởi tạo: <strong className="text-[#1e3a5f] text-[13px]">{form.name || '(Chưa nhập tên)'}</strong></div>
          <div className="w-[4px] h-[4px] rounded-full bg-[#d1d5db]"></div>
          <div>Bộ phận: <strong className="text-[#1e3a5f]">{form.dept || '--'}</strong></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] text-white rounded-[10px] font-black text-[15px] border-b-[4px] border-[#1e3a5f] shadow-[0_8px_20px_rgba(59,130,246,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {status === 'submitting' ? (
              <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
            ) : (
              <><Send size={18} /> GỬI TẠO PHIẾU</>
            )}
          </button>
        </div>
      </div>

    </form>
  );
}
