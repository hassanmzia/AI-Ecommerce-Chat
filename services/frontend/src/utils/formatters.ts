import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  parseISO,
} from 'date-fns';

export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, formatStr = 'MMM d, yyyy'): string {
  try {
    const date = parseISO(dateStr);
    return format(date, formatStr);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatChatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);

    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEEE');
    }
    if (isThisYear(date)) {
      return format(date, 'MMM d');
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatMessageTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'h:mm a');
  } catch {
    return '';
  }
}

export function groupByDate(
  dateStr: string
): 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Older' {
  try {
    const date = parseISO(dateStr);

    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return 'This Week';

    const now = new Date();
    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return 'This Month';
    }
    return 'Older';
  } catch {
    return 'Older';
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function generateAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials;
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-pink-500',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatOrderId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-error',
    refunded: 'badge-neutral',
    completed: 'badge-success',
    failed: 'badge-error',
    online: 'badge-success',
    offline: 'badge-neutral',
    busy: 'badge-warning',
    error: 'badge-error',
  };
  return statusColors[status] || 'badge-neutral';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
