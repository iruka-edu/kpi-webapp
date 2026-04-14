/**
 * MonthlyExtras.tsx — Khối Thành tựu & Khó khăn + Tự đánh giá Sao
 * Bám sát mockup HTML pixel-perfect
 */

import React from 'react';
import { useKpiStore } from '@/store/kpiStore';
import { Trophy, Star, Lightbulb, Target, Ban, MessageSquare } from 'lucide-react';

const starLabels = ['', '1 / 5 — Chưa đạt', '2 / 5 — Đạt', '3 / 5 — Tốt', '4 / 5 — Rất tốt', '5 / 5 — Xuất sắc'];

export default function MonthlyExtras() {
  const { monthlyData, updateMonthlyField } = useKpiStore();

  return (
    <div className="flex flex-col gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      
      {/* ── BLOCK 3: THÀNH TỰU & KHÓ KHĂN ────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-3.5 flex items-center gap-2">
          <Trophy className="text-amber-600 w-5 h-5" />
          <span className="font-extrabold text-[13px] text-amber-800 uppercase tracking-wider">Thành tựu nổi bật &amp; Khó khăn trong tháng</span>
        </div>
        
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Star className="text-amber-500 w-3.5 h-3.5" /> ⭐ Thành tựu / Kết quả nổi bật
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm font-semibold border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 transition placeholder:font-normal placeholder:text-gray-300"
              placeholder="VD: Hoàn thành toàn bộ bộ banner tháng 3 trước deadline 2 ngày..."
              value={monthlyData.achievements}
              onChange={(e) => updateMonthlyField('achievements', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Ban className="text-red-500 w-3.5 h-3.5" /> ⛔ Khó khăn / Vướng mắc gặp phải
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm font-semibold border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 transition placeholder:font-normal placeholder:text-gray-300"
              placeholder="VD: Video TikTok 2 clip bị trễ do chờ approval content..."
              value={monthlyData.difficulties}
              onChange={(e) => updateMonthlyField('difficulties', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Lightbulb className="text-blue-500 w-3.5 h-3.5" /> 💡 Đề xuất cải tiến / Cần hỗ trợ gì?
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm font-semibold border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 transition placeholder:font-normal placeholder:text-gray-300"
              placeholder="VD: Cần thêm account Canva Pro để sản xuất nhanh hơn..."
              value={monthlyData.proposals}
              onChange={(e) => updateMonthlyField('proposals', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Target className="text-green-600 w-3.5 h-3.5" /> 🎯 Mục tiêu ưu tiên tháng tới
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm font-semibold border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 transition placeholder:font-normal placeholder:text-gray-300"
              placeholder="VD: Ra mắt series blog 5 bài về STEM, đạt 10k lượt đọc..."
              value={monthlyData.priorities}
              onChange={(e) => updateMonthlyField('priorities', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── BLOCK 4: TỰ ĐÁNH GIÁ ────────────────────────── */}
      <div className="border border-indigo-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-3.5 flex items-center gap-2">
          <MessageSquare className="text-indigo-600 w-5 h-5" />
          <span className="font-extrabold text-[13px] text-indigo-800 uppercase tracking-wider">Tự đánh giá mức độ hoàn thành tháng</span>
        </div>
        
        <div className="p-6 flex items-center gap-8 flex-wrap">
          <div>
            <div className="text-[14px] font-bold text-[#1e3a5f]">Bạn tự chấm điểm tháng này:</div>
            <div className="text-[12px] text-gray-400 mt-1 font-medium">1 = Chưa đạt · 2 = Đạt · 3 = Tốt · 4 = Rất tốt · 5 = Xuất sắc</div>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => updateMonthlyField('rating', i)}
                className={`text-3xl transition-all duration-150 transform hover:scale-110 active:scale-95 ${
                  i <= monthlyData.rating ? 'opacity-100 scale-110' : 'opacity-20 grayscale'
                }`}
              >
                ⭐
              </button>
            ))}
          </div>

          <div className="flex flex-col min-w-[120px]">
            <div className="text-[15px] font-black text-indigo-700 leading-tight">
              {starLabels[monthlyData.rating]}
            </div>
            <div className="text-[12px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">CEO sẽ xem xét & Duyệt sau</div>
          </div>
        </div>
      </div>

    </div>
  );
}
