"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  green: "var(--chart-1)",
  amber: "var(--chart-2)",
  orange: "var(--chart-3)",
  sky: "var(--chart-4)",
  violet: "var(--chart-5)",
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  fontSize: "0.8rem",
  color: "var(--foreground)",
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
};

export function ActivityAreaChart({
  data,
}: {
  data: Array<{ label: string; respostas: number; reacoes: number; votos: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRespostas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.45} />
            <stop offset="100%" stopColor={COLORS.green} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gradReacoes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.45} />
            <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gradVotos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.sky} stopOpacity={0.45} />
            <stop offset="100%" stopColor={COLORS.sky} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
        {/* Sem stackId de propósito: são 3 métricas independentes, cada área
            deve mostrar o próprio valor a partir de zero — empilhado faria a
            linha de cima somar as de baixo, distorcendo a leitura. */}
        <Area type="monotone" dataKey="respostas" name="Respostas" stroke={COLORS.green} strokeWidth={2.5} fill="url(#gradRespostas)" />
        <Area type="monotone" dataKey="reacoes" name="Reações" stroke={COLORS.amber} strokeWidth={2.5} fill="url(#gradReacoes)" />
        <Area type="monotone" dataKey="votos" name="Votos" stroke={COLORS.sky} strokeWidth={2.5} fill="url(#gradVotos)" />
        {/* itemSorter=null: por padrão o Recharts 3 ordena a legenda
            alfabeticamente pelo texto ("Reações" viria antes de "Respostas"),
            o que não bate com a ordem real da pilha do gráfico. */}
        <Legend wrapperStyle={{ fontSize: "0.8rem" }} iconType="circle" iconSize={9} itemSorter={null} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupComparisonChart({
  data,
}: {
  data: Array<{ name: string; resposta: number; reacao: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="resposta" name="Taxa de resposta" fill={COLORS.green} radius={[6, 6, 0, 0]} maxBarSize={48} />
        <Bar dataKey="reacao" name="Taxa de reação" fill={COLORS.amber} radius={[6, 6, 0, 0]} maxBarSize={48} />
        <Legend wrapperStyle={{ fontSize: "0.8rem" }} iconType="circle" iconSize={9} itemSorter={null} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const TYPE_BAR_COLORS = [COLORS.green, COLORS.amber, COLORS.orange, COLORS.sky, COLORS.violet];

export function ContentTypeChart({
  data,
}: {
  data: Array<{ label: string; engajamento: number; envios: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => (name === "Engajamento" ? `${value}%` : value)}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="engajamento" name="Engajamento" radius={[0, 8, 8, 0]} maxBarSize={26}>
          {data.map((_, index) => (
            <Cell key={index} fill={TYPE_BAR_COLORS[index % TYPE_BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
