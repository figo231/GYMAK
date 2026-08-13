import { AlertTriangle } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";

interface DeleteConfirmDialogProps {
  title: string;
  message: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ title, message, pending, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle size={20} />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? <Spinner className="border-white/40 border-t-white" /> : null}
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}
