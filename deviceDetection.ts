// src/components/DescriptionModal.tsx
import React from 'react';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({ isOpen, onClose, title, description }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4 text-text-default">{title}</h2>
        <p className="text-text-secondary mb-6 whitespace-pre-wrap">{description}</p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-primary"
          aria-label="关闭"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
};

export default DescriptionModal;
