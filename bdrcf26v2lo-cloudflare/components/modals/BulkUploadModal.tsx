
import React, { useState } from 'react';
import { Shift, Responsibility, Role } from '../../types';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (type: 'users' | 'artisans' | 'operators', data: any[]) => Promise<void>;
    defaultTarget?: 'users' | 'artisans' | 'operators';
    fixedTarget?: 'users' | 'artisans' | 'operators';
}

type UploadTarget = 'users' | 'artisans' | 'operators';

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onUpload, defaultTarget = 'artisans', fixedTarget }) => {
    const [target, setTarget] = useState<UploadTarget>(fixedTarget || defaultTarget);
    const [pastedText, setPastedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);

    if (!isOpen) return null;

    const parseText = (text: string) => {
        const rows = text.split('\n').filter(row => row.trim());
        const data = rows.map(row => {
            const cols = row.split('\t').map(c => c.trim());
            // Columns: Name, Employee Number, Trade, Shift
            return {
                name: cols[0] || '',
                employeeNumber: cols[1] || '',
                trade: cols[2] || 'Other',
                shift: cols[3] || 'A'
            };
        });
        setPreviewData(data);
    };

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPastedText(text);
        parseText(text);
    };

    const isValidResponsibility = (val: string): Responsibility => {
        const valUpper = val.toUpperCase();
        for (const enumKey in Responsibility) {
            if (enumKey === valUpper) return Responsibility[enumKey as keyof typeof Responsibility];
        }
        return Responsibility.OTHER;
    };

    const handleSubmit = async () => {
        if (previewData.length === 0) return;

        setIsProcessing(true);
        try {
            // Transform data based on target
            let finalData: any[] = [];
            if (target === 'artisans') {
                finalData = previewData.map(d => ({
                    name: d.name,
                    employeeNumber: d.employeeNumber,
                    shift: (d.shift as Shift) || Shift.A,
                    responsibility: isValidResponsibility(d.trade)
                }));
            } else if (target === 'operators') {
                finalData = previewData.map(d => ({
                    name: d.name,
                    employeeNumber: d.employeeNumber,
                    shift: (d.shift as Shift) || Shift.A
                }));
            } else if (target === 'users') {
                finalData = previewData.map(d => ({
                    name: d.name,
                    employeeNumber: d.employeeNumber,
                    shift: (d.shift as Shift) || Shift.A,
                    role: Role.REPORTER // Default role
                }));
            }

            await onUpload(target, finalData);
            alert(`Successfully uploaded ${finalData.length} ${target}.`);
            onClose();
            setPastedText('');
            setPreviewData([]);
        } catch (err) {
            console.error(err);
            alert('Failed to upload data.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Bulk Upload</h2>
                        <p className="text-xs text-gray-400 mt-1">Paste columns from Excel (Name, Employee Number, Shift)</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {!fixedTarget && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Upload To</label>
                                    <div className="flex gap-2 p-1 bg-gray-900 rounded-lg">
                                        {(['users', 'artisans', 'operators'] as UploadTarget[]).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTarget(t)}
                                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all ${
                                                    target === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                                }`}
                                            >
                                                {t.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Paste Data Here</label>
                                <textarea
                                    value={pastedText}
                                    onChange={handlePaste}
                                    placeholder="Name	EmployeeNum	Trade	Shift
John Doe	12345	Fitter	A
Jane Smith	67890	Electrician	B"
                                    className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-100 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none scrollbar-thin scrollbar-thumb-gray-700"
                                />
                                <p className="mt-2 text-[10px] text-gray-500 italic">Tip: Copy directly from Excel. Tab-separated values work best.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Preview ({previewData.length} detected)</label>
                            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden h-[340px]">
                                <table className="min-w-full text-[11px] text-left text-gray-400">
                                    <thead className="bg-gray-800 text-gray-500 uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Name</th>
                                            <th className="px-3 py-2">Num</th>
                                            <th className="px-3 py-2">Trade</th>
                                            <th className="px-3 py-2">Shift</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {previewData.slice(0, 10).map((d, i) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'}>
                                                <td className="px-3 py-2 text-white font-medium">{d.name || <span className="text-red-500 italic">Empty</span>}</td>
                                                <td className="px-3 py-2">{d.employeeNumber || '-'}</td>
                                                <td className="px-3 py-2">{d.trade || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                                        d.shift === 'A' ? 'bg-blue-900/50 text-blue-400' : 
                                                        d.shift === 'B' ? 'bg-green-900/50 text-green-400' : 
                                                        'bg-purple-900/50 text-purple-400'
                                                    }`}>
                                                        {d.shift || 'A'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {previewData.length > 10 && (
                                            <tr className="bg-gray-800/30">
                                                <td colSpan={3} className="px-3 py-2 text-center text-gray-600 italic">
                                                    ... and {previewData.length - 10} more rows
                                                </td>
                                            </tr>
                                        )}
                                        {previewData.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-20 text-center text-gray-600 italic">
                                                    No data to preview
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || previewData.length === 0}
                        className={`px-8 py-2 text-sm font-bold rounded-lg transition-all shadow-lg ${
                            isProcessing || previewData.length === 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                        }`}
                    >
                        {isProcessing ? 'Processing...' : `Upload ${previewData.length} Records`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUploadModal;
