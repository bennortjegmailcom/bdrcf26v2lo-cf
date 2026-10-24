
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Responsibility, Artisan, Assignment } from '../../types';

interface AssignJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { notificationNumber: string, assignments: Assignment[] }) => void;
  artisans: Artisan[];
}

interface LocalAssignment {
    responsibility: Responsibility;
    artisanId: string;
    manualName: string;
    manualEmployeeNumber: string;
    manualSpecialty: string;
    manualContactNumber?: string;
}

const AssignJobModal: React.FC<AssignJobModalProps> = ({ isOpen, onClose, onSubmit, artisans }) => {
  const [notificationNumber, setNotificationNumber] = useState('');
  const [localAssignments, setLocalAssignments] = useState<LocalAssignment[]>([
    { responsibility: Responsibility.FITTER, artisanId: '', manualName: '', manualEmployeeNumber: '', manualSpecialty: '', manualContactNumber: '' }
  ]);

  useEffect(() => {
    if (isOpen) {
      setNotificationNumber('');
      setLocalAssignments([
        { responsibility: Responsibility.FITTER, artisanId: '', manualName: '', manualEmployeeNumber: '', manualSpecialty: '', manualContactNumber: '' }
      ]);
    }
  }, [isOpen]);

  const handleAssignmentChange = (index: number, field: keyof LocalAssignment, value: string) => {
    const next = [...localAssignments];
    next[index] = { ...next[index], [field]: value };
    
    // If trade changes, reset the sub-fields
    if (field === 'responsibility') {
        next[index].artisanId = '';
        next[index].manualName = '';
        next[index].manualEmployeeNumber = '';
        next[index].manualSpecialty = '';
    }
    
    setLocalAssignments(next);
  };

  const addAssignment = () => {
    setLocalAssignments([
      ...localAssignments, 
      { responsibility: Responsibility.FITTER, artisanId: '', manualName: '', manualEmployeeNumber: '', manualSpecialty: '', manualContactNumber: '' }
    ]);
  };

  const removeAssignment = (index: number) => {
    setLocalAssignments(localAssignments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationNumber.trim()) {
      alert('Please fill out the notification number.');
      return;
    }

    const finalAssignments: Assignment[] = [];

    for (let i = 0; i < localAssignments.length; i++) {
        const la = localAssignments[i];
        const filtered = artisans.filter(a => a.responsibility === la.responsibility);
        
        if (filtered.length > 0) {
            if (!la.artisanId) {
                alert(`Please select an artisan for assignment #${i + 1} (${la.responsibility}).`);
                return;
            }
            const artisan = artisans.find(art => art.id === la.artisanId);
            finalAssignments.push({
                artisanId: la.artisanId,
                artisanName: artisan?.name || 'Unknown',
                responsibility: la.responsibility,
                contactNumber: artisan?.contactNumber || la.manualContactNumber
            });
        } else {
            // Manual entry
            if (!la.manualName.trim()) {
                alert(`Please provide a name for the ${la.responsibility} assignment (#${i + 1}).`);
                return;
            }
            finalAssignments.push({
                artisanId: 'manual',
                artisanName: la.manualName,
                responsibility: la.responsibility,
                employeeNumber: la.manualEmployeeNumber,
                specialty: la.manualSpecialty,
                contactNumber: la.manualContactNumber
            });
        }
    }

    onSubmit({ notificationNumber, assignments: finalAssignments });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="notificationNumber" className="block text-sm font-medium text-gray-300">Notification Number</label>
          <input 
            type="text" 
            id="notificationNumber" 
            value={notificationNumber} 
            onChange={(e) => setNotificationNumber(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            placeholder="e.g. N-5501"
            required 
          />
        </div>
        
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          <label className="block text-sm font-medium text-gray-300 border-b border-gray-700 pb-1">Team Assignments</label>
          {localAssignments.map((la, index) => {
            const filteredArtisans = artisans.filter(a => a.responsibility === la.responsibility);
            const isManualEntry = filteredArtisans.length === 0;

            return (
              <div key={index} className="space-y-3 p-3 bg-gray-900/50 rounded-md ring-1 ring-gray-700 relative">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Assignment #{index + 1}</span>
                    {localAssignments.length > 1 && (
                        <button type="button" onClick={() => removeAssignment(index)} className="text-red-500 hover:text-red-400 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* TRADE FIRST */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Trade / Responsibility</label>
                  <select 
                    value={la.responsibility} 
                    onChange={(e) => handleAssignmentChange(index, 'responsibility', e.target.value)} 
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm" 
                    required
                  >
                    {Object.values(Responsibility).map(resp => <option key={resp} value={resp}>{resp}</option>)}
                  </select>
                </div>

                {!isManualEntry ? (
                  <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Select {la.responsibility}</label>
                        <select 
                          value={la.artisanId} 
                          onChange={(e) => handleAssignmentChange(index, 'artisanId', e.target.value)} 
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm" 
                          required
                        >
                          <option value="" disabled>Choose artisan...</option>
                          {[...filteredArtisans].sort((a,b) => a.name.localeCompare(b.name)).map(artisan => <option key={artisan.id} value={artisan.id}>{artisan.name}</option>)}
                        </select>
                    </div>
                    {la.responsibility === Responsibility.OTHER && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Contact No (Optional)</label>
                            <input 
                                type="text" 
                                value={la.manualContactNumber || ''} 
                                onChange={(e) => handleAssignmentChange(index, 'manualContactNumber', e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1.5 text-xs" 
                                placeholder="Contact number"
                            />
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-700 space-y-3">
                    <p className="text-[10px] text-yellow-500 uppercase font-bold">No registered artisans. Manual entry:</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-gray-400 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                value={la.manualName} 
                                onChange={(e) => handleAssignmentChange(index, 'manualName', e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1.5 text-xs" 
                                placeholder="Enter name"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-400 mb-1">Employee #</label>
                            <input 
                                type="text" 
                                value={la.manualEmployeeNumber} 
                                onChange={(e) => handleAssignmentChange(index, 'manualEmployeeNumber', e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1.5 text-xs" 
                                placeholder="Optional"
                            />
                        </div>
                                                <div>
                            <label className="block text-[10px] font-medium text-gray-400 mb-1">Specialty</label>
                            <input 
                                type="text" 
                                value={la.manualSpecialty} 
                                onChange={(e) => handleAssignmentChange(index, 'manualSpecialty', e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1.5 text-xs" 
                                placeholder="e.g. Rigger"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-400 mb-1">Contact No</label>
                            <input 
                                type="text" 
                                value={la.manualContactNumber || ''} 
                                onChange={(e) => handleAssignmentChange(index, 'manualContactNumber', e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1.5 text-xs" 
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addAssignment} className="w-full text-sm bg-gray-800 hover:bg-gray-700 text-blue-400 border border-gray-600 font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          Add Another Artisan
        </button>

        <div className="flex justify-end pt-4 space-x-2 border-t border-gray-700">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Assign Team</button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignJobModal;
