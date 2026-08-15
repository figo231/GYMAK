import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card } from "../../components/ui/Card";
import type { CampaignPerformanceRow } from "./useCampaignPerformanceList";

export function CampaignPerformanceChart({ rows }: { rows: CampaignPerformanceRow[] }) {
  const data = rows.map((r) => ({
    name: r.title.length > 14 ? `${r.title.slice(0, 14)}…` : r.title,
    "تم الإرسال": r.metrics.sent,
    "تم الفتح": r.metrics.opened,
    نقرات: r.metrics.clicked,
  }));

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">أداء الحملات (الصفحة الحالية)</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="تم الإرسال" fill="#9fce2f" />
            <Bar dataKey="تم الفتح" fill="#3b82f6" />
            <Bar dataKey="نقرات" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
