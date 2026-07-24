"use client";

import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupPickerDialog } from "./group-picker-dialog";
import type { GroupProfile } from "./whatsapp-actions";

const PROFILE_LABELS: Record<GroupProfile, string> = {
  operador: "Operadores",
  tratorista: "Tratoristas",
};

interface GroupRow {
  profile: GroupProfile;
  name: string;
  whatsapp_group_id: string;
}

export function GroupsConfigCard({ groups }: { groups: GroupRow[] }) {
  const router = useRouter();
  const byProfile = new Map(groups.map((g) => [g.profile, g]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
            <Users className="size-4" />
          </span>
          <div>
            <CardTitle>Configurar grupos</CardTitle>
            <CardDescription>Qual grupo real do WhatsApp corresponde a cada perfil da comunidade.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(Object.keys(PROFILE_LABELS) as GroupProfile[]).map((profile) => {
          const current = byProfile.get(profile);
          return (
            <div key={profile} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Grupo {PROFILE_LABELS[profile]}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {current ? current.name : "Não configurado ainda"}
                </p>
              </div>
              <GroupPickerDialog
                profile={profile}
                profileLabel={PROFILE_LABELS[profile]}
                onSelected={() => router.refresh()}
                trigger={
                  <Button variant="outline" size="icon-sm">
                    <Search />
                  </Button>
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
