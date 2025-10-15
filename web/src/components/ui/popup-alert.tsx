'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Thermometer, Droplets, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PopupAlertProps {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  deviceId?: string;
  batchId?: string;
  temperature?: number;
  humidity?: number;
  location?: string;
  timestamp: Date;
  autoClose?: number; // Auto close after X milliseconds
  onClose: (id: string) => void;
}

const PopupAlert: React.FC<PopupAlertProps> = ({
  id,
  type,
  title,
  message,
  deviceId,
  batchId,
  temperature,
  humidity,
  location,
  timestamp,
  autoClose = 10000, // 10 seconds default
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (autoClose > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (autoClose / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Allow fade out animation
      }, autoClose);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [autoClose, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const getAlertStyles = () => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          border: 'border-red-600',
          icon: 'text-red-100',
          progressBg: 'bg-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          text: 'text-white',
          border: 'border-yellow-500',
          icon: 'text-yellow-100',
          progressBg: 'bg-yellow-300'
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          border: 'border-blue-600',
          icon: 'text-blue-100',
          progressBg: 'bg-blue-400'
        };
    }
  };

  const styles = getAlertStyles();

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 w-96 ${styles.bg} ${styles.text} rounded-lg shadow-2xl 
      border-2 ${styles.border} z-50 transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      {/* Progress bar */}
      {autoClose > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg w-full">
          <div 
            className={`h-full ${styles.progressBg} rounded-tl-lg transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <Button
            onClick={handleClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 h-6 w-6"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm mb-3 opacity-90">{message}</p>

        {/* Device Information */}
        {(deviceId || batchId || temperature !== undefined || humidity !== undefined) && (
          <div className="bg-black bg-opacity-20 rounded p-3 mb-3 space-y-2">
            {deviceId && (
              <div className="flex items-center space-x-2 text-xs">
                <Badge className="bg-white bg-opacity-20 text-white text-xs">
                  Device: {deviceId}
                </Badge>
              </div>
            )}
            
            {batchId && (
              <div className="flex items-center space-x-2 text-xs">
                <Badge className="bg-white bg-opacity-20 text-white text-xs">
                  Batch: {batchId}
                </Badge>
              </div>
            )}

            {(temperature !== undefined || humidity !== undefined) && (
              <div className="flex items-center space-x-4 text-sm">
                {temperature !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Thermometer className="h-4 w-4" />
                    <span>{temperature.toFixed(1)}°C</span>
                  </div>
                )}
                {humidity !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Droplets className="h-4 w-4" />
                    <span>{humidity.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            {location && (
              <div className="flex items-center space-x-1 text-xs">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center space-x-1 text-xs opacity-75">
          <Clock className="h-3 w-3" />
          <span>{timestamp.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PopupAlert;
