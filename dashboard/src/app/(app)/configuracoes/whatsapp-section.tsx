import { createClient } from "@/lib/supabase/server";
import { GroupsConfigCard } from "./groups-config-card";
import { getWhatsAppStatus } from "./whatsapp-actions";
import { WhatsAppConnectionCard } from "./whatsapp-connection-card";

// Server Component assíncrono separado só pra isolar a espera pela resposta
// do worker (fetch de rede, pode demorar/falhar) atrás de um <Suspense> — o
// resto da página (dia da semana, aprendizado da IA) não precisa esperar por
// isso pra aparecer.
export async function WhatsAppSection() {
  const supabase = await createClient();
  const [whatsappStatus, { data: groupsData }] = await Promise.all([
    getWhatsAppStatus(),
    supabase.from("groups").select("profile, name, whatsapp_group_id"),
  ]);

  const isWhatsAppConnected = !("error" in whatsappStatus) && whatsappStatus.status === "open";

  return (
    <>
      <WhatsAppConnectionCard initialStatus={whatsappStatus} />
      {isWhatsAppConnected ? (
        <GroupsConfigCard
          groups={(groupsData ?? []) as Array<{ profile: "operador" | "tratorista"; name: string; whatsapp_group_id: string }>}
        />
      ) : null}
    </>
  );
}
