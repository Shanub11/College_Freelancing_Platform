import React, { useState, useEffect } from "react";

export interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  inputLabel: string;
  inputPlaceholder?: string;
  required?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PromptModal({
  isOpen,
  title,
  message,
  inputLabel,
  inputPlaceholder,
  required = false,
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
}: PromptModalProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (required && !inputValue.trim()) return;
    onConfirm(inputValue);
  };

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
      <div className="modal-content w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <h2 id="prompt-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{message}</p>
        
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{inputLabel}</label>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            required={required}
            className="input-field min-h-[100px] resize-y mt-2"
            rows={3}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={onCancel} 
            disabled={isLoading} 
            className="btn-secondary flex-1 !py-2.5 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isLoading || (required && !inputValue.trim())} 
            className="btn-primary flex-1 !py-2.5 text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}