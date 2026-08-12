export type NotificationStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type NotificationAudienceType = "everyone" | "single_user" | "selected_users" | "topic" | "test_device";
export type NotificationPriority = "normal" | "high";

export interface NotificationRow {
  id: string;
  template_id: string | null;
  title: string;
  body: string;
  image_url: string | null;
  deep_link: string | null;
  category: string;
  priority: NotificationPriority;
  audience_type: NotificationAudienceType;
  audience_ref: Record<string, unknown> | null;
  status: NotificationStatus;
  variant_group: string | null;
  parent_campaign_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryCounts {
  pending: number;
  dispatching: number;
  sent: number;
  failed_temporary: number;
  failed_permanent: number;
  invalid_token: number;
}

export interface EventCounts {
  received: number;
  opened: number;
  click_through: number;
}
