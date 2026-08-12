interface BadgeProps {
  children: string;
  tone?: "gray" | "green" | "red" | "amber" | "blue";
}

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  green: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
};

export function Badge({ children, tone = "gray" }: BadgeProps) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>
  );
}
