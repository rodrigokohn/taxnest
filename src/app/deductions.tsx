import { ProGate } from '@/components/pro-gate';
import { Screen } from '@/components/screen';
import { DeductionsScreen } from '@/features/deductions/deductions-screen';

/** Deductions (PRD §8.5). Pro-gated. */
export default function DeductionsRoute() {
  return (
    <Screen edges={[]} padded={false}>
      <ProGate
        title="Deductions"
        benefit="Track business expenses by category and watch your projected tax bill drop.">
        <DeductionsScreen />
      </ProGate>
    </Screen>
  );
}
