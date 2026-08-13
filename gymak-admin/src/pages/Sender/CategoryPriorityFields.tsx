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

interface Props {
  category: string;
  onCategoryChange: (v: string) => void;
  priority: "normal" | "high";
  onPriorityChange: (v: "normal" | "high") => void;
}

export function CategoryPriorityFields({ category, onCategoryChange, priority, onPriorityChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">الفئة</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
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
        <label className="mb-1 block text-sm font-medium">الأولوية</label>
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as "normal" | "high")}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="normal">عادية</option>
          <option value="high">مرتفعة</option>
        </select>
      </div>
    </div>
  );
}
