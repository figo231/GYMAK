import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useTopicsList, type TopicRow, type TopicsFilter } from "./useTopicsList";
import { useDeleteTopic } from "./useTopicMutations";
import { TopicFormModal } from "./TopicFormModal";
import { DeleteConfirmDialog } from "../Templates/DeleteConfirmDialog";

export default function TopicsList() {
  const [filter, setFilter] = useState<TopicsFilter>({ search: "" });
  const { data: topics, isLoading, isError, error } = useTopicsList(filter);

  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<TopicRow | null>(null);

  const deleteMutation = useDeleteTopic();

  function handleDeleteConfirm() {
    if (!deletingTopic) return;
    deleteMutation.mutate(deletingTopic.id, { onSuccess: () => setDeletingTopic(null) });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">المواضيع</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} />
          موضوع جديد
        </button>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="ابحث باسم الموضوع..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pe-9 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
        ) : !topics || topics.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد مواضيع</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-2 pe-4 font-medium">الاسم</th>
                  <th className="py-2 pe-4 font-medium">الوصف</th>
                  <th className="py-2 pe-4 font-medium">المشتركون</th>
                  <th className="py-2 pe-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800/60">
                    <td className="py-3 pe-4 font-mono text-xs">
                      <Link to={`/topics/${t.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-3 pe-4 text-gray-500 dark:text-gray-400">{t.description || "—"}</td>
                    <td className="py-3 pe-4">{t.subscriberCount}</td>
                    <td className="py-3 pe-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTopic(t)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          aria-label="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTopic(t)}
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

      {showCreateModal ? <TopicFormModal topic={null} onClose={() => setShowCreateModal(false)} /> : null}
      {editingTopic ? <TopicFormModal topic={editingTopic} onClose={() => setEditingTopic(null)} /> : null}
      {deletingTopic ? (
        <DeleteConfirmDialog
          title="حذف الموضوع"
          message={`متأكد إنك عايز تمسح الموضوع "${deletingTopic.name}"؟ ده هيلغي اشتراك كل الأجهزة فيه (${deletingTopic.subscriberCount}). الإجراء ده مايتراجعش.`}
          pending={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTopic(null)}
        />
      ) : null}
    </div>
  );
}
