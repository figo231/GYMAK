import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAdminAuth } from "../../hooks/useAdminAuth";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { session, adminRole, signOut } = useAdminAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {session?.user.email}
        {adminRole ? (
          <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
            {adminRole === "super_admin" ? "مسؤول رئيسي" : "مُرسِل"}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="تبديل الوضع الداكن"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}
