import { PrintSettingsClient } from '@/components/admin/PrintSettingsClient';
import { ResetOrdersSection } from '@/components/admin/ResetOrdersSection';

export default function AdminSettingsPage() {
  return (
    <>
      <PrintSettingsClient />
      <ResetOrdersSection />
    </>
  );
}
