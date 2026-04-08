import { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { supabase, hasSupabaseEnv } from '../lib/supabase.js';

const MerchantNotificationContext = createContext(null);

export function MerchantNotificationProvider({ children, merchantId }) {
  const [notifications, setNotifications] = useState([]);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef(null);

  const addNotification = useCallback((notification) => {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications((prev) => [entry, ...prev].slice(0, 50));

    if (notification.type === 'new_order') {
      setNewOrderCount((prev) => prev + 1);
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [soundEnabled]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNewOrderCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv || !merchantId) return undefined;

    const channel = supabase
      .channel(`merchant-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          addNotification({
            type: 'new_order',
            title: 'New Order Received',
            message: `Order #${String(payload.new.id || '').slice(0, 8)} from ${payload.new.customer_name}`,
            orderId: payload.new.id,
            priority: payload.new.priority_delivery ? 'high' : 'normal',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          if (payload.new.status === 'cancelled') {
            addNotification({
              type: 'order_cancelled',
              title: 'Order Cancelled',
              message: `Order #${String(payload.old?.id || '').slice(0, 8)} has been cancelled`,
              orderId: payload.old?.id,
              priority: 'high',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, addNotification]);

  const value = {
    notifications,
    newOrderCount,
    soundEnabled,
    setSoundEnabled,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <MerchantNotificationContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </MerchantNotificationContext.Provider>
  );
}

export function useMerchantNotifications() {
  const context = useContext(MerchantNotificationContext);
  if (!context) {
    throw new Error('useMerchantNotifications must be used within MerchantNotificationProvider');
  }
  return context;
}