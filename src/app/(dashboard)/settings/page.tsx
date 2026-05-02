import { getMyAccountSettings } from "@/server/actions/settings";
import SettingsAccountForm from "./SettingsAccountForm";

export default async function SettingsPage() {
  const data = await getMyAccountSettings();

  return (
    <div className="space-y-5">
      <SettingsAccountForm initialData={data} />
    </div>
  );
}
