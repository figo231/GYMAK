import { tx } from "../lib/i18n/tx";

// Owner-only switch between the men's section, the women's section and both together.
export const OWNER_SECTIONS = ["all", "male", "female"];

export function ownerSectionMatches(section, isWomen) {
  if (section === "all") return true;
  return section === "female" ? isWomen : !isWomen;
}

export default function OwnerGenderSwitch({ value, onChange }) {
  const items = [["all", tx("الكل")], ["male", tx("تمارين الرجال")], ["female", tx("تمارين البنات")]];
  return (
    <div role="group" aria-label={tx("قسم التمارين للمالك")} data-testid="owner-gender-switch" style={{ display: "flex", gap: 10, marginBlock: 14, flexWrap: "wrap" }}>
      {items.map(([g, label]) => (
        <button type="button" className="chip chip-btn" aria-pressed={value === g} key={g} onClick={() => onChange(g)}>{label}</button>
      ))}
    </div>
  );
}
