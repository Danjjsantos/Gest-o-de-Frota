import React, { useEffect } from 'react';
import { AlertTriangle, Wrench, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useFleet } from '../context/FleetContext';

interface AlertBannerProps {
  onNavigateToOS?: () => void;
  onNavigateToFleet?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateToOS, onNavigateToFleet }) => {
  const { activeBanner, dismissBanner } = useFleet();

  // Play pleasant notification sound when activeBanner triggers
  useEffect(() => {
    if (activeBanner) {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        // AudioContext error silently ignored if audio not permitted
      }

      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        dismissBanner();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeBanner, dismissBanner]);

  if (!activeBanner) return null;

  const isOS = activeBanner.type === 'os_opened';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3.5 backdrop-blur-md ${
        isOS 
          ? 'bg-orange-950/95 text-white border-orange-600 shadow-orange-950/50' 
          : 'bg-red-950/95 text-white border-red-600 shadow-red-950/50'
      }`}>
        <div className={`p-2.5 rounded-xl shrink-0 ${isOS ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
          {isOS ? <Wrench className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>{activeBanner.title}</span>
            </h4>
            <button 
              onClick={dismissBanner}
              className="text-white/60 hover:text-white p-1 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-white/80 mt-1 leading-relaxed">
            {activeBanner.message}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            {isOS && onNavigateToOS && (
              <button
                onClick={() => {
                  onNavigateToOS();
                  dismissBanner();
                }}
                className="text-xs bg-white text-orange-900 font-bold px-3 py-1 rounded-lg hover:bg-orange-100 flex items-center gap-1 transition"
              >
                <span>Ver Ordem de Serviço</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {!isOS && onNavigateToFleet && (
              <button
                onClick={() => {
                  onNavigateToFleet();
                  dismissBanner();
                }}
                className="text-xs bg-white text-red-950 font-bold px-3 py-1 rounded-lg hover:bg-red-100 flex items-center gap-1 transition"
              >
                <span>Ver Documentos</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={dismissBanner}
              className="text-xs text-white/70 hover:text-white px-2 py-1"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
