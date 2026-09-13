import { cn } from "@/lib/utils";

export type OrderStatus = "Pending" | "Paid" | "Shipped" | "Delivered" | "Cancelled";
export const orderStatuses: OrderStatus[] = ["Pending", "Paid", "Shipped", "Delivered", "Cancelled"];

const styles: Record<OrderStatus, string> = {
  Pending: "bg-secondary text-muted-foreground",
  Paid: "bg-primary/15 text-primary",
  Shipped: "bg-foreground text-background",
  Delivered: "bg-success/15 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase", styles[status])}>{status}</span>
  );
}
