import { Users, Smartphone, BellRing, Megaphone, PieChart } from "lucide-react";
import { StatWidget } from "../../components/ui/StatWidget";
import { useDashboardStats } from "./useDashboardStats";

export default function Dashboard() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">الرئيسية</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatWidget label="إجمالي المستخدمين" value={data?.totalUsers ?? null} icon={Users} loading={isLoading} />
        <StatWidget
          label="الأجهزة النشطة"
          value={data?.activeDevices ?? null}
          icon={Smartphone}
          loading={isLoading}
        />
        <StatWidget
          label="توكنات الإشعارات النشطة"
          value={data?.activePushTokens ?? null}
          icon={BellRing}
          loading={isLoading}
        />
        <StatWidget label="الحملات" value={data?.campaigns ?? null} icon={Megaphone} loading={isLoading} />
        <StatWidget
          label="معدل التسليم"
          value={data?.deliveryRatePercent ?? null}
          suffix="%"
          icon={PieChart}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
