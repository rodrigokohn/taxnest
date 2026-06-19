import { type DeductionCategory, FILING_STATUS_LABELS } from '@/domain';
import { type ReportData } from '@/features/reports/report-data';
import { formatUSD } from '@/lib/money';
import { stateName } from '@/lib/us-states';

const CATEGORY_LABELS: Record<DeductionCategory, string> = {
  home_office: 'Home office',
  software: 'Software',
  equipment: 'Equipment',
  travel: 'Travel',
  education: 'Education',
  supplies: 'Supplies',
  other: 'Other',
};

const DISCLAIMER =
  'Taxnest provides estimates for planning purposes only. It is not tax, legal, or ' +
  'financial advice and does not replace a licensed tax professional.';

function row(label: string, value: string, strong = false): string {
  const weight = strong ? 'font-weight:600;' : '';
  return `<tr><td style="padding:6px 0;${weight}">${label}</td>
    <td style="padding:6px 0;text-align:right;${weight}">${value}</td></tr>`;
}

/** Builds a clean, print-ready HTML document for the accountant report (PRD §8.7). */
export function buildReportHtml(data: ReportData): string {
  const { profile } = data;

  const incomeRows = data.incomeBySource.length
    ? data.incomeBySource.map((s) => row(s.name, formatUSD(s.total))).join('')
    : row('No income recorded', '—');

  const deductionRows = data.deductionsByCategory.length
    ? data.deductionsByCategory
        .map((d) => row(CATEGORY_LABELS[d.category], formatUSD(d.total)))
        .join('')
    : row('No deductions recorded', '—');

  const quarterlyRows = data.quarterly.filter((q) => q.is_paid).length
    ? data.quarterly
        .filter((q) => q.is_paid)
        .map((q) => row(`Q${q.quarter} · ${q.date_paid}`, formatUSD(q.amount_paid)))
        .join('')
    : row('No quarterly payments recorded', '—');

  const stateLine = data.tax.includeState
    ? row(`State income tax (${stateName(profile.state)})`, formatUSD(data.tax.state))
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  * { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1A1A; }
  body { margin: 0; padding: 40px; }
  .header { border-bottom: 3px solid #0F6E56; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #0F6E56; margin: 0 0 4px; font-size: 22px; }
  .muted { color: #6B6B6B; font-size: 13px; }
  h2 { font-size: 15px; margin: 28px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .total-row td { border-top: 1px solid #ddd; padding-top: 10px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; color: #9A9A9A; font-size: 11px; }
</style></head>
<body>
  <div class="header">
    <h1>Taxnest — ${data.year} Tax Summary</h1>
    <div class="muted">${FILING_STATUS_LABELS[profile.filing_status]} · ${stateName(profile.state)}</div>
  </div>

  <h2>Summary</h2>
  <table>
    ${row('Total income', formatUSD(data.totals.income))}
    ${row('Total deductions', formatUSD(data.totals.deductions))}
    ${row('Net profit', formatUSD(data.totals.netProfit), true)}
  </table>

  <h2>Income by source</h2>
  <table>${incomeRows}</table>

  <h2>Deductions by category</h2>
  <table>${deductionRows}</table>

  <h2>Estimated taxes</h2>
  <table>
    ${row('Self-employment tax', formatUSD(data.tax.se))}
    ${row('Federal income tax', formatUSD(data.tax.federal))}
    ${stateLine}
    <tr class="total-row">${row('Estimated total', formatUSD(data.tax.total), true).replace(/^<tr>|<\/tr>$/g, '')}</tr>
  </table>

  <h2>Quarterly payments made</h2>
  <table>${quarterlyRows}</table>

  <div class="footer">${DISCLAIMER}</div>
</body></html>`;
}
