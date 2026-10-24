import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { User, Role, WorkGroup, Shift } from '../../types';
import { USERS } from '../../constants';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workGroups: WorkGroup[];
  onUserCreated: (newUser: User) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, workGroups, onUserCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [role, setRole] = useState<Role>(Role.REPORTER);
  const [roles, setRoles] = useState<Role[]>([Role.REPORTER]);
  const [shift, setShift] = useState<Shift>(Shift.A);
  const [workGroupName, setWorkGroupName] = useState<string>('');
  const [discipline, setDiscipline] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = () => {
    setName('');
    setEmail('');
    setUsername('');
    setEmployeeNumber('');
    setRole(Role.REPORTER);
    setRoles([Role.REPORTER]);
    setShift(Shift.A);
    setWorkGroupName('');
    setDiscipline('');
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const uid = `user-${Math.random().toString(36).substring(2, 10)}`;
      const newUserProfile: User = {
        id: uid,
        uid: uid,
        name: name.trim(),
        email: email.trim(),
        username: username.trim() || null,
        employeeNumber: employeeNumber.trim() || null,
        role: role,
        roles: roles.length > 0 ? roles : [role],
        shift: shift,
        workGroup: workGroupName || null,
        discipline: discipline || null,
      };

      try {
        const cached = JSON.parse(localStorage.getItem('cache_users') || JSON.stringify(USERS));
        cached.push(newUserProfile);
        localStorage.setItem('cache_users', JSON.stringify(cached));
      } catch (e) {}

      onUserCreated(newUserProfile);
      setSuccess(`Successfully created profile for ${name.trim()}!`);
      
      setTimeout(() => {
        handleReset();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error creating user profile:', err);
      setError('An error occurred while creating the user profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => { handleReset(); onClose(); }} title="Create New User Profile">
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 text-sm rounded">{error}</div>}
        {success && <div className="p-3 bg-green-900/40 border border-green-700 text-green-200 text-sm rounded">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-300">Full Name</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
            placeholder="e.g., John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
            placeholder="john.doe@bdr.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Employee Number (Optional)</label>
          <input 
            type="text" 
            value={employeeNumber} 
            onChange={e => setEmployeeNumber(e.target.value)}
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
            placeholder="e.g., EMP12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Primary Role</label>
          <select 
            value={role} 
            onChange={e => {
              const r = e.target.value as Role;
              setRole(r);
              setRoles([r]);
            }}
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
          >
            {Object.values(Role).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {role === Role.REPORTER && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Work Group / Area</label>
            <select 
              value={workGroupName} 
              onChange={e => setWorkGroupName(e.target.value)}
              className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
            >
              <option value="">Select Work Group...</option>
              {workGroups.map(wg => (
                <option key={wg.id} value={wg.name}>{wg.name}</option>
              ))}
            </select>
          </div>
        )}

        {(role === Role.FOREMAN || role === Role.OPS_FOREMAN) && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Shift</label>
            <select 
              value={shift} 
              onChange={e => setShift(e.target.value as Shift)}
              className="mt-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
            >
              {Object.values(Shift).map(s => (
                <option key={s} value={s}>Shift {s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button 
            type="button" 
            onClick={() => { handleReset(); onClose(); }}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
