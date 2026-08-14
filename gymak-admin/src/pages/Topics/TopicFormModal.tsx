import { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";
import { useCreateTopic, useUpdateTopicDescription } from "./useTopicMutations";
import type { TopicRow } from "./useTopicsList";

interface FormErrors {
  name?: string;
}

interface TopicFormModalProps {
  topic: TopicRow | null;
  onClose: () => void;
}

const NAME_PATTERN = /^[A-Za-z0-9-_.~%]+$/;

export function TopicFormModal({ topic, onClose }: TopicFormModalProps) {
  const isEdit = Boolean(topic);
  const [name, setName] = useState(topic?.name ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useCreateTopic();
  const updateMutation = useUpdateTopicDescription();
  const pending = createMutation.isPending || updateMutation.isPending;
  const mutationError = (createMutation.error ?? updateMutation.error) as Error | null;

  function validate(): boolean {
    const next: FormErrors = {};
    if (!isEdit) {
      if (!name.trim()) next.name = "اسم الموضوع مطلوب";
      else if (!NAME_PATTERN.test(name.trim())) next.name = "أحرف/أرقام إنجليزية و - _ . ~ % بس، بدون مسافات";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (isEdit && topic) {
      updateMutation.mutate({ id: topic.id, description: description.trim() }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim() }, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "تعديل الموضوع" : "موضوع جديد"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">الاسم (name)</label>
            <input
              value={name}
              disabled={isEdit}
              onChange={(e) => setName(e.target.value)}
              placeholder="all_users"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
            />
            {isEdit ? (
              <p className="mt-1 text-xs text-gray-400">الاسم غير قابل للتعديل بعد الإنشاء (مطابق لموضوع FCM الفعلي)</p>
            ) : null}
            {errors.name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">الوصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        {mutationError ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{mutationError.message}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {pending ? <Spinner className="border-white/40 border-t-white" /> : null}
            {isEdit ? "حفظ التعديلات" : "إنشاء الموضوع"}
          </button>
        </div>
      </div>
    </div>
  );
}
