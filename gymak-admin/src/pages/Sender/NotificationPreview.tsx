import { BellRing } from "lucide-react";
import { Card } from "../../components/ui/Card";

export function NotificationPreview({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">معاينة الإشعار</p>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-brand-500 p-1.5 text-white">
            <BellRing size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title || "عنوان الإشعار"}</p>
            <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{body || "نص الإشعار سيظهر هنا"}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
