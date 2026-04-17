/** Client view of `user_notifications` (see `loadMyNotifications`). */
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
