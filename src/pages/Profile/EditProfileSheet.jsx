import {useI18n} from "../../hooks/useI18n";
import {identityText} from "../../lib/accountIdentity";
import { useRef, useState } from "react";
import { GRADIENTS } from "./badgeData";
import { tx, txf } from "../../lib/i18n/tx";

const press = (fn) => ({ role: "button", tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(e); } } });

export default function EditProfileSheet({ profile, onClose, onSave, onPickAvatar, onPickCover, onPickGradient }) {
  const {lang}=useI18n();const it=identityText[lang==='en'?'en':'ar'];
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [name, setName] = useState(profile.name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [gender, setGender] = useState(profile.gender || null);
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  async function handleSave() {setBusy(true);setError('');try{await onSave({ name, username, bio, gender });}catch(e){setError(it[Object.keys(it).find(k=>(e.message||'').includes(k))]||it.error);}finally{setBusy(false);}}

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>{tx("تعديل الملف الشخصي")}</h3>

        <div className="edit-photo-row">
          <div className="edit-photo-btn" {...press(() => avatarInput.current?.click())}>{tx("تغيير الصورة الشخصية")}</div>
          <div className="edit-photo-btn" {...press(() => coverInput.current?.click())}>{tx("رفع صورة غلاف")}</div>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickAvatar(e.target.files?.[0])} />
        <input ref={coverInput} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickCover(e.target.files?.[0])} />

        <span className="cover-gradient-label">{tx("أو اختار خلفية جاهزة للغلاف")}</span>
        <div className="cover-gradient-row">
          {Object.keys(GRADIENTS).map((id) => (
            <div
              key={id}
              className={"gradient-swatch" + (!profile.cover && profile.coverGradient === id ? " active" : "")}
              style={{ backgroundImage: GRADIENTS[id] }}
              role="button"
              aria-label={txf(`خلفية غلاف {0}`, [id])}
              onClick={() => onPickGradient(id)}
            />
          ))}
        </div>

        <div className="edit-field">
          <label htmlFor="editName">{tx("الاسم")}</label>
          <input id="editName" maxLength={40} placeholder={tx("اكتب اسمك")} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="edit-field">
          <label htmlFor="editUsername">{tx("الاسم المختصر")}</label>
          <div className="username-input-wrap">
            <span>@</span>
            <input id="editUsername" maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <div className="edit-field">
          <label htmlFor="editBio">{tx("النبذة")}</label>
          <textarea id="editBio" maxLength={150} placeholder={tx("اكتب نبذة عنك، هدفك من التمرين...")} value={bio} onChange={(e) => setBio(e.target.value)} />
          <div className="bio-counter"><span>{bio.length}</span>/150</div>
        </div>
        <div className="edit-field">
          <label>{tx("الجنس")}</label>
          <div className="seg-control">
            <div className={"seg-option" + (gender === "male" ? " active" : "")} aria-pressed={gender === "male"} {...press(() => setGender("male"))}>{tx("راجل")}</div>
            <div className={"seg-option" + (gender === "female" ? " active" : "")} aria-pressed={gender === "female"} {...press(() => setGender("female"))}>{tx("ست")}</div>
          </div>
        </div>

        {error&&<p role="alert">{error}</p>}
        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>{tx("إلغاء")}</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "#fff" }} disabled={busy} onClick={handleSave}>{tx("حفظ")}</button>
        </div>
      </div>
    </div>
  );
}
