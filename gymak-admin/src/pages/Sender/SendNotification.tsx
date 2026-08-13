import { useState } from "react";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { TemplatePicker } from "./TemplatePicker";
import { CategoryPriorityFields } from "./CategoryPriorityFields";
import { RecipientPicker } from "./RecipientPicker";
import { NotificationPreview } from "./NotificationPreview";
import { useSendNotification, type AudienceChoice } from "./useSendNotification";
import type { UserSearchResult } from "./useUserSearch";

interface FormErrors {
  title?: string;
  body?: string;
  topic?: string;
  user?: string;
}

export default function SendNotification() {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("system");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [audienceType, setAudienceType] = useState<AudienceChoice>("everyone");
  const [topicName, setTopicName] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const sendMutation = useSendNotification();

  function handleTemplateSelect(id: string | null, tTitle: string, tBody: string, tCategory: string) {
    setTemplateId(id);
    if (id) {
      setTitle(tTitle);
      setBody(tBody);
      if (tCategory) setCategory(tCategory);
    }
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "العنوان مطلوب";
    if (!body.trim()) next.body = "نص الإشعار مطلوب";
    if (audienceType === "topic" && !topicName) next.topic = "اختر موضوعًا";
    if (audienceType === "single_user" && !selectedUser) next.user = "اختر مستخدمًا";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    sendMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      category,
      priority,
      audienceType,
      topicName: audienceType === "topic" ? topicName : null,
      selectedUserId: audienceType === "single_user" ? (selectedUser?.id ?? null) : null,
      templateId,
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">إرسال إشعار</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="space-y-4">
              <TemplatePicker value={templateId} onSelect={handleTemplateSelect} />

              <div>
                <label className="mb-1 block text-sm font-medium">العنوان</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
                />
                {errors.title ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">النص</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
                />
                {errors.body ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.body}</p> : null}
              </div>

              <CategoryPriorityFields
                category={category}
                onCategoryChange={setCategory}
                priority={priority}
                onPriorityChange={setPriority}
              />

              <div>
                <RecipientPicker
                  audienceType={audienceType}
                  onAudienceTypeChange={setAudienceType}
                  topicName={topicName}
                  onTopicNameChange={setTopicName}
                  selectedUser={selectedUser}
                  onSelectedUserChange={setSelectedUser}
                />
                {errors.topic ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.topic}</p> : null}
                {errors.user ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.user}</p> : null}
              </div>
            </div>
          </Card>

          {sendMutation.isError ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <XCircle size={18} />
              {(sendMutation.error as Error).message}
            </div>
          ) : null}

          {sendMutation.isSuccess ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
              <CheckCircle2 size={18} />
              تم إرسال الحملة بنجاح
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={sendMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {sendMutation.isPending ? <Spinner className="border-white/40 border-t-white" /> : <Send size={16} />}
            إرسال الآن
          </button>
        </div>

        <div>
          <NotificationPreview title={title} body={body} />
        </div>
      </div>
    </div>
  );
}
