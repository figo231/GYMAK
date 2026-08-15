import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Send,
  FileText,
  Hash,
  BarChart3,
  Users,
  ScrollText,
} from "lucide-react";

interface NavItem {
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
}

const items: NavItem[] = [
  { label: "الرئيسية", to: "/", icon: LayoutDashboard },
  { label: "الحملات", to: "/campaigns", icon: Megaphone },
  { label: "إرسال إشعار", to: "/send", icon: Send },
  { label: "القوالب", to: "/templates", icon: FileText },
  { label: "المواضيع", to: "/topics", icon: Hash },
  { label: "التحليلات", to: "/analytics", icon: BarChart3 },
  { label: "المسؤولون", icon: Users },
  { label: "سجل التدقيق", icon: ScrollText },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:block">
      <div className="mb-6 px-2 text-lg font-bold text-brand-600 dark:text-brand-400">GYMAK Admin</div>
      <nav className="space-y-1">
        {items.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600"
              title="قريبًا"
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">قريبًا</span>
            </div>
          )
        )}
      </nav>
    </aside>
  );
}
