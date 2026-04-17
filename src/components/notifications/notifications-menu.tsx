"use client";

import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import {
  formatDateWithPreferences,
  DEFAULT_USER_PREFERENCES,
} from "@/lib/user-preferences";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";

export function NotificationsMenu() {
  const {
    items,
    unreadCount,
    markRead,
    markAllRead,
    isLoading,
    error,
    isMarkingAllRead,
  } = useNotifications();
  const prefsOptional = useUserPreferencesOptional();
  const unreadItems = items.filter((n) => !n.read);

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return formatDateWithPreferences(
      d,
      prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 shrink-0"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        {unreadItems.length > 0 && unreadCount > 0 ? (
          <div className="flex items-center justify-end gap-2 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              disabled={isMarkingAllRead}
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
            >
              {isMarkingAllRead ? "Saving…" : "Mark all read"}
            </Button>
          </div>
        ) : null}
        <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 px-3 py-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/80" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/80" />
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-sm text-destructive">
              {error.message || "Could not load notifications."}
            </div>
          ) : unreadItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-2 text-center">
              <BellOff className="h-5 w-5 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            </div>
          ) : (
            unreadItems.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer flex-col items-start gap-0.5 rounded-none bg-primary/5 px-3 py-2.5"
                onClick={() => markRead(n.id)}
              >
                <span className="w-full text-left font-medium leading-snug">
                  {n.title}
                  <span className="mx-1 text-muted-foreground/60">•</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {formatWhen(n.createdAt)}
                  </span>
                </span>
                {n.body ? (
                  <span className="w-full text-left text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1">
          <DropdownMenuItem asChild className="cursor-pointer justify-center">
            <Link href="/account/notifications">See all notifications</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
