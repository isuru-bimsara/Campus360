import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../api/notifications";
import { getNotificationTarget } from "./notificationNavigation";
import { useNotifications } from "../context/NotificationContext";

/**
 * Shared click handler for all roles.
 * role: "USER" | "ADMIN" | "TECHNICIAN" | "OPERATION_MANAGER"
 */
export default function useNotificationClick(setNotifications, role) {
  const navigate = useNavigate();
  const { fetchUnreadCount } = useNotifications();

  return useCallback(
    (notification) => {
      const target = getNotificationTarget(notification, role);

      // navigate first for instant UX
      navigate(target);

      // mark read in background
      if (!notification.read) {
        notificationsApi
          .markAsRead(notification.id)
          .then(() => {
            if (setNotifications) {
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === notification.id ? { ...n, read: true } : n
                )
              );
            }
            fetchUnreadCount();
          })
          .catch((err) => {
            console.error("markAsRead failed:", err);
          });
      }
    },
    [navigate, role, setNotifications, fetchUnreadCount]
  );
}