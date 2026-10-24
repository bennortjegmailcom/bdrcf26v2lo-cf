import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { User } from '../../types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (userId: string, password: string) => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, user, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    onSubmit(user.id, password.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password: ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 p-3 rounded-md border border-gray-700 text-xs text-gray-300">
          <p><span className="text-gray-500">User:</span> <strong className="text-white">{user.name}</strong></p>
          <p><span className="text-gray-500">Role:</span> {user.role}</p>
          <p><span className="text-gray-500">Area:</span> {user.workGroup || '-'}</p>
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-amber-300">New Password</label>
          <input
            type="text"
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-gray-700 border border-amber-600/60 text-white rounded-md p-2 text-sm"
            placeholder="Enter new password"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">Confirm Password</label>
          <input
            type="text"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm"
            placeholder="Re-enter new password"
            required
          />
        </div>
        <div className="flex justify-end pt-2 space-x-2">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-md">Reset Password</button>
        </div>
      </form>
    </Modal>
  );
};

export default ResetPasswordModal;
