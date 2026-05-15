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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-2">{message}</p>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">{inputLabel}</label>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            required={required}
            className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={3}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} disabled={isLoading || (required && !inputValue.trim())} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center">
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}