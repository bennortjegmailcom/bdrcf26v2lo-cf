import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { User, WorkGroup } from '../../types';
import { 
  getDefaultFaultsForArea, 
  getCachedAreaFaultPresets, 
  saveAreaFaultPresets, 
  subscribeAreaFaultPresets 
} from '../../services/areaFaultService';
import { INITIAL_WORK_GROUPS } from '../../constants';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Save, 
  MapPin, 
  Sparkles, 
  MoveUp, 
  MoveDown,
  Wrench,
  AlertCircle
} from 'lucide-react';

interface ManageAreaFaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  workGroups?: WorkGroup[];
  initialArea?: string;
}

export const ManageAreaFaultsModal: React.FC<ManageAreaFaultsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  workGroups = [],
  initialArea
}) => {
  // Available area list
  const availableAreas = workGroups.length > 0 ? workGroups : INITIAL_WORK_GROUPS;

  const [selectedArea, setSelectedArea] = useState<string>(
    initialArea || currentUser.workGroup || availableAreas[0]?.name || 'GG'
  );

  const [presetsMap, setPresetsMap] = useState<Record<string, string[]>>(() => getCachedAreaFaultPresets());
  const [currentFaults, setCurrentFaults] = useState<string[]>([]);
  const [newFaultText, setNewFaultText] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to real-time preset updates
  useEffect(() => {
    const unsub = subscribeAreaFaultPresets((map) => {
      setPresetsMap(map);
    });
    return () => unsub();
  }, []);

  // Update current faults when selected area changes or presets map updates
  useEffect(() => {
    if (presetsMap[selectedArea]) {
      setCurrentFaults([...presetsMap[selectedArea]]);
    } else {
      setCurrentFaults(getDefaultFaultsForArea(selectedArea));
    }
    setEditingIndex(null);
    setSaveSuccess(false);
    setErrorMessage(null);
  }, [selectedArea, presetsMap]);

  if (!isOpen) return null;

  const handleAddFault = () => {
    const text = newFaultText.trim();
    if (!text) return;
    if (currentFaults.includes(text)) {
      setErrorMessage('This problem description already exists for this area.');
      return;
    }
    setCurrentFaults(prev => [...prev, text]);
    setNewFaultText('');
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(currentFaults[index]);
  };

  const handleSaveEdit = (index: number) => {
    const text = editingText.trim();
    if (!text) return;
    setCurrentFaults(prev => {
      const copy = [...prev];
      copy[index] = text;
      return copy;
    });
    setEditingIndex(null);
    setSaveSuccess(false);
  };

  const handleDeleteFault = (index: number) => {
    setCurrentFaults(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    setSaveSuccess(false);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentFaults.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setCurrentFaults(prev => {
      const copy = [...prev];
      const item = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = item;
      return copy;
    });
    setSaveSuccess(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm(`Reset common faults for ${selectedArea} Area back to standard defaults?`)) {
      const defaults = getDefaultFaultsForArea(selectedArea);
      setCurrentFaults(defaults);
      setSaveSuccess(false);
    }
  };

  const handleSaveAll = async () => {
    if (currentFaults.length === 0) {
      setErrorMessage('Please include at least 1 problem description for quick-tap selection.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await saveAreaFaultPresets(selectedArea, currentFaults, currentUser.name);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving area fault presets:', err);
      setErrorMessage(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Area Problem Descriptions">
      <div className="bg-gray-950 text-white rounded-xl p-4 sm:p-5 space-y-4 max-w-xl mx-auto">
        
        {/* Header & Area Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 p-3.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Select Plant Area
              </label>
              <span className="text-xs text-gray-300">
                Customise 1-tap quick fault chips for operators
              </span>
            </div>
          </div>

          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            className="bg-gray-950 border border-gray-700 text-white text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer min-w-[170px]"
          >
            {availableAreas.map(a => (
              <option key={a.id || a.name} value={a.name}>
                {a.name} Area
              </option>
            ))}
          </select>
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <div className="bg-emerald-950/70 border border-emerald-500/60 p-3 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Problem descriptions for <strong>{selectedArea} Area</strong> updated successfully! All QR field portals will immediately show these chips.</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-950/70 border border-red-500/60 p-3 rounded-lg flex items-center gap-2 text-red-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Add New Problem Description Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            Add Quick-Tap Problem Description
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Belt tracking sensor fault, Chute level trip..."
              value={newFaultText}
              onChange={e => setNewFaultText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFault())}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddFault}
              disabled={!newFaultText.trim()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Current List of Quick Tap Chips for this Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Active Chips for {selectedArea} Area ({currentFaults.length})
            </span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] text-gray-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
              title="Reset to default mining fault presets"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar border border-gray-800 rounded-xl p-2 bg-gray-900/50">
            {currentFaults.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 italic">
                No common fault chips configured for {selectedArea} Area. Add one above!
              </div>
            ) : (
              currentFaults.map((fault, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-2 flex items-center justify-between gap-2 text-xs transition"
                >
                  {editingIndex === index ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(index)}
                        className="flex-1 bg-gray-950 border border-blue-500 rounded px-2.5 py-1 text-xs text-white outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                        title="Save item"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded cursor-pointer"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-gray-200 font-medium truncate">
                          {fault}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === currentFaults.length - 1}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index)}
                          className="p-1 text-blue-400 hover:text-blue-300 cursor-pointer ml-1"
                          title="Edit description"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFault(index)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                          title="Delete chip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/25 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : `Save ${selectedArea} Area Chips`}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default ManageAreaFaultsModal;
