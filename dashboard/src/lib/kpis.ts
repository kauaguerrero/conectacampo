import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const RESPONSE_WINDOW_MS = 1 * DAY_MS;
const SILENT_THRESHOLD_MS = 60 * DAY_MS;
const NEW_MEMBER_GRACE_MS = 3 * DAY_MS;

type GroupProfile = "operador" | "tratorista";

interface GroupRow {
  id: string;
  name: string;
  profile: GroupProfile;
}

interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  active: boolean;
  birthday_date: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  group_id: string;
  member_id: string | null;
  send_queue_id: string | null;
  type: "reply" | "reaction" | "poll_vote";
  created_at: string;
}

interface PostRow {
  id: string;
  group_id: string;
  source: "manual" | "ai_generated";
  sent_at: string;
  content: { type?: string } | null;
  templates: { type: string } | null;
}

export interface DashboardKpis {
  window: { sentPostsDays: number; rankingDays: number };
  summary: {
    messagesSent: number;
    deliveryRate: number | null;
    avgResponseRate: number | null;
    avgReactionRate: number | null;
    avgPollParticipationRate: number | null;
    activeMembers: number;
    totalMembers: number;
    aiApprovalRate: number | null;
    aiApprovalSampleSize: number;
    queuedCount: number;
  };
  byGroup: Array<{
    groupId: string;
    name: string;
    profile: GroupProfile;
    activeMembers: number;
    totalMembers: number;
    messagesSent: number;
    avgResponseRate: number | null;
    avgReactionRate: number | null;
  }>;
  byContentType: Array<{
    label: string;
    count: number;
    avgEngagementRate: number | null;
  }>;
  activityTimeline: Array<{ label: string; respostas: number; reacoes: number; votos: number }>;
  topEngaged: Array<{ memberId: string; name: string; groupName: string; interactions: number }>;
  silentMembers: Array<{ memberId: string; name: string; groupName: string; daysSinceLastActivity: number | null }>;
  upcomingBirthdays: Array<{ memberId: string; name: string; groupName: string; daysUntil: number }>;
  pendingRecognitions: Array<{ id: string; memberName: string; type: string; scheduledFor: string; overdue: boolean }>;
  upcomingQueue: Array<{ id: string; groupName: string; preview: string; scheduledFor: string; overdue: boolean }>;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysUntilNextBirthday(birthdayDate: string, now: Date): number {
  const [, month, day] = birthdayDate.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return Math.round((next.getTime() - today.getTime()) / DAY_MS);
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const since90 = new Date(now.getTime() - 90 * DAY_MS).toISOString();

  const [
    { data: groupsData },
    { data: membersData },
    { data: sentPostsData },
    { data: attemptedQueueData },
    { data: aiDecidedData },
    { data: eventsData },
    { data: recognitionsData },
    { data: queuedData, count: queuedCount },
  ] = await Promise.all([
    supabase.from("groups").select("id, name, profile"),
    supabase.from("members").select("id, group_id, name, active, birthday_date, created_at"),
    supabase
      .from("send_queue")
      .select("id, group_id, source, sent_at, content, templates(type)")
      .eq("status", "sent")
      .gte("sent_at", since30),
    supabase.from("send_queue").select("id, status").in("status", ["sent", "failed"]).gte("created_at", since30),
    supabase
      .from("send_queue")
      .select("id, status, attempts")
      .eq("source", "ai_generated")
      .neq("status", "pending_approval")
      .gte("created_at", since30),
    supabase
      .from("engagement_events")
      .select("id, group_id, member_id, send_queue_id, type, created_at")
      .gte("created_at", since90),
    supabase
      .from("recognitions")
      .select("id, type, scheduled_for, sent, members(name)")
      .eq("sent", false)
      .order("scheduled_for", { ascending: true })
      .limit(5),
    supabase
      .from("send_queue")
      .select("id, content, scheduled_for, groups(name)", { count: "exact" })
      .eq("status", "approved")
      .order("scheduled_for", { ascending: true })
      .limit(5),
  ]);

  const groups = (groupsData ?? []) as GroupRow[];
  const members = (membersData ?? []) as MemberRow[];
  const sentPosts = (sentPostsData ?? []) as unknown as PostRow[];
  const events = (eventsData ?? []) as EventRow[];

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  const activeMembersByGroup = new Map<string, number>();
  const totalMembersByGroup = new Map<string, number>();
  for (const m of members) {
    totalMembersByGroup.set(m.group_id, (totalMembersByGroup.get(m.group_id) ?? 0) + 1);
    if (m.active) activeMembersByGroup.set(m.group_id, (activeMembersByGroup.get(m.group_id) ?? 0) + 1);
  }

  const eventsByQueueId = new Map<string, EventRow[]>();
  for (const e of events) {
    if (!e.send_queue_id) continue;
    const list = eventsByQueueId.get(e.send_queue_id) ?? [];
    list.push(e);
    eventsByQueueId.set(e.send_queue_id, list);
  }

  // --- Taxa de resposta / reação por post (janela de 24h), por grupo e por tipo de conteúdo ---
  const responseRates: number[] = [];
  const reactionRates: number[] = [];
  const pollParticipationRates: number[] = [];
  const byGroupAgg = new Map<string, { response: number[]; reaction: number[] }>();
  const byContentTypeAgg = new Map<string, { count: number; engagement: number[] }>();

  for (const post of sentPosts) {
    const activeCount = activeMembersByGroup.get(post.group_id) ?? 0;
    if (activeCount === 0) continue;

    const windowEnd = new Date(post.sent_at).getTime() + RESPONSE_WINDOW_MS;
    const postEvents = (eventsByQueueId.get(post.id) ?? []).filter(
      (e) => new Date(e.created_at).getTime() <= windowEnd,
    );

    const repliers = new Set(postEvents.filter((e) => e.type === "reply").map((e) => e.member_id ?? `e:${e.id}`));
    const reactors = new Set(
      postEvents.filter((e) => e.type === "reaction").map((e) => e.member_id ?? `e:${e.id}`),
    );

    const responseRate = repliers.size / activeCount;
    const reactionRate = reactors.size / activeCount;

    responseRates.push(responseRate);
    reactionRates.push(reactionRate);

    if (post.content?.type === "poll") {
      const voters = new Set(
        postEvents.filter((e) => e.type === "poll_vote").map((e) => e.member_id ?? `e:${e.id}`),
      );
      pollParticipationRates.push(voters.size / activeCount);
    }

    const groupAgg = byGroupAgg.get(post.group_id) ?? { response: [], reaction: [] };
    groupAgg.response.push(responseRate);
    groupAgg.reaction.push(reactionRate);
    byGroupAgg.set(post.group_id, groupAgg);

    const contentType =
      post.content?.type === "poll"
        ? "enquete"
        : (post.templates?.type ?? (post.source === "ai_generated" ? "ia_livre" : "manual_livre"));
    const typeAgg = byContentTypeAgg.get(contentType) ?? { count: 0, engagement: [] };
    typeAgg.count += 1;
    typeAgg.engagement.push((responseRate + reactionRate) / 2);
    byContentTypeAgg.set(contentType, typeAgg);
  }

  // --- Entrega da fila ---
  const attempted = attemptedQueueData ?? [];
  const sentCount = attempted.filter((i) => i.status === "sent").length;
  const deliveryRate = attempted.length > 0 ? sentCount / attempted.length : null;

  // --- Aprovação de conteúdo IA (rejeitado = status failed com attempts 0, nunca chegou a ser tentado) ---
  const aiDecided = aiDecidedData ?? [];
  const aiApproved = aiDecided.filter((i) => i.status === "approved" || i.status === "sent").length;
  const aiRejected = aiDecided.filter((i) => i.status === "failed" && i.attempts === 0).length;
  const aiSample = aiApproved + aiRejected;
  const aiApprovalRate = aiSample > 0 ? aiApproved / aiSample : null;

  // --- Linha do tempo de atividade (30 dias, por dia) ---
  const timelineDays = 30;
  const dayBuckets = new Map<string, { respostas: number; reacoes: number; votos: number }>();
  for (let i = timelineDays - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    dayBuckets.set(key, { respostas: 0, reacoes: 0, votos: 0 });
  }
  for (const e of events) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const bucket = dayBuckets.get(key);
    if (!bucket) continue;
    if (e.type === "reply") bucket.respostas += 1;
    else if (e.type === "reaction") bucket.reacoes += 1;
    else bucket.votos += 1;
  }
  const activityTimeline = [...dayBuckets.entries()].map(([key, counts]) => {
    const [, month, day] = key.split("-");
    return { label: `${day}/${month}`, ...counts };
  });

  // --- Ranking de membros mais engajados (90 dias) ---
  const interactionsByMember = new Map<string, number>();
  for (const e of events) {
    if (!e.member_id) continue;
    interactionsByMember.set(e.member_id, (interactionsByMember.get(e.member_id) ?? 0) + 1);
  }
  const topEngaged = [...interactionsByMember.entries()]
    .map(([memberId, interactions]) => {
      const member = memberById.get(memberId);
      const group = member ? groupById.get(member.group_id) : undefined;
      return { memberId, name: member?.name ?? "—", groupName: group?.name ?? "—", interactions };
    })
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 5);

  // --- Membros silenciosos ---
  const lastActivityByMember = new Map<string, number>();
  for (const e of events) {
    if (!e.member_id) continue;
    const ts = new Date(e.created_at).getTime();
    const current = lastActivityByMember.get(e.member_id);
    if (!current || ts > current) lastActivityByMember.set(e.member_id, ts);
  }
  const silentThreshold = now.getTime() - SILENT_THRESHOLD_MS;
  const silentMembers = members
    .filter((m) => m.active && now.getTime() - new Date(m.created_at).getTime() >= NEW_MEMBER_GRACE_MS)
    .map((m) => {
      const last = lastActivityByMember.get(m.id) ?? null;
      const group = groupById.get(m.group_id);
      return {
        memberId: m.id,
        name: m.name,
        groupName: group?.name ?? "—",
        lastActivity: last,
        daysSinceLastActivity: last ? Math.round((now.getTime() - last) / DAY_MS) : null,
      };
    })
    .filter((m) => m.lastActivity === null || m.lastActivity < silentThreshold)
    .sort((a, b) => (a.lastActivity ?? -Infinity) - (b.lastActivity ?? -Infinity))
    .slice(0, 8)
    .map(({ memberId, name, groupName, daysSinceLastActivity }) => ({ memberId, name, groupName, daysSinceLastActivity }));

  // --- Aniversários nos próximos 30 dias ---
  const upcomingBirthdays = members
    .filter((m) => m.active && m.birthday_date)
    .map((m) => {
      const group = groupById.get(m.group_id);
      return {
        memberId: m.id,
        name: m.name,
        groupName: group?.name ?? "—",
        daysUntil: daysUntilNextBirthday(m.birthday_date as string, now),
      };
    })
    .filter((m) => m.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // --- Reconhecimentos pendentes ---
  interface PendingRecognitionRow {
    id: string;
    type: string;
    scheduled_for: string;
    members: { name: string } | null;
  }
  const pendingRecognitions = ((recognitionsData ?? []) as unknown as PendingRecognitionRow[]).map((r) => ({
    id: r.id,
    memberName: r.members?.name ?? "—",
    type: r.type,
    scheduledFor: r.scheduled_for,
    overdue: new Date(r.scheduled_for).getTime() < now.getTime(),
  }));

  // --- Próximos envios na fila (aprovados, aguardando o horário) ---
  interface QueuedRow {
    id: string;
    content: { type?: string; text?: string; question?: string } | null;
    scheduled_for: string;
    groups: { name: string } | null;
  }
  const upcomingQueue = ((queuedData ?? []) as unknown as QueuedRow[]).map((item) => {
    const preview =
      item.content?.type === "poll" ? `📊 ${item.content.question}` : (item.content?.text ?? "—");
    return {
      id: item.id,
      groupName: item.groups?.name ?? "—",
      preview,
      scheduledFor: item.scheduled_for,
      overdue: new Date(item.scheduled_for).getTime() < now.getTime(),
    };
  });

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    texto: "Texto",
    reconhecimento: "Reconhecimento",
    enquete: "Enquete",
    ia_livre: "IA (sem template)",
    manual_livre: "Manual (texto livre)",
  };

  return {
    window: { sentPostsDays: 30, rankingDays: 90 },
    summary: {
      messagesSent: sentPosts.length,
      deliveryRate,
      avgResponseRate: average(responseRates),
      avgReactionRate: average(reactionRates),
      avgPollParticipationRate: average(pollParticipationRates),
      activeMembers: members.filter((m) => m.active).length,
      totalMembers: members.length,
      aiApprovalRate,
      aiApprovalSampleSize: aiSample,
      queuedCount: queuedCount ?? 0,
    },
    byGroup: groups.map((g) => {
      const agg = byGroupAgg.get(g.id) ?? { response: [], reaction: [] };
      return {
        groupId: g.id,
        name: g.name,
        profile: g.profile,
        activeMembers: activeMembersByGroup.get(g.id) ?? 0,
        totalMembers: totalMembersByGroup.get(g.id) ?? 0,
        messagesSent: sentPosts.filter((p) => p.group_id === g.id).length,
        avgResponseRate: average(agg.response),
        avgReactionRate: average(agg.reaction),
      };
    }),
    byContentType: [...byContentTypeAgg.entries()]
      .map(([type, agg]) => ({
        label: CONTENT_TYPE_LABELS[type] ?? type,
        count: agg.count,
        avgEngagementRate: average(agg.engagement),
      }))
      .sort((a, b) => b.count - a.count),
    activityTimeline,
    topEngaged,
    silentMembers,
    upcomingBirthdays,
    pendingRecognitions,
    upcomingQueue,
  };
}
