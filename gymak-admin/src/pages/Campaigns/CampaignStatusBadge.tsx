import { Badge } from "../../components/ui/Badge";
import type { NotificationStatus } from "../../types/notification";

const statusMap: Record<NotificationStatus, { label: string; tone: "gray" | "green" | "red" | "amber" | "blue" }> = {
  draft: { label: "مسودة", tone: "gray" },
  scheduled: { label: "مجدولة", tone: "blue" },
  sending: { label: "جارٍ الإرسال", tone: "amber" },
  sent: { label: "تم الإرسال", tone: "green" },
  failed: { label: "فشلت", tone: "red" },
};

export function CampaignStatusBadge({ status }: { status: NotificationStatus }) {
  const info = statusMap[status];
  return <Badge tone={info.tone}>{info.label}</Badge>;
}
