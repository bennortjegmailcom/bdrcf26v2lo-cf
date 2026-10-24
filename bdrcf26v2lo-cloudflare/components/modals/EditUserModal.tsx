
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { User, Role, WorkGroup, Shift } from '../../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (userId: string, updates: Partial<User>) => void;
  workGroups: WorkGroup[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSubmit, workGroups }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(Role.REPORTER);
  const [workGroupName, setWorkGroupName] = useState<string | undefined>(undefined);
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [shift, setShift] = useState<Shift>(Shift.A);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [discipline, setDiscipline] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setRoles(user.roles || [user.role]);
      setWorkGroupName(user.workGroup);
      setEmployeeNumber(user.employeeNumber || '');
      setShift(user.shift || Shift.A);
      setUsername(user.username || '');
      setEmail(user.email || '');
      setDiscipline(user.discipline || '');
      setNewPassword('');
      setNewPin(user.pin || '');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      alert('User data is missing or name is empty.');
      return;
    }

    const updates: Partial<User> = {
      name: name.trim(),
      role,
      roles: roles.length > 0 ? roles : [role],
      workGroup: workGroupName || null,
      discipline: discipline || null,
      employeeNumber: employeeNumber.trim() || null,
      shift,
      username: username.trim() || null,
      email: email.trim() || null,
    };

    if (newPassword.trim()) {
      updates.password = newPassword.trim();
    }
    if (newPin.trim()) {
      updates.pin = newPin.trim();
    }
    
    onSubmit(user.id, updates);
    onClose();
  };
  
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name-edit" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input type="text" id="name-edit" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required />
          </div>
          <div>
              <label htmlFor="emp-num-edit" className="block text-sm font-medium text-gray-300">Employee Number</label>
              <input type="text" id="emp-num-edit" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" placeholder="Optional" />
          </div>
          <div>
            <label htmlFor="username-edit" className="block text-sm font-medium text-gray-300">Username</label>
            <input type="text" id="username-edit" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" />
          </div>
          <div>
            <label htmlFor="email-edit" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input type="email" id="email-edit" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" />
          </div>
          <div>
            <label htmlFor="role-edit" className="block text-sm font-medium text-gray-300">Role</label>
            <select id="role-edit" value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="shift-edit-modal" className="block text-sm font-medium text-gray-300">Assigned Shift</label>
            <select id="shift-edit-modal" value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
              {Object.values(Shift).map(s => <option key={s} value={s}>Shift {s}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-700/30 p-4 rounded-md border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-3">Authorized Roles (Multi-select)</label>
            <div className="grid grid-cols-2 gap-2">
                {Object.values(Role).map(r => (
                    <label key={r} className="flex items-center space-x-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                        <input 
                            type="checkbox" 
                            checked={roles.includes(r)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setRoles([...roles, r]);
                                } else {
                                    // Don't remove the active role if it's the only one
                                    if (roles.length > 1) {
                                        setRoles(roles.filter(roleItem => roleItem !== r));
                                    }
                                }
                            }}
                            className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-800"
                        />
                        <span>{r}</span>
                    </label>
                ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-500 italic">User can switch between these roles in the header.</p>
        </div>

        <div>
          <label htmlFor="workGroup-edit" className="block text-sm font-medium text-gray-300">Work Group / Area</label>
          <select id="workGroup-edit" value={workGroupName || ''} onChange={(e) => setWorkGroupName(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2">
            <option value="">No Work Group</option>
            {workGroups.map((wg, i) => <option key={`${wg.id}-${i}`} value={wg.name}>{wg.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="discipline-edit" className="block text-sm font-medium text-gray-300">Maintenance Discipline / Section</label>
          <select id="discipline-edit" value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm">
            <option value="">Auto-detected from Role (or None)</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Electrical">Electrical</option>
            <option value="Technicians">Technicians</option>
            <option value="Instrumentation">Instrumentation</option>
            <option value="Operations">Operations</option>
            <option value="Services">Services</option>
          </select>
          <p className="mt-1 text-[10px] text-gray-400">Restricts daily handover equipment reports for this foreman to this discipline.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-amber-300">Reset Password (Optional)</label>
            <input 
              type="text" 
              id="reset-password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Enter new password to reset" 
              className="mt-1 w-full bg-gray-700 border border-amber-600/60 text-white rounded-md p-2 text-sm placeholder-gray-400" 
            />
            <p className="mt-1 text-[10px] text-gray-400">Leave blank to keep existing password.</p>
          </div>
          <div>
            <label htmlFor="user-pin-edit" className="block text-sm font-medium text-purple-300">Security PIN (4-6 digits)</label>
            <input 
              type="text" 
              id="user-pin-edit" 
              maxLength={6}
              value={newPin} 
              onChange={(e) => setNewPin(e.target.value)} 
              placeholder="e.g. 1234" 
              className="mt-1 w-full bg-gray-700 border border-purple-500/60 text-white rounded-md p-2 text-sm placeholder-gray-400 font-mono" 
            />
            <p className="mt-1 text-[10px] text-gray-400">Quick PIN for control room and terminal unlocking.</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
