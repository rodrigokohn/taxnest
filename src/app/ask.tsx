import { ProGate } from '@/components/pro-gate';
import { Screen } from '@/components/screen';
import { AskScreen } from '@/features/ask/ask-screen';

/** Ask (PRD §8.8). Pro-gated. Connects to the ai-ask Edge Function. */
export default function AskRoute() {
  return (
    <Screen edges={[]} padded={false}>
      <ProGate
        title="Ask"
        benefit="Get clear answers to your freelance tax questions, personalized to your situation.">
        <AskScreen />
      </ProGate>
    </Screen>
  );
}
