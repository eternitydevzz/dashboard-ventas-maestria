import { redirect } from "next/navigation";

// Paso H7: un solo CRM para todos. La dirección antigua lleva al CRM nuevo.
export default function CrmCallerPage() {
  redirect("/crm");
}
