import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  onClick?: () => void;
  title?: string;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, onClick, title = 'New Notification' }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Hide after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={onClick ? 'Open notification' : undefined}
      className={`fixed top-5 right-5 bg-gray-800 border-l-4 border-blue-500 text-white p-4 rounded-lg shadow-2xl z-50 animate-bounce-in min-w-[300px] ${onClick ? 'cursor-pointer hover:bg-gray-700 transition-colors' : ''}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-sm font-medium text-gray-100">{message}</p>
          {onClick && <p className="text-[10px] text-blue-300/80 mt-1">Click to open</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="ml-auto pl-3 text-gray-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// A simple bounce-in animation using a style tag as we can't modify tailwind.config.js
const animationStyle = `
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  50% {
    opacity: 1;
    transform: translateY(5px);
  }
  100% {
    transform: translateY(0);
  }
}
.animate-bounce-in {
  animation: bounce-in 0.5s ease-out;
}
`;

const StyleInjector: React.FC = () => {
    return <style>{animationStyle}</style>
}

const ToastWithAnimation: React.FC<ToastProps> = (props) => (
    <>
        <StyleInjector />
        <Toast {...props} />
    </>
);


export default ToastWithAnimation;
