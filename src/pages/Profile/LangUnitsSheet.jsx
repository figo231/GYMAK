export default function LangUnitsSheet({ unit, lang, onClose, onUnitChange, onLangChange }) {
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>اللغة والوحدات</h3>

        <div className="settings-block">
          <span className="settings-block-label">Language / اللغة</span>
          <div className="seg-control">
            <div className={"seg-option" + (lang === "ar" ? " active" : "")} onClick={() => onLangChange("ar")}>العربية</div>
            <div className={"seg-option" + (lang === "en" ? " active" : "")} onClick={() => onLangChange("en")}>English</div>
          </div>
        </div>
        <div className="settings-block">
          <span className="settings-block-label">وحدة الوزن / Unit</span>
          <div className="seg-control">
            <div className={"seg-option" + (unit === "kg" ? " active" : "")} onClick={() => onUnitChange("kg")}>كجم</div>
            <div className={"seg-option" + (unit === "lb" ? " active" : "")} onClick={() => onUnitChange("lb")}>رطل (lb)</div>
          </div>
        </div>

        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
