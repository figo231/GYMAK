import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Spinner } from "../ui/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">ليس لديك صلاحية الوصول</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            الحساب ده مش مسجّل كـ admin في النظام. تواصل مع مسؤول رئيسي.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
