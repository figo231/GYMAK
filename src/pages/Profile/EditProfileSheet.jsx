import { useRef, useState } from "react";
import { GRADIENTS } from "./badgeData";

export default function EditProfileSheet({ profile, onClose, onSave, onPickAvatar, onPickCover, onPickGradient }) {
  const [name, setName] = useState(profile.name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [gender, setGender] = useState(profile.gender || null);
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  function handleSave() {
    onSave({ name, username, bio, gender });
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>تعديل الملف الشخصي</h3>

        <div className="edit-photo-row">
          <div className="edit-photo-btn" onClick={() => avatarInput.current?.click()}>تغيير الصورة الشخصية</div>
          <div className="edit-photo-btn" onClick={() => coverInput.current?.click()}>رفع صورة غلاف</div>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickAvatar(e.target.files?.[0])} />
        <input ref={coverInput} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickCover(e.target.files?.[0])} />

        <span className="cover-gradient-label">أو اختار خلفية جاهزة للغلاف</span>
        <div className="cover-gradient-row">
          {Object.keys(GRADIENTS).map((id) => (
            <div
              key={id}
              className={"gradient-swatch" + (!profile.cover && profile.coverGradient === id ? " active" : "")}
              style={{ backgroundImage: GRADIENTS[id] }}
              role="button"
              aria-label={`خلفية غلاف ${id}`}
              onClick={() => onPickGradient(id)}
            />
          ))}
        </div>

        <div className="edit-field">
          <label htmlFor="editName">الاسم</label>
          <input id="editName" maxLength={40} placeholder="اكتب اسمك" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="edit-field">
          <label htmlFor="editUsername">اسم المستخدم</label>
          <div className="username-input-wrap">
            <span>@</span>
            <input id="editUsername" maxLength={30} placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <div className="edit-field">
          <label htmlFor="editBio">النبذة</label>
          <textarea id="editBio" maxLength={150} placeholder="اكتب نبذة عنك، هدفك من التمرين..." value={bio} onChange={(e) => setBio(e.target.value)} />
          <div className="bio-counter"><span>{bio.length}</span>/150</div>
        </div>
        <div className="edit-field">
          <label>الجنس</label>
          <div className="seg-control">
            <div className={"seg-option" + (gender === "male" ? " active" : "")} onClick={() => setGender("male")}>راجل</div>
            <div className={"seg-option" + (gender === "female" ? " active" : "")} onClick={() => setGender("female")}>ست</div>
          </div>
        </div>

        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>إلغاء</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "#fff" }} onClick={handleSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
