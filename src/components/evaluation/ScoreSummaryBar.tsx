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

// Xếp loại dựa trên điểm bình quân
function getVerdict(avg: number): { label: string; color: string } {
  if (avg >= 4.5) return { label: 'Xuất sắc', color: 'text-green-400' };
  if (avg >= 3.5) return { label: 'Tốt', color: 'text-blue-400' };
  if (avg >= 2.5) return { label: 'Đạt yêu cầu', color: 'text-yellow-400' };
  return { label: 'Cần cải thiện', color: 'text-red-400' };
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
    <div className="flex-1 bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 text-center space-y-1">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>
        {avg > 0 ? avg.toFixed(1) : '—'}
      </div>
      <div className="text-xs text-slate-500">
        {count}/{total} tiêu chí đã chấm
      </div>
      {avg > 0 && (
        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${colorClass.replace('text-', 'bg-')}`}
            style={{ width: `${(avg / 5) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-blue-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Tổng Điểm</h3>
      </div>
      <div className="flex gap-3">
        <ScoreCard
          label="Điểm NV"
          sum={self.sum} count={self.count} total={total} avg={self.avg}
          colorClass="text-blue-400"
        />
        {hasMgr && (
          <ScoreCard
            label="Điểm Quản Lý"
            sum={mgr.sum} count={mgr.count} total={total} avg={mgr.avg}
            colorClass="text-purple-400"
          />
        )}
        {hasMgr && (
          <div className="flex-1 bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 text-center space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bình Quân</div>
            <div className={`text-3xl font-bold ${verdict.color}`}>
              {combinedAvg > 0 ? combinedAvg.toFixed(1) : '—'}
            </div>
            <div className={`text-sm font-semibold ${verdict.color}`}>{verdict.label}</div>
          </div>
        )}
        {!hasMgr && self.avg > 0 && (
          <div className="flex-1 bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 text-center space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kết Quả Sơ Bộ</div>
            <div className={`text-2xl font-bold ${verdict.color}`}>{verdict.label}</div>
            <div className="text-xs text-slate-500">Chờ Quản lý chấm điểm</div>
          </div>
        )}
      </div>
    </div>
  );
}
