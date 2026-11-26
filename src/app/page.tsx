import ComissoesClient from '@/components/ComissoesClient';
import { getDadosPayload } from '@/services/db';

export const dynamic = 'force-dynamic';

export default function ComissoesPage() {
  const initialData = getDadosPayload();
  return <ComissoesClient initialData={initialData} />;
}
