import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { BreakdownReport, User, WorkGroup, Operator, Shift, Responsibility } from '../../types';
import { compressImage } from '../../utils';
import CanvasAnnotator from '../ui/CanvasAnnotator';
import { Upload, X, Edit2 } from 'lucide-react';

import { sanitizeInput } from '../../utils';
import { getCachedAreaFaultPresets, saveAreaFaultPresets, getDefaultFaultsForArea } from '../../services/areaFaultService';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => void;
  user: User;
  workGroups?: WorkGroup[];
  operators?: Operator[];
  addOperator?: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
}

const COMMON_EQUIPMENT = ['Pump', 'Pipe', 'Conveyor', 'Reclaimer', 'Radio', 'Blocked Pump', 'Blocked Pipe', 'Cleaning Equipment', 'Choked Chute', 'Spillage Clearance'];

const CreateReportModal: React.FC<CreateReportModalProps> = ({ 
    isOpen, onClose, onSubmit, user, workGroups = [], operators = [], addOperator
}) => {
  const [equipmentType, setEquipmentType] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');
  const [equipmentMemory, setEquipmentMemory] = useState<string[]>([]);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState(user.workGroup || 'Operations');

  const [fgNumber, setFgNumber] = useState('');
  const [reportedFault, setReportedFault] = useState('');
  const [details, setDetails] = useState('');
  const [teamMember, setTeamMember] = useState('');
  const [addToTeamList, setAddToTeamList] = useState(false);
  const [urgency, setUrgency] = useState(5);
  const [responsibility, setResponsibility] = useState<Responsibility | ''>('');
  
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [needsEmployeeNumber, setNeedsEmployeeNumber] = useState(false);

  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);
  const [addedToFaultsSuccess, setAddedToFaultsSuccess] = useState(false);

  const handleAddToAreaFaults = async () => {
    const text = reportedFault.trim();
    if (!text) return;
    try {
      const presetsMap = getCachedAreaFaultPresets();
      const current = presetsMap[selectedWorkGroup] || getDefaultFaultsForArea(selectedWorkGroup);
      if (!current.includes(text)) {
        const updated = [...current, text];
        await saveAreaFaultPresets(selectedWorkGroup, updated, user.name);
      }
      setAddedToFaultsSuccess(true);
      setTimeout(() => setAddedToFaultsSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to add to area faults:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const base64Promises = Array.from(files).map(async (file) => {
      try {
        const compressed = await compressImage(file as File);
        return compressed;
      } catch (err) {
        console.error("Image compression failed:", err);
        return null;
      }
    });

    const results = await Promise.all(base64Promises);
    const validResults = results.filter((res): res is string => res !== null);
    setDefectImages((prev) => [...prev, ...validResults]);
  };

  const removeImage = (index: number) => {
    setDefectImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAnnotation = (annotatedBase64: string) => {
    if (annotatingIndex !== null) {
      setDefectImages((prev) => {
        const updated = [...prev];
        updated[annotatingIndex] = annotatedBase64;
        return updated;
      });
      setAnnotatingIndex(null);
    }
  };


  useEffect(() => {
    if (isOpen) {
      setNeedsEmployeeNumber(!user.employeeNumber);
      setEmployeeNumber('');
      setAddToTeamList(false);
      setResponsibility('');
      setDefectImages([]);
      setAnnotatingIndex(null);

      // Restore form draft if present in localStorage
      const draftStr = localStorage.getItem('draft_breakdown_report');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          setEquipmentType(draft.equipmentType || '');
          setCustomEquipment(draft.customEquipment || '');
          setFgNumber(draft.fgNumber || '');
          setReportedFault(draft.reportedFault || '');
          setDetails(draft.details || '');
          setTeamMember(draft.teamMember || '');
          setUrgency(draft.urgency ?? 5);
          setResponsibility(draft.responsibility || '');
        } catch (e) {
          console.error("Error loading breakdown report draft", e);
        }
      } else {
        // Safe clean fallback defaults
        setEquipmentType('');
        setCustomEquipment('');
        setFgNumber('');
        setReportedFault('');
        setDetails('');
        setTeamMember('');
        setUrgency(5);
        setSelectedWorkGroup(user.workGroup || 'Operations');
      }

      const savedEq = localStorage.getItem('customEquipmentList');
      let eqList = COMMON_EQUIPMENT;
      if (savedEq) {
        try {
          eqList = JSON.parse(savedEq);
        } catch(e) {}
      }
      
      if (!eqList.includes('Radio')) {
        eqList.push('Radio');
        localStorage.setItem('customEquipmentList', JSON.stringify(eqList));
      }
      setEquipmentMemory(eqList);
    }
  }, [isOpen]);

  // Auto-save form draft as the user types
  useEffect(() => {
    if (isOpen) {
      const draft = {
        equipmentType,
        customEquipment,
        fgNumber,
        reportedFault,
        details,
        teamMember,
        urgency,
        responsibility
      };
      const isNotEmpty = equipmentType || fgNumber || reportedFault || details || teamMember;
      if (isNotEmpty) {
        localStorage.setItem('draft_breakdown_report', JSON.stringify(draft));
      } else {
        localStorage.removeItem('draft_breakdown_report');
      }
    }
  }, [isOpen, equipmentType, customEquipment, fgNumber, reportedFault, details, teamMember, urgency, responsibility]);

  useEffect(() => {
    if (equipmentType === 'Radio') {
      setFgNumber('ECG-P00-594-SUP-RDO-005-RDO-001');
    }
  }, [equipmentType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalEq = equipmentType === 'Other' ? customEquipment : equipmentType;
    if (!finalEq) finalEq = 'Unknown Equipment';
    
    finalEq = sanitizeInput(finalEq, 100);
    const sanitizedFg = sanitizeInput(fgNumber, 50);
    const sanitizedFault = sanitizeInput(reportedFault, 200);
    const sanitizedDetails = sanitizeInput(details, 500);
    const sanitizedTeamMember = sanitizeInput(teamMember, 100);
    const sanitizedEmpNumber = sanitizeInput(employeeNumber, 20);

    // Save custom equipment to memory
    if (finalEq && !equipmentMemory.includes(finalEq)) {
      const newList = [...equipmentMemory, finalEq];
      setEquipmentMemory(newList);
      localStorage.setItem('customEquipmentList', JSON.stringify(newList));
    }

    if (needsEmployeeNumber && !sanitizedEmpNumber) {
      alert('Please enter your Employee Number');
      return;
    }

    if (addToTeamList && sanitizedTeamMember && addOperator) {
      addOperator(
        sanitizedTeamMember,
        user.shift || Shift.A,
        user.workGroup || undefined
      );
    }

    onSubmit({
      equipment: finalEq,
      equipmentNumber: sanitizedFg,
      reportedFault: sanitizedFault,
      details: sanitizedDetails,
      urgency,
      workGroup: selectedWorkGroup || user.workGroup || 'Operations',
      handoverSection: selectedWorkGroup === 'Operations' ? 'Operations' : undefined,
      responsibility: responsibility || undefined,
      operatorName: sanitizedTeamMember || null,
      defectImages
    }, sanitizedEmpNumber);

    // Clear saved draft on successful form submission
    localStorage.removeItem('draft_breakdown_report');
    onClose();
  };

  if (!isOpen) return null;

  if (annotatingIndex !== null) {
    return (
      <Modal isOpen={isOpen} onClose={() => setAnnotatingIndex(null)} title="Annotate Defect Image">
        <CanvasAnnotator
          imageUrl={defectImages[annotatingIndex]}
          onSave={handleSaveAnnotation}
          onCancel={() => setAnnotatingIndex(null)}
        />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Breakdown">
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-gray-950 text-white rounded-lg p-4 gap-4">
        
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Section / Area (Operations, GG, IPC, etc.)</label>
          <select 
            value={selectedWorkGroup} 
            onChange={e => setSelectedWorkGroup(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500 text-white"
          >
            <option value="Operations">Operations (Blocked pumps, pipes, cleaning, etc.)</option>
            {workGroups.map(wg => (
              <option key={wg.id || wg.name} value={wg.name}>{wg.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Equipment Type</label>
          <select 
            value={equipmentType} 
            onChange={e => setEquipmentType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
            required
          >
            <option value="" disabled>Select Equipment</option>
            {equipmentMemory.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
            <option value="Other">Other (Add new...)</option>
          </select>
        </div>

        {equipmentType === 'Other' && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">New Equipment Type</label>
            <input 
              type="text" 
              value={customEquipment} 
              onChange={e => setCustomEquipment(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
              placeholder="E.g. Crusher"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">FG Number</label>
          <input 
            type="text" 
            value={fgNumber} 
            onChange={e => setFgNumber(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-gray-400">Reported Fault</label>
            <button
              type="button"
              onClick={handleAddToAreaFaults}
              disabled={!reportedFault.trim()}
              className="text-[10px] bg-teal-600/80 hover:bg-teal-600 disabled:opacity-40 text-white font-bold px-2 py-0.5 rounded transition flex items-center gap-1 shadow-sm"
              title="Save this fault description to quick-tap area fault presets for this section"
            >
              {addedToFaultsSuccess ? '✓ Added to Area Faults!' : '+ Add to Area Faults'}
            </button>
          </div>
          <textarea 
            value={reportedFault} 
            onChange={e => setReportedFault(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Details (Location/Other)</label>
          <textarea 
            value={details} 
            onChange={e => setDetails(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Defect Images</label>
          <p className="text-xs text-amber-400 mb-2">Attachments are unavailable for this release. Add the defect details in text.</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col items-center justify-center border border-dashed border-gray-700 hover:border-blue-500/50 rounded-lg p-4 cursor-pointer transition bg-gray-900/40 group">
              <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition mb-1" />
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition">Select or Drag Defect Images</span>
              <span className="text-[10px] text-gray-500 mt-0.5">JPEG/PNG, compressed automatically</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled
                className="hidden" 
              />
            </label>

            {defectImages.length > 0 && (
              <div className="flex flex-wrap gap-2.5 p-2 bg-gray-900 rounded border border-gray-800">
                {defectImages.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 group/thumb bg-gray-950 rounded overflow-hidden border border-gray-800 flex items-center justify-center">
                    <img src={img} alt={`defect-${idx}`} className="object-cover w-full h-full animate-fadeIn" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAnnotatingIndex(idx)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition"
                        title="Annotate / Markup Image"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white transition"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Team Member</label>
            <input 
              type="text" 
              list="operators-list"
              value={teamMember} 
              onChange={e => setTeamMember(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500"
            />
            <datalist id="operators-list">
              {operators.map(op => (
                <option key={op.id} value={op.name} />
              ))}
            </datalist>
            {teamMember.trim() && !operators.some(op => op.name.toLowerCase() === teamMember.trim().toLowerCase()) && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="add-to-team"
                  checked={addToTeamList}
                  onChange={e => setAddToTeamList(e.target.checked)}
                  className="rounded bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <label htmlFor="add-to-team" className="text-[10px] text-blue-400 font-semibold cursor-pointer select-none hover:text-blue-300">
                  Add to team list
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Urgency ({urgency})</label>
            <input 
              type="range" 
              min="1" max="10"
              value={urgency} 
              onChange={e => setUrgency(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-3 outline-none accent-blue-500"
              required
            />
          </div>
        </div>

        {needsEmployeeNumber && (
          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1">Employee Number (Required)</label>
            <input 
              type="text" 
              value={employeeNumber} 
              onChange={e => setEmployeeNumber(e.target.value)}
              className="w-full bg-gray-900 border border-amber-500/50 text-sm rounded p-2 focus:border-amber-500"
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="create-responsibility" className="block text-xs font-bold text-gray-400 mb-1">Responsibility (Optional)</label>
          <select
            id="create-responsibility"
            value={responsibility}
            onChange={e => setResponsibility(e.target.value as Responsibility | '')}
            className="w-full bg-gray-900 border border-gray-700 text-sm rounded p-2 focus:border-blue-500 text-white"
          >
            <option value="">-- Not specified --</option>
            {Object.values(Responsibility).map(resp => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm"
          >
            Submit Breakdown
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateReportModal;
