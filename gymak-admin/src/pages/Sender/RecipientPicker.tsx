import { useState } from "react";
import { useTopics } from "./useTopics";
import { useUserSearch, type UserSearchResult } from "./useUserSearch";
import type { AudienceChoice } from "./useSendNotification";

interface RecipientPickerProps {
  audienceType: AudienceChoice;
  onAudienceTypeChange: (value: AudienceChoice) => void;
  topicName: string;
  onTopicNameChange: (value: string) => void;
  selectedUser: UserSearchResult | null;
  onSelectedUserChange: (user: UserSearchResult | null) => void;
}

const options: { value: AudienceChoice; label: string }[] = [
  { value: "everyone", label: "الكل" },
  { value: "topic", label: "موضوع (Topic)" },
  { value: "single_user", label: "مستخدم محدد" },
];

export function RecipientPicker({
  audienceType,
  onAudienceTypeChange,
  topicName,
  onTopicNameChange,
  selectedUser,
  onSelectedUserChange,
}: RecipientPickerProps) {
  const { data: topics } = useTopics();
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const { data: userResults, isFetching: searchingUsers } = useUserSearch(userSearchTerm);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">المستلمون</label>
      <div className="mb-3 flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAudienceTypeChange(opt.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              audienceType === opt.value
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {audienceType === "topic" ? (
        <select
          value={topicName}
          onChange={(e) => onTopicNameChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">اختر موضوعًا...</option>
          {(topics ?? []).map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      ) : null}

      {audienceType === "single_user" ? (
        <div>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
              <span>{selectedUser.name || selectedUser.username || selectedUser.id}</span>
              <button
                type="button"
                onClick={() => onSelectedUserChange(null)}
                className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400"
              >
                إزالة
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو اسم المستخدم..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
              />
              {userSearchTerm.trim().length >= 2 ? (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {searchingUsers ? (
                    <p className="p-3 text-sm text-gray-500">جارٍ البحث...</p>
                  ) : userResults && userResults.length > 0 ? (
                    userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectedUserChange(u);
                          setUserSearchTerm("");
                        }}
                        className="block w-full px-3 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {u.name || u.username || u.id}
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-gray-500">لا نتائج</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
