
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Operator, Shift, WorkGroup } from '../../types';

interface EditOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: Operator | null;
  onSubmit: (id: string, updates: Partial<Operator>) => void;
  workGroups: WorkGroup[];
}

const EditOperatorModal: React.FC<EditOperatorModalProps> = ({ isOpen, onClose, operator, onSubmit, workGroups }) => {
  const [name, setName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [workGroup, setWorkGroup] = useState('');
  const [shift, setShift] = useState<Shift>(Shift.A);

  useEffect(() => {
    if (operator) {
      setName(operator.name);
      setEmployeeNumber(operator.employeeNumber || '');
      setWorkGroup(operator.workGroup || '');
      setShift(operator.shift || Shift.A);
    }
  }, [operator]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator || !name.trim()) return;

    onSubmit(operator.id, {
      name: name.trim(),
      employeeNumber: employeeNumber.trim() || null,
      workGroup: workGroup || null,
      shift,
    });
    onClose();
  };

  if (!operator) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Team Member: ${operator.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Team Member Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Employee Number</label>
          <input 
            type="text" 
            value={employeeNumber} 
            onChange={(e) => setEmployeeNumber(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Area / Work Group</label>
          <select 
            value={workGroup} 
            onChange={(e) => setWorkGroup(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
          >
            <option value="">-- No Area --</option>
            {workGroups.map((wg, i) => <option key={`${wg.id}-${i}`} value={wg.name}>{wg.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Assigned Shift</label>
          <select 
            value={shift} 
            onChange={(e) => setShift(e.target.value as Shift)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required
          >
            {Object.values(Shift).map(s => <option key={s} value={s}>Shift {s}</option>)}
          </select>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditOperatorModal;
