import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { Spinner } from "./Spinner";

interface StatWidgetProps {
  label: string;
  value: number | string | null;
  icon: LucideIcon;
  loading?: boolean;
  suffix?: string;
}

export function StatWidget({ label, value, icon: Icon, loading, suffix }: StatWidgetProps) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <div className="mt-2 text-2xl font-bold">
          {loading ? (
            <Spinner />
          ) : value === null ? (
            <span className="text-gray-400 dark:text-gray-600">—</span>
          ) : (
            <span>
              {value}
              {suffix ? <span className="ms-1 text-base font-medium text-gray-500">{suffix}</span> : null}
            </span>
          )}
        </div>
      </div>
      <div className="rounded-lg bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icon size={22} />
      </div>
    </Card>
  );
}
