import { useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useTemplatesList, type TemplateRow, type TemplatesFilter } from "./useTemplatesList";
import { useDeleteTemplate } from "./useTemplateMutations";
import { TemplateFormModal } from "./TemplateFormModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

const categoryOptions = [
  "all",
  "workout_reminder",
  "water_reminder",
  "weight_reminder",
  "meal_reminder",
  "achievement",
  "promotion",
  "system",
  "maintenance",
  "subscription",
  "marketing",
];

export default function TemplatesList() {
  const [filter, setFilter] = useState<TemplatesFilter>({ search: "", category: "all" });
  const { data: templates, isLoading, isError, error } = useTemplatesList(filter);

  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateRow | null>(null);

  const deleteMutation = useDeleteTemplate();

  function handleDeleteConfirm() {
    if (!deletingTemplate) return;
    deleteMutation.mutate(deletingTemplate.id, {
      onSuccess: () => setDeletingTemplate(null),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">القوالب</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} />
          قالب جديد
        </button>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="ابحث بالمفتاح..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pe-9 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <select
            value={filter.category}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "كل الفئات" : c}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
        ) : !templates || templates.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد قوالب</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-2 pe-4 font-medium">المفتاح</th>
                  <th className="py-2 pe-4 font-medium">العنوان</th>
                  <th className="py-2 pe-4 font-medium">الفئة</th>
                  <th className="py-2 pe-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800/60">
                    <td className="py-3 pe-4 font-mono text-xs">{t.key}</td>
                    <td className="py-3 pe-4">{t.title_template}</td>
                    <td className="py-3 pe-4 text-gray-500 dark:text-gray-400">{t.category}</td>
                    <td className="py-3 pe-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTemplate(t)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          aria-label="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTemplate(t)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10"
                          aria-label="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreateModal ? <TemplateFormModal template={null} onClose={() => setShowCreateModal(false)} /> : null}
      {editingTemplate ? (
        <TemplateFormModal template={editingTemplate} onClose={() => setEditingTemplate(null)} />
      ) : null}
      {deletingTemplate ? (
        <DeleteConfirmDialog
          title="حذف القالب"
          message={`متأكد إنك عايز تمسح القالب "${deletingTemplate.key}"؟ الإجراء ده مايتراجعش.`}
          pending={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTemplate(null)}
        />
      ) : null}
    </div>
  );
}
