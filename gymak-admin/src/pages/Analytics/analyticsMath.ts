export interface CampaignMetrics {
  totalTargeted: number;
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
}

export function computeMetrics(input: {
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
}): CampaignMetrics {
  const { totalTargeted, sentCount, failedCount, openedCount, clickedCount } = input;
  const safeDiv = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  return {
    totalTargeted,
    sent: sentCount,
    failed: failedCount,
    opened: openedCount,
    clicked: clickedCount,
    deliveryRate: safeDiv(sentCount, totalTargeted),
    openRate: safeDiv(openedCount, sentCount),
    clickThroughRate: safeDiv(clickedCount, sentCount),
  };
}
