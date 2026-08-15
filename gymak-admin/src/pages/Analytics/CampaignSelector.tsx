import type { CampaignPerformanceRow } from "./useCampaignPerformanceList";

interface CampaignSelectorProps {
  rows: CampaignPerformanceRow[];
  selectedId: string | null;
  onSelect: (id: string, title: string) => void;
}

export function CampaignSelector({ rows, selectedId, onSelect }: CampaignSelectorProps) {
  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const row = rows.find((r) => r.id === e.target.value);
        if (row) onSelect(row.id, row.title);
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
    >
      <option value="">اختر حملة...</option>
      {rows.map((r) => (
        <option key={r.id} value={r.id}>
          {r.title}
        </option>
      ))}
    </select>
  );
}
