import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { CampaignStatusBadge } from "../Campaigns/CampaignStatusBadge";
import { DateRangeFilter } from "./DateRangeFilter";
import { CampaignPerformanceChart } from "./CampaignPerformanceChart";
import { CampaignSelector } from "./CampaignSelector";
import { CampaignAnalyticsDetail } from "./CampaignAnalyticsDetail";
import { useCampaignPerformanceList, PAGE_SIZE, type AnalyticsFilter } from "./useCampaignPerformanceList";
import type { NotificationStatus } from "../../types/notification";

const statusOptions: { value: NotificationStatus | "all"; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "scheduled", label: "مجدولة" },
  { value: "sending", label: "جارٍ الإرسال" },
  { value: "sent", label: "تم الإرسال" },
  { value: "failed", label: "فشلت" },
];

const categoryOptions = [
  "all",
  "workout_reminder",
  "water_reminder",
  "weight_reminder",
  "meal_reminder",
  "achievement",
  "promotion",
  "system",
  "maintenance",
  "subscription",
  "marketing",
];

export default function Analytics() {
  const [filter, setFilter] = useState<AnalyticsFilter>({
    page: 1,
    status: "all",
    category: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading, isError, error } = useCampaignPerformanceList(filter);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">التحليلات</h1>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as NotificationStatus | "all", page: 1 }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value, page: 1 }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "كل الفئات" : c}
              </option>
            ))}
          </select>
          <DateRangeFilter
            dateFrom={filter.dateFrom}
            dateTo={filter.dateTo}
            onChange={(from, to) => setFilter((f) => ({ ...f, dateFrom: from, dateTo: to, page: 1 }))}
          />
          {data && data.rows.length > 0 ? (
            <CampaignSelector
              rows={data.rows}
              selectedId={selected?.id ?? null}
              onSelect={(id, title) => setSelected({ id, title })}
            />
          ) : null}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : !data || data.rows.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد حملات مطابقة</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <CampaignPerformanceChart rows={data.rows} />

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th className="py-2 pe-4 font-medium">العنوان</th>
                    <th className="py-2 pe-4 font-medium">الحالة</th>
                    <th className="py-2 pe-4 font-medium">إرسال</th>
                    <th className="py-2 pe-4 font-medium">فتح</th>
                    <th className="py-2 pe-4 font-medium">نقر</th>
                    <th className="py-2 pe-4 font-medium">معدل التسليم</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected({ id: row.id, title: row.title })}
                      className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/50 ${
                        selected?.id === row.id ? "bg-brand-50 dark:bg-brand-500/10" : ""
                      }`}
                    >
                      <td className="py-3 pe-4 font-medium">{row.title}</td>
                      <td className="py-3 pe-4">
                        <CampaignStatusBadge status={row.status} />
                      </td>
                      <td className="py-3 pe-4">{row.metrics.sent}</td>
                      <td className="py-3 pe-4">{row.metrics.opened}</td>
                      <td className="py-3 pe-4">{row.metrics.clicked}</td>
                      <td className="py-3 pe-4">{row.metrics.deliveryRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={filter.page}
                pageSize={PAGE_SIZE}
                totalCount={data.totalCount}
                onPageChange={(page) => setFilter((f) => ({ ...f, page }))}
              />
            </div>
          </Card>

          {selected ? <CampaignAnalyticsDetail notificationId={selected.id} title={selected.title} /> : null}
        </div>
      )}
    </div>
  );
}
