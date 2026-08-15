import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { CountCell } from "../Campaigns/CountCell";
import { useCampaignAnalyticsDetail } from "./useCampaignAnalyticsDetail";

export function CampaignAnalyticsDetail({ notificationId, title }: { notificationId: string; title: string }) {
  const { data, isLoading, isError, error } = useCampaignAnalyticsDetail(notificationId);

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-gray-500 dark:text-gray-400">تفاصيل الحملة</h2>
      <p className="mb-3 font-medium">{title}</p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-4 text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : data ? (
        !data.hasDeliveryData ? (
          <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
            الحملة دي اتبعتت لموضوع (topic) — مفيش بيانات تسليم لكل جهاز على حدة لهذا النوع من الإرسال.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CountCell label="إجمالي المستهدفين" value={data.metrics.totalTargeted} />
              <CountCell label="تم الإرسال" value={data.metrics.sent} />
              <CountCell label="فشل" value={data.metrics.failed} />
              <CountCell label="تم الفتح" value={data.metrics.opened} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <CountCell label="معدل التسليم %" value={data.metrics.deliveryRate} />
              <CountCell label="معدل الفتح %" value={data.metrics.openRate} />
              <CountCell label="معدل النقر %" value={data.metrics.clickThroughRate} />
            </div>
          </div>
        )
      ) : null}
    </Card>
  );
}
