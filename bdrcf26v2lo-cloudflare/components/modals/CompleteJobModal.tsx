
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

interface CompleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (completedTime: string) => void;
}

const CompleteJobModal: React.FC<CompleteJobModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [completedTime, setCompletedTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Adjust to local timezone for datetime-local input
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setCompletedTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedTime) {
        alert('Please select a completion time.');
        return;
    }
    const dateObj = new Date(completedTime);
    onSubmit(dateObj.toISOString());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-300 text-sm">
          Please confirm the time this breakdown was completed.
        </p>
        <div>
          <label htmlFor="completedTime" className="block text-sm font-medium text-gray-300">Completed Time</label>
          <input
            type="datetime-local"
            id="completedTime"
            value={completedTime}
            onChange={(e) => setCompletedTime(e.target.value)}
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
            required
          />
        </div>
        <div className="flex justify-end pt-4 space-x-2">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Mark Complete</button>
        </div>
      </form>
    </Modal>
  );
};

export default CompleteJobModal;
