import { Check, Clock, Package, Truck, Home, X } from 'lucide-react';
import clsx from 'clsx';
import type { OrderStatus } from '@/types';

interface OrderTimelineProps {
  status: OrderStatus;
  trackingUpdates?: Array<{
    status: string;
    message: string;
    timestamp: string;
  }>;
}

const steps = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: Check },
  { status: 'processing', label: 'Processing', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: Home },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
  refunded: -2,
};

export default function OrderTimeline({
  status,
  trackingUpdates,
}: OrderTimelineProps) {
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const currentStep = statusOrder[status] ?? 0;

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">
              Order {status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              This order has been {status}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline steps */}
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-neutral-200" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-500"
          style={{
            width: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%`,
          }}
        />

        {steps.map((step, index) => {
          const stepIndex = statusOrder[step.status];
          const isCompleted = currentStep > stepIndex;
          const isCurrent = currentStep === stepIndex;

          return (
            <div
              key={step.status}
              className="flex flex-col items-center relative z-10"
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isCompleted
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : isCurrent
                    ? 'bg-white border-primary-600 text-primary-600'
                    : 'bg-white border-neutral-300 text-neutral-400'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <p
                className={clsx(
                  'text-xs mt-2 font-medium text-center',
                  isCompleted || isCurrent
                    ? 'text-primary-700'
                    : 'text-neutral-400'
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tracking updates */}
      {trackingUpdates && trackingUpdates.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-700">
            Tracking Updates
          </h4>
          <div className="space-y-3">
            {trackingUpdates.map((update, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pl-4 border-l-2 border-neutral-200"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-700">
                    {update.message}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {update.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
