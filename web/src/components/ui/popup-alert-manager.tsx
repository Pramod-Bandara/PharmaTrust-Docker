'use client';

import React, { useState, useCallback, useEffect } from 'react';
import PopupAlert from './popup-alert';

export interface AlertData {
  id?: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  deviceId?: string;
  batchId?: string;
  temperature?: number;
  humidity?: number;
  location?: string;
  autoClose?: number;
}

interface PopupAlertManagerProps {
  maxAlerts?: number;
}

const PopupAlertManager: React.FC<PopupAlertManagerProps> = ({ maxAlerts = 5 }) => {
  const [alerts, setAlerts] = useState<(AlertData & { id: string; timestamp: Date })[]>([]);

  const addAlert = useCallback((alertData: AlertData) => {
    const id = alertData.id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAlert = {
      ...alertData,
      id,
      timestamp: new Date()
    };

    setAlerts(prev => {
      // Remove oldest alerts if we exceed maxAlerts
      const filteredAlerts = prev.length >= maxAlerts ? prev.slice(1) : prev;
      return [...filteredAlerts, newAlert];
    });
  }, [maxAlerts]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Expose methods for external use
  useEffect(() => {
    // Store methods on window object for global access
    (window as any).popupAlertManager = {
      addAlert,
      removeAlert,
      clearAllAlerts
    };

    return () => {
      delete (window as any).popupAlertManager;
    };
  }, [addAlert, removeAlert, clearAllAlerts]);

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="space-y-2 p-4">
        {alerts.map((alert, index) => (
          <div 
            key={alert.id}
            className="pointer-events-auto"
            style={{ 
              transform: `translateY(${index * 10}px)`,
              zIndex: 1000 - index 
            }}
          >
            <PopupAlert
              id={alert.id}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              deviceId={alert.deviceId}
              batchId={alert.batchId}
              temperature={alert.temperature}
              humidity={alert.humidity}
              location={alert.location}
              timestamp={alert.timestamp}
              autoClose={alert.autoClose}
              onClose={removeAlert}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to add alerts from anywhere in the app
export const addPopupAlert = (alertData: AlertData) => {
  if ((window as any).popupAlertManager) {
    (window as any).popupAlertManager.addAlert(alertData);
  }
};

export const clearPopupAlerts = () => {
  if ((window as any).popupAlertManager) {
    (window as any).popupAlertManager.clearAllAlerts();
  }
};

export default PopupAlertManager;
