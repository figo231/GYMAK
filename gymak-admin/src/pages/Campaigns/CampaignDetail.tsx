import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { CountCell } from "./CountCell";
import { useCampaignDetail } from "./useCampaignDetail";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useCampaignDetail(id);

  return (
    <div>
      <Link
        to="/campaigns"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <ArrowRight size={16} />
        رجوع للحملات
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : data ? (
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold">{data.notification.title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{data.notification.body}</p>
              </div>
              <CampaignStatusBadge status={data.notification.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">الفئة</dt>
                <dd className="font-medium">{data.notification.category}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">الجمهور</dt>
                <dd className="font-medium">{data.notification.audience_type}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">موعد الجدولة</dt>
                <dd className="font-medium">
                  {data.notification.scheduled_at
                    ? new Date(data.notification.scheduled_at).toLocaleString("ar-EG")
                    : "غير مجدولة"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">وقت الإرسال</dt>
                <dd className="font-medium">
                  {data.notification.sent_at ? new Date(data.notification.sent_at).toLocaleString("ar-EG") : "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">حالة التسليم</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <CountCell label="قيد الانتظار" value={data.deliveryCounts.pending} />
              <CountCell label="جارٍ الإرسال" value={data.deliveryCounts.dispatching} />
              <CountCell label="تم الإرسال" value={data.deliveryCounts.sent} />
              <CountCell label="فشل مؤقت" value={data.deliveryCounts.failed_temporary} />
              <CountCell label="فشل دائم" value={data.deliveryCounts.failed_permanent} />
              <CountCell label="توكن غير صالح" value={data.deliveryCounts.invalid_token} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">التفاعل</h2>
            <div className="grid grid-cols-3 gap-3">
              <CountCell label="تم الاستلام" value={data.eventCounts.received} />
              <CountCell label="تم الفتح" value={data.eventCounts.opened} />
              <CountCell label="نقر على الرابط" value={data.eventCounts.click_through} />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
