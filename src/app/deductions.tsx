import { Screen } from '@/components/screen';
import { DeductionsScreen } from '@/features/deductions/deductions-screen';

/** Deductions (PRD §8.5). */
export default function DeductionsRoute() {
  return (
    <Screen edges={[]} padded={false}>
      <DeductionsScreen />
    </Screen>
  );
}
