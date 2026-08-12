import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { useCampaigns, PAGE_SIZE, type CampaignsFilter } from "./useCampaigns";
import type { NotificationStatus } from "../../types/notification";

const statusOptions: { value: NotificationStatus | "all"; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "scheduled", label: "مجدولة" },
  { value: "sending", label: "جارٍ الإرسال" },
  { value: "sent", label: "تم الإرسال" },
  { value: "failed", label: "فشلت" },
];

export default function CampaignsList() {
  const [filter, setFilter] = useState<CampaignsFilter>({ page: 1, search: "", status: "all" });
  const { data, isLoading, isError, error } = useCampaigns(filter);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">الحملات</h1>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value, page: 1 }))}
              placeholder="ابحث بعنوان الحملة..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pe-9 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد حملات مطابقة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-2 pe-4 font-medium">العنوان</th>
                  <th className="py-2 pe-4 font-medium">الحالة</th>
                  <th className="py-2 pe-4 font-medium">الجمهور</th>
                  <th className="py-2 pe-4 font-medium">موعد الجدولة</th>
                  <th className="py-2 pe-4 font-medium">أُنشئت</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800/60">
                    <td className="py-3 pe-4 font-medium">
                      <Link to={`/campaigns/${row.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-3 pe-4">
                      <CampaignStatusBadge status={row.status} />
                    </td>
                    <td className="py-3 pe-4 text-gray-500 dark:text-gray-400">{row.audience_type}</td>
                    <td className="py-3 pe-4 text-gray-500 dark:text-gray-400">
                      {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString("ar-EG") : "—"}
                    </td>
                    <td className="py-3 pe-4 text-gray-500 dark:text-gray-400">
                      {new Date(row.created_at).toLocaleDateString("ar-EG")}
                    </td>
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
        )}
      </Card>
    </div>
  );
}
