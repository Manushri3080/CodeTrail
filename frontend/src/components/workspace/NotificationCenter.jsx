import React from "react";
import {
  Bell,
  CheckCircle2,
  Code2,
  Mail,
  UserMinus,
  UserPlus,
  Sliders,
  Clock,
  ShieldAlert,
  ShieldCheck,
  X
} from "lucide-react";

const ICONS = {
  participant_joined: UserPlus,
  participant_left: UserMinus,
  workspace_invitation: Mail,
  execution_status: Code2,
  settings_updated: Sliders,
  session_summary: Clock,
  role_updated: ShieldCheck,
  security_alert: ShieldAlert,
};

const ICON_COLORS = {
  participant_joined: "text-cyan-300",
  participant_left: "text-gray-400",
  workspace_invitation: "text-purple-300",
  settings_updated: "text-blue-300",
  session_summary: "text-amber-300",
  role_updated: "text-emerald-400",
  security_alert: "text-rose-400",
};

const getIcon = (type) => ICONS[type] || Bell;

const NotificationCenter = ({ notifications, isOpen, onToggle, onDismiss, onClear }) => {
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`relative flex items-center rounded-xl border text-xs font-mono transition-all ${
          isOpen
            ? "border-purple-400 bg-purple-500/25 text-purple-100"
            : "border-white/15 bg-white/[0.08] text-gray-200 hover:bg-white/[0.12]"
        }`}
        style={{ padding: "8px 14px", gap: "8px" }}
        title="Open notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={14} className="text-purple-300" />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="min-w-5 rounded-full bg-purple-500 px-1.5 py-0.5 text-center text-[10px] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[120] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/15 bg-[#13141f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Notifications</h2>
              <p className="text-[11px] text-gray-400">Live workspace updates</p>
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={onClear} className="text-[11px] text-purple-300 hover:text-purple-200">
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <CheckCircle2 size={22} className="mx-auto mb-2 text-emerald-400" />
                You are all caught up.
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const iconColor = notification.type === 'execution_status'
                  ? (notification.status === 'success' ? 'text-emerald-400' : 'text-rose-400')
                  : (ICON_COLORS[notification.type] || 'text-cyan-300');

                return (
                  <div key={notification.id} className="flex gap-3 border-b border-white/5 px-5 py-4 last:border-0">
                    <Icon size={16} className={`mt-0.5 shrink-0 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-100 leading-relaxed">{notification.title}</p>
                      <p className="mt-2 text-xs leading-6 text-gray-300 break-words whitespace-pre-line">{notification.message}</p>
                      <time className="mt-2 block text-[10px] text-gray-500">
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Just now"}
                      </time>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismiss(notification.id)}
                      className="h-fit rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-white shrink-0"
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
