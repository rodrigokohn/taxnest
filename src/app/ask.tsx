import { Screen } from '@/components/screen';
import { AskScreen } from '@/features/ask/ask-screen';

/** Ask (PRD §8.8). Connects to the ai-ask Edge Function. */
export default function AskRoute() {
  return (
    <Screen edges={[]} padded={false}>
      <AskScreen />
    </Screen>
  );
}
