import { useTemplates } from "./useTemplates";

interface TemplatePickerProps {
  value: string | null;
  onSelect: (templateId: string | null, title: string, body: string, category: string) => void;
}

export function TemplatePicker({ value, onSelect }: TemplatePickerProps) {
  const { data: templates, isLoading } = useTemplates();

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">قالب جاهز (اختياري)</label>
      <select
        value={value ?? ""}
        disabled={isLoading}
        onChange={(e) => {
          const id = e.target.value || null;
          if (!id) {
            onSelect(null, "", "", "");
            return;
          }
          const tmpl = (templates ?? []).find((t) => t.id === id);
          if (tmpl) onSelect(tmpl.id, tmpl.title_template, tmpl.body_template, tmpl.category);
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">بدون قالب — نص حر</option>
        {(templates ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.key}
          </option>
        ))}
      </select>
    </div>
  );
}
