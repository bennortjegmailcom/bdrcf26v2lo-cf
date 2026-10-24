import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, Role } from '../types';
import Toast from './ui/Toast';

const timeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

interface NotificationBellProps {
  user: User;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  const knownIds = useRef(new Set<string>());
  const isInitialLoad = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = () => {
      try {
        const cached = JSON.parse(localStorage.getItem('cache_notifications') || '[]');
        const fetched = cached.filter((n: Notification) => n.recipientUserId === user.id || n.recipientUserId === 'all_coordinators' || n.recipientUserId === 'all_management');
        fetched.sort((a: Notification, b: Notification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (isInitialLoad.current) {
          fetched.forEach((n: Notification) => knownIds.current.add(n.id));
          isInitialLoad.current = false;
        } else {
          const newNotif = fetched.find((n: Notification) => !knownIds.current.has(n.id));
          if (newNotif) {
            setToastNotification(newNotif);
            fetched.forEach((n: Notification) => knownIds.current.add(n.id));
            
            if (user.notificationSound) {
              const audio = new Audio(user.notificationSound);
              audio.play().catch(err => {
                if (err.name === 'NotAllowedError') {
                   console.warn("Notification sound blocked: User has not interacted with the document yet.");
                } else {
                   console.error("Error playing notification sound:", err);
                }
              });
            }
          }
        }
        setNotifications(fetched.slice(0, 20));
      } catch (e) {}
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsKeyRead = (id: string) => {
    try {
      const cached = JSON.parse(localStorage.getItem('cache_notifications') || '[]');
      const updated = cached.map((n: Notification) => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem('cache_notifications', JSON.stringify(updated));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const markAllAsRead = () => {
    try {
      const cached = JSON.parse(localStorage.getItem('cache_notifications') || '[]');
      const updated = cached.map((n: Notification) => ({ ...n, isRead: true }));
      localStorage.setItem('cache_notifications', JSON.stringify(updated));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const handleNotificationClick = (n: Notification) => {
    markAsKeyRead(n.id);
    setIsOpen(false);
    setToastNotification(null);

    const msg = n.message.toLowerCase();
    const isJobCard =
      msg.includes('lockout') ||
      msg.includes('job card') ||
      msg.includes('safety') ||
      msg.includes('isolation') ||
      msg.includes('positive test');

    if (n.relatedTicketId) {
      window.dispatchEvent(
        new CustomEvent('navigate_view', { detail: { view: 'tickets', ticketId: n.relatedTicketId } })
      );
    } else if (isJobCard) {
      if (user.role === Role.REPORTER) {
        const isLockoutRequest = msg.includes('request');
        window.dispatchEvent(
          new CustomEvent('navigate_view', {
            detail: {
              view: 'dashboard',
              focusId: isLockoutRequest ? 'lockout-notifications' : 'job-cards-notifications',
            },
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'tickets' } }));
      }
    } else if (n.relatedReportId) {
      localStorage.setItem('highlight_report_id', n.relatedReportId);
      window.dispatchEvent(
        new CustomEvent('navigate_view', { detail: { view: 'kanban', reportId: n.relatedReportId } })
      );
    } else {
      window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {toastNotification && (
        <Toast
          message={toastNotification.message}
          title={/lockout|job card|safety|isolation|positive test/i.test(toastNotification.message) ? 'Field Job Card' : 'New Notification'}
          onClose={() => setToastNotification(null)}
          onClick={() => handleNotificationClick(toastNotification)}
        />
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="relative text-gray-300 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800"></span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
          <div className="p-3 flex justify-between items-center border-b border-gray-700">
            <h4 className="font-semibold text-white">Notifications</h4>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:underline">Mark all as read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto text-left">
            {notifications.length > 0 ? (
              notifications.map(n => (
                <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700 ${!n.isRead ? 'bg-blue-900/20' : ''}`}>
                  <p className="text-sm text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.timestamp)}</p>
                </div>
              ))
            ) : <p className="text-gray-400 text-sm text-center p-4">No notifications yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;