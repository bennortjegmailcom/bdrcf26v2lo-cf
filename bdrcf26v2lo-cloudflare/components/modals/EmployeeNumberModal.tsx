
import React, { useState } from 'react';
import Modal from '../ui/Modal';

interface EmployeeNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeNumber: string) => void;
  currentName: string;
}

const EmployeeNumberModal: React.FC<EmployeeNumberModalProps> = ({ isOpen, onClose, onSubmit, currentName }) => {
  const [employeeNumber, setEmployeeNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeNumber.trim()) {
      onSubmit(employeeNumber.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Employee Information">
      <div className="space-y-4">
        <p className="text-gray-300 text-sm">
          Hello {currentName}! To ensure accurate reporting and assignments, please provide your employee number. 
          This helps us track breakdowns and tasks effectively.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emp-num-prompt" className="block text-sm font-medium text-gray-300">Employee Number</label>
            <input 
              type="text" 
              id="emp-num-prompt" 
              value={employeeNumber} 
              onChange={(e) => setEmployeeNumber(e.target.value)} 
              className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Enter your employee number"
              required 
              autoFocus
            />
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300 shadow-lg"
            >
              Update and Continue
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EmployeeNumberModal;
