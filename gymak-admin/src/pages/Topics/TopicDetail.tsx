import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useTopicDetail } from "./useTopicDetail";

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useTopicDetail(id);

  return (
    <div>
      <Link
        to="/topics"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <ArrowRight size={16} />
        رجوع للمواضيع
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : data ? (
        <div className="space-y-4">
          <Card>
            <h1 className="mb-1 font-mono text-lg font-bold">{data.topic.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{data.topic.description || "بدون وصف"}</p>
            <p className="mt-2 text-xs text-gray-400">
              أُنشئ في {new Date(data.topic.created_at).toLocaleDateString("ar-EG")}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">عدد الأجهزة المشتركة</p>
            <p className="mt-1 text-2xl font-bold">{data.subscriberCount}</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
