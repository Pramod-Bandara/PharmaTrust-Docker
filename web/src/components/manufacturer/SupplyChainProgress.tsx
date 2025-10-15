'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Factory, 
  Truck, 
  Store, 
  User, 
  CheckCircle, 
  Clock,
  MapPin
} from 'lucide-react';
import { MedicineBatch } from '@/types';

interface SupplyChainProgressProps {
  batch: MedicineBatch;
  className?: string;
}

const SupplyChainProgress = ({ batch, className = '' }: SupplyChainProgressProps) => {
  const stages = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      icon: Factory,
      description: 'Batch created and quality tested'
    },
    {
      key: 'supplier',
      label: 'Supplier/Distributor',
      icon: Truck,
      description: 'In transit with environmental monitoring'
    },
    {
      key: 'pharmacist',
      label: 'Pharmacy',
      icon: Store,
      description: 'Ready for dispensing to patients'
    },
    {
      key: 'customer',
      label: 'Customer',
      icon: User,
      description: 'Delivered to end consumer'
    }
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.key === batch.currentStage);
  };

  const getStageStatus = (stageIndex: number) => {
    const currentIndex = getCurrentStageIndex();
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'current': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'current': return 'text-blue-600';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getSupplyChainEntry = (stageKey: string) => {
    return batch.supplyChain.find(entry => entry.stage === stageKey);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Supply Chain Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            const entry = getSupplyChainEntry(stage.key);
            const Icon = stage.icon;
            
            return (
              <div key={stage.key} className="relative">
                <div className="flex items-center space-x-4">
                  {/* Stage Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getStageColor(status)}`}>
                    {status === 'completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : status === 'current' ? (
                      <Clock className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Icon className={`h-6 w-6 ${getIconColor(status)}`} />
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-medium text-gray-900">{stage.label}</h3>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStageColor(status)}`}
                      >
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                    
                    {entry && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <span className="ml-2 text-gray-900">{entry.location}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Entity:</span>
                            <span className="ml-2 text-gray-900">{entry.entityId}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">Timestamp:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.notes && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">Notes:</span>
                              <span className="ml-2 text-gray-900">{entry.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < stages.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">Current Stage:</span>
              <Badge className={getStageColor('current')}>
                {batch.currentStage.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">Progress:</span>
              <span className="text-gray-900">
                {getCurrentStageIndex() + 1} of {stages.length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplyChainProgress;
