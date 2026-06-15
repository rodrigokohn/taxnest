import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { gatherReportData } from '@/features/reports/report-data';
import { buildReportHtml } from '@/features/reports/report-html';

/** Generates the tax-summary PDF and opens the native share sheet (PRD §8.7). */
export async function generateAndShareReport(year: number): Promise<void> {
  const data = await gatherReportData(year);
  const html = buildReportHtml(data);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
