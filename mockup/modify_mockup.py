import re

file_path = '/Users/user/Desktop/work-space/cong-nghe/kpi-webapp/mockup/evaluation-mockup.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace all <div class="criteria-name">...</div> with textarea
content = re.sub(
    r'<div class="criteria-name">(.*?)</div>',
    r'<textarea class="criteria-name" rows="2" style="width: 100%; border: 1px dashed var(--gray-border); border-radius: 6px; padding: 6px; font-family: inherit; font-size: 14px; resize: vertical; min-height: 44px; font-weight: 700; background: transparent;">\1</textarea>',
    content,
    flags=re.DOTALL
)

# 2. total-box replacements
trial_original = """        <div>
          <div class="total-label">Điểm quản lý</div>
          <div class="total-val total-val-trial" id="trial-total">—</div>
          <div class="total-sub">/ 45 điểm tối đa (9 tiêu chí × 5)</div>
        </div>"""
trial_replacement = """        <div>
          <div class="total-label">Điểm nhân viên</div>
          <div class="total-val total-val-trial" id="trial-self-total">—</div>
          <div class="total-sub">/ 45 điểm tối đa (9 tiêu chí × 5)</div>
        </div>
        <div>
          <div class="total-label">Điểm quản lý</div>
          <div class="total-val total-val-trial" id="trial-total">—</div>
          <div class="total-sub">/ 45 điểm tối đa (9 tiêu chí × 5)</div>
        </div>"""
content = content.replace(trial_original, trial_replacement)

period_original = """        <div>
          <div class="total-label">Điểm quản lý</div>
          <div class="total-val total-val-period" id="period-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa (11 tiêu chí × 5)</div>
        </div>"""
period_replacement = """        <div>
          <div class="total-label">Điểm nhân viên</div>
          <div class="total-val total-val-period" id="period-self-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa (11 tiêu chí × 5)</div>
        </div>
        <div>
          <div class="total-label">Điểm quản lý</div>
          <div class="total-val total-val-period" id="period-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa (11 tiêu chí × 5)</div>
        </div>"""
content = content.replace(period_original, period_replacement)

semi_original = """        <div>
          <div class="total-label">Tổng điểm quản lý</div>
          <div class="total-val total-val-semi" id="semi-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa</div>
        </div>"""
semi_replacement = """        <div>
          <div class="total-label">Tổng điểm nhân viên</div>
          <div class="total-val total-val-semi" id="semi-self-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa</div>
        </div>
        <div>
          <div class="total-label">Tổng điểm quản lý</div>
          <div class="total-val total-val-semi" id="semi-total">—</div>
          <div class="total-sub">/ 55 điểm tối đa</div>
        </div>"""
content = content.replace(semi_original, semi_replacement)

# 3. NHÂN SỰ section
sig_original = """<div class="sig-role">🧑‍💼 Nhân Sự</div>
              <div class="sig-line"></div>
              <div class="sig-name">Ký, ghi rõ họ tên</div>"""
sig_replacement = """<div class="sig-role">🧑‍💼 Nhân Sự</div>
              <div class="sig-line"></div>
              <div class="sig-name" style="color: var(--navy); font-weight: 600;">[Họ Tên Nhân Viên - Auto Fill]</div>"""
content = content.replace(sig_original, sig_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
