/**
 * mapApiToData — convert GAS get_full_evaluation response → EvaluationData
 * --------------------------------------------------------------------------
 * Dùng chung cho mọi trang phiếu (NV / QL / CEO / HR result / NV final) để
 * giao diện EvaluationForm đồng nhất giữa các vai. Logic phân quyền/chế độ
 * read-only đã có trong permissions.ts (theo viewMode + status).
 */

import type { EvaluationData } from './types';

interface MapOptions {
  /** Khi page biết sẵn (vd: NV form pass `&is_ceo_direct=1`) */
  forceCeoDirect?: boolean;
  /** discord_id của người mở link — dùng làm fallback derive is_ceo_direct
   *  (so với manager_discord_id của phiếu) khi server không trả flag. */
  openerDiscordId?: string;
}

export function mapApiToData(json: any, evalId: string, opts: MapOptions = {}): EvaluationData {
  const mgrId = json.info?.manager_discord_id || json.manager_discord_id || '';
  const ceoIdEnv = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
  let isCeoDirect: boolean;
  if (typeof opts.forceCeoDirect === 'boolean') {
    isCeoDirect = opts.forceCeoDirect;
  } else if (typeof json.is_ceo_direct === 'boolean') {
    isCeoDirect = json.is_ceo_direct;
  } else {
    // Fallback: so manager với người mở link, hoặc với env (cuối cùng)
    isCeoDirect = !!(mgrId && (
      (opts.openerDiscordId && mgrId === opts.openerDiscordId) ||
      (ceoIdEnv && mgrId === ceoIdEnv)
    ));
  }
  return {
    eval_id: evalId,
    status: json.status || '',
    info: {
      name: json.info?.name || json.name || '',
      discord_id: json.info?.discord_id || json.discord_id || '',
      dept: json.info?.dept || json.dept || '',
      role: json.info?.role || json.role || '',
      manager_name: json.info?.manager_name || json.manager_name || '',
      manager_discord_id: mgrId,
      hr_discord_id: json.info?.hr_discord_id || json.hr_discord_id || '',
      trial_start: json.info?.trial_start || json.trial_start || '',
      trial_end: json.info?.trial_end || json.trial_end || '',
      eval_date: json.info?.eval_date || json.eval_date || new Date().toISOString().slice(0, 10),
    },
    work_items: (json.work_items || json.work_summary || []).map((w: any) => ({
      task: w.task || w.area || '',
      details: w.details || w.detail || '',
      result: w.result || '',
    })),
    criteria: (json.criteria || []).map((c: any) => ({
      name: c.name || '',
      expectation: c.expectation || '',
      group: c.group || '💡 TIÊU CHÍ KHÁC',
      source: c.source,
      self_score: Number(c.self_score) || 0,
      mgr_score: Number(c.mgr_score) || 0,
      note: c.note || '',
    })),
    proposal: {
      salary_expectation: json.proposal?.salary_expectation || json.proposals?.salary_expectation || '',
      training_request:   json.proposal?.training_request   || json.proposals?.training_request   || '',
      feedback:           json.proposal?.feedback           || json.proposals?.feedback           || '',
    },
    conclusion: {
      mgr_comment:         json.mgr_comment || '',
      mgr_expectation:     json.mgr_expectation || '',
      mgr_salary_proposal: json.mgr_salary_proposal || '',
      mgr_decision:        (json.mgr_decision || json.decision || '') as any,
      ceo_comment:         json.ceo_comment || '',
    },
    signatures: json.signatures || {},
    is_ceo_direct: isCeoDirect,
  };
}
