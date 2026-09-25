import React, { CSSProperties, ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'urgent' | 'high' | 'med' | 'medium' | 'low' | 'leaf' | 'success' | 'brick' | 'danger' | 'overdue' | 'syncing' | 'p1' | 'p2' | 'p3' | 'p4';
  style?: CSSProperties;
  className?: string;
}

export function Badge({ children, variant = 'default', style = {}, className = '' }: BadgeProps) {
  let cls = 'badge';
  if (variant === 'urgent' || variant === 'p1') cls += ' badge-urgent';
  else if (variant === 'high' || variant === 'p2') cls += ' badge-high';
  else if (variant === 'med' || variant === 'medium' || variant === 'p3') cls += ' badge-med';
  else if (variant === 'low' || variant === 'p4') cls += ' badge-low';
  else if (variant === 'leaf' || variant === 'success') cls += ' badge-leaf';
  else if (variant === 'brick' || variant === 'danger' || variant === 'overdue') cls += ' badge-brick';
  else if (variant === 'syncing') cls += ' badge-syncing';

  if (className) cls += ' ' + className;

  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
