import { PRODUCT_NAME } from "./prospect-chat";

/**
 * Support requests — the stored copy of every "Contact support" message from the
 * landing-page chat (`public.support_requests`), worked through at /admin/support.
 */

export const SUPPORT_REQUEST_STATUSES = ["open", "resolved"] as const;
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export const SUPPORT_REQUEST_STATUS_LABELS: Record<SupportRequestStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

/** Newest requests loaded into the admin inbox in one fetch. */
export const ADMIN_SUPPORT_REQUESTS_LIMIT = 500;
/** Requests revealed per "Show more" in the admin inbox. */
export const ADMIN_SUPPORT_REQUESTS_PAGE_SIZE = 20;

/** Subject line prefilled when an admin replies from the inbox. */
export const SUPPORT_REPLY_SUBJECT = `Re: your ${PRODUCT_NAME} support request`;

/** Who said each line of the attached chat (same wording as the notification email). */
export const SUPPORT_TRANSCRIPT_SPEAKER_LABELS = {
  user: "Visitor",
  assistant: "Assistant",
} as const;
