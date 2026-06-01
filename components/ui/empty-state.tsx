// components/ui/empty-state.tsx
// 空状态组件 - 列表为空时展示

import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮（可选） */
  action?: React.ReactNode;
  /** 额外类名 */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
}
