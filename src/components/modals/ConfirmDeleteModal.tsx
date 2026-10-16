import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  itemCategory?: string;
  warningNote?: string;
  confirmButtonText?: string;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemCategory,
  warningNote = 'Esta ação é irreversível e excluirá o registro definitivamente.',
  confirmButtonText = 'Sim, Excluir',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {title}
              </h3>
              {itemCategory && (
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  {itemCategory}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>

          {itemName && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Item a ser excluído:</span>
              <strong className="text-xs font-mono font-black text-slate-900">{itemName}</strong>
            </div>
          )}

          {warningNote && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{warningNote}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Excluindo...' : confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
