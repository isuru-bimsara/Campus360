export function getBaseByRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return "/admin";
  if (r === "TECHNICIAN") return "/tech";
  if (r === "OPERATION_MANAGER") return "/operation-manager";
  return "/user";
}

/**
 * Build route by role + notification type.
 * For ticket-related notifications we always deep-link to ticket via query:
 *   /<role>/tickets?ticketId=<id>
 * and for comment events:
 *   /<role>/tickets?ticketId=<id>&openComments=true
 */
export function getNotificationTarget(notification, role) {
  const base = getBaseByRole(role);
  if (!notification) return `${base}/notifications`;

  const { type, relatedId } = notification;
  const id = relatedId != null ? String(relatedId) : null;

  switch (type) {
    // Ticket notifications (support all old + new event names)
    case "TICKET_UPDATED":
    case "TICKET_ASSIGNED":
    case "TICKET_CREATED":
    case "TICKET_STATUS_CHANGED":
    case "TICKET_IN_PROGRESS":
    case "TICKET_RESOLVED":
    case "TICKET_CLOSED":
    case "TICKET_REJECTED":
    case "TICKET_RESOLUTION_ACKNOWLEDGED":
      return id ? `${base}/tickets?ticketId=${id}` : `${base}/tickets`;

    // Comment -> open comments immediately
    case "COMMENT_ADDED":
      return id
        ? `${base}/tickets?ticketId=${id}&openComments=true`
        : `${base}/tickets`;

    // Booking
    case "BOOKING_PENDING":
    case "BOOKING_APPROVED":
    case "BOOKING_REJECTED":
    case "BOOKING_CANCELLED":
      return id ? `${base}/bookings?bookingId=${id}` : `${base}/bookings`;

    // Resource
    case "RESOURCE_CREATED":
    case "RESOURCE_UPDATED":
    case "RESOURCE_DELETED":
      return id ? `${base}/resources?resourceId=${id}` : `${base}/resources`;

    case "ROLE_CHANGED":
      return `${base}/dashboard`;

    default:
      return `${base}/notifications`;
  }
}