import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { CheckCircle2, Flame, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notification, clearNotification } = useGame();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 ${
        notification.type === 'burn'
          ? 'bg-neutral-900/95 border-amber-500/50 text-amber-200'
          : notification.type === 'success'
          ? 'bg-neutral-900/95 border-emerald-500/50 text-emerald-200'
          : 'bg-neutral-900/95 border-neutral-700 text-neutral-200'
      }`}>
        <div className="shrink-0 mt-0.5">
          {notification.type === 'burn' ? (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          ) : notification.type === 'success' ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Info className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex-1 text-xs leading-relaxed font-medium">
          {notification.message}
        </div>

        <button
          onClick={clearNotification}
          className="text-neutral-400 hover:text-white shrink-0 p-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
