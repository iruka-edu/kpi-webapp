"use client";

/**
 * ScoreSummaryBar.tsx — Thanh tổng điểm tự động
 * ------------------------------------------------
 * Vai trò: Tính và hiển thị tổng điểm NV + Quản lý + bình quân.
 *          Auto-tính từ danh sách scores truyền vào.
 *
 * Props:
 *  selfScores  — Điểm NV { [criteriaIndex]: score 1-5 }
 *  mgrScores   — Điểm Quản lý { [criteriaIndex]: score 1-5 } (có thể rỗng)
 *  total       — Tổng số tiêu chí
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface ScoreSummaryBarProps {
  selfScores: Record<number, number>;
  mgrScores?: Record<number, number>;
  total: number;
}

function getVerdict(avg: number): { label: string; color: string } {
  if (avg >= 4.5) return { label: 'Xuất sắc', color: 'text-green-600' };
  if (avg >= 3.5) return { label: 'Tốt', color: 'text-blue-600' };
  if (avg >= 2.5) return { label: 'Đạt yêu cầu', color: 'text-amber-600' };
  return { label: 'Cần cải thiện', color: 'text-red-600' };
}

export default function ScoreSummaryBar({ selfScores, mgrScores = {}, total }: ScoreSummaryBarProps) {
  // Tính điểm trung bình — chỉ tính tiêu chí đã chấm
  const calcAvg = (scores: Record<number, number>): { sum: number; count: number; avg: number } => {
    const values = Object.values(scores).filter(v => v > 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    return { sum, count, avg: count > 0 ? sum / count : 0 };
  };

  const self = calcAvg(selfScores);
  const mgr = calcAvg(mgrScores);
  const hasMgr = mgr.count > 0;

  const combinedAvg = hasMgr ? (self.avg + mgr.avg) / 2 : self.avg;
  const verdict = getVerdict(combinedAvg);

  const ScoreCard = ({
    label, sum, count, total, avg, colorClass
  }: { label: string; sum: number; count: number; total: number; avg: number; colorClass: string }) => (
    <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200 text-center space-y-1.5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-4xl font-bold ${colorClass}`}>
        {avg > 0 ? avg.toFixed(1) : '—'}
      </div>
      <div className="text-xs font-medium text-slate-500">
        {count}/{total} tiêu chí đã chấm
      </div>
      {avg > 0 && (
        <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${colorClass.replace('text-', 'bg-')}`}
            style={{ width: `${(avg / 5) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
          <TrendingUp size={18} className="text-blue-600" />
        </div>
        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Tổng Điểm Kỹ Năng & Năng Lực</h3>
      </div>
      <div className="flex gap-4">
        <ScoreCard
          label="Điểm NV"
          sum={self.sum} count={self.count} total={total} avg={self.avg}
          colorClass="text-blue-600"
        />
        {hasMgr && (
          <ScoreCard
            label="Điểm Quản Lý"
            sum={mgr.sum} count={mgr.count} total={total} avg={mgr.avg}
            colorClass="text-purple-600"
          />
        )}
        {hasMgr && (
          <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200 text-center space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bình Quân</div>
            <div className={`text-4xl font-bold ${verdict.color}`}>
              {combinedAvg > 0 ? combinedAvg.toFixed(1) : '—'}
            </div>
            <div className={`text-sm font-bold ${verdict.color} mt-1`}>{verdict.label}</div>
          </div>
        )}
        {!hasMgr && self.avg > 0 && (
          <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200 text-center space-y-1.5 flex flex-col justify-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Kết Quả Sơ Bộ</div>
            <div className={`text-xl font-bold ${verdict.color}`}>{verdict.label}</div>
            <div className="text-xs font-medium text-slate-400 mt-1">Chờ Quản lý chấm điểm</div>
          </div>
        )}
      </div>
    </div>
  );
}
