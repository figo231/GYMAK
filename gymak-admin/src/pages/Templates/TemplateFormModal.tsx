import { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";
import { NotificationPreview } from "../Sender/NotificationPreview";
import { useCreateTemplate, useUpdateTemplate, type TemplateFormValues } from "./useTemplateMutations";
import type { TemplateRow } from "./useTemplatesList";

const categories = [
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

interface FormErrors {
  key?: string;
  title_template?: string;
  body_template?: string;
}

interface TemplateFormModalProps {
  template: TemplateRow | null;
  onClose: () => void;
}

export function TemplateFormModal({ template, onClose }: TemplateFormModalProps) {
  const isEdit = Boolean(template);
  const [values, setValues] = useState<TemplateFormValues>({
    key: template?.key ?? "",
    title_template: template?.title_template ?? "",
    body_template: template?.body_template ?? "",
    category: template?.category ?? categories[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const pending = createMutation.isPending || updateMutation.isPending;
  const mutationError = (createMutation.error ?? updateMutation.error) as Error | null;

  function validate(): boolean {
    const next: FormErrors = {};
    if (!values.key.trim()) next.key = "المفتاح مطلوب";
    else if (!/^[a-z0-9_]+$/.test(values.key.trim())) next.key = "المفتاح يجب أن يكون بالإنجليزية الصغيرة و_ بس";
    if (!values.title_template.trim()) next.title_template = "عنوان القالب مطلوب";
    if (!values.body_template.trim()) next.body_template = "نص القالب مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload: TemplateFormValues = {
      key: values.key.trim(),
      title_template: values.title_template.trim(),
      body_template: values.body_template.trim(),
      category: values.category,
    };
    if (isEdit && template) {
      updateMutation.mutate({ id: template.id, values: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "تعديل قالب" : "قالب جديد"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">المفتاح (key)</label>
              <input
                value={values.key}
                disabled={isEdit}
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value }))}
                placeholder="workout_reminder"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.key ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.key}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">الفئة</label>
              <select
                value={values.category}
                onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">عنوان القالب</label>
              <input
                value={values.title_template}
                onChange={(e) => setValues((v) => ({ ...v, title_template: e.target.value }))}
                placeholder="وقت التمرين يا {user_name}!"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.title_template ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title_template}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">نص القالب</label>
              <textarea
                value={values.body_template}
                onChange={(e) => setValues((v) => ({ ...v, body_template: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.body_template ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.body_template}</p>
              ) : null}
            </div>
          </div>

          <NotificationPreview title={values.title_template} body={values.body_template} />
        </div>

        {mutationError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{mutationError.message}</p>
        ) : null}

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
            {isEdit ? "حفظ التعديلات" : "إنشاء القالب"}
          </button>
        </div>
      </div>
    </div>
  );
}
