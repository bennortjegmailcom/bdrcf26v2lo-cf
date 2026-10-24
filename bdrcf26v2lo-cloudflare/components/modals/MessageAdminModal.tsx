import React, { useState, useEffect, useMemo } from 'react';
import { User, UserMessage, Role, WorkGroup, Shift } from '../../types';

interface MessageAdminModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (
    category: string,
    content: string,
    wantsReply: boolean,
    recipientType?: 'admin' | 'scheduler' | 'all' | 'role' | 'shift' | 'area' | 'individuals',
    targetRole?: string,
    targetShift?: string,
    targetArea?: string,
    targetUserIds?: string[]
  ) => Promise<void>;
  userMessages?: UserMessage[];
  allMessages?: UserMessage[];
  users?: User[];
  workGroups?: WorkGroup[];
  updateAdminMessage?: (id: string, updates: Partial<UserMessage>) => Promise<void>;
}

const MessageAdminModal: React.FC<MessageAdminModalProps> = ({ 
  user, 
  onClose, 
  onSubmit, 
  userMessages = [], 
  allMessages = [], 
  users = [], 
  workGroups = [], 
  updateAdminMessage 
}) => {
  const isAdmin = user.role === Role.ADMIN;
  const isSchedulerOrSupervisor = [Role.SCHEDULER, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR].includes(user.role);
  const isAuthority = isAdmin || isSchedulerOrSupervisor;

  // Decide initial active tab
  const [tab, setTab] = useState<'new' | 'inbox' | 'incoming'>('new');
  
  useEffect(() => {
    if (isAuthority) {
      setTab('incoming');
    } else if (userMessages.some(m => m.adminReply && !m.isReplyReadByUser)) {
      setTab('inbox');
    } else {
      setTab('new');
    }
  }, [isAuthority, userMessages]);

  const [category, setCategory] = useState('Add something');
  const [content, setContent] = useState('');
  const [wantsReply, setWantsReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Advanced recipient options
  const [recipientType, setRecipientType] = useState<'admin' | 'scheduler' | 'all' | 'role' | 'shift' | 'area' | 'individuals'>('admin');
  const [targetRole, setTargetRole] = useState<string>('');
  const [targetShift, setTargetShift] = useState<string>('');
  const [targetArea, setTargetArea] = useState<string>('');
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);

  // Search filter for targeting individuals
  const [userSearchText, setUserSearchText] = useState('');

  // Reply state for inbox items
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const categories = [
    'Add something',
    'Report fault',
    'Question',
    'Suggestion',
    'Safety alert',
    'Operations alert',
    'General Update',
    'Other'
  ];

  // List of roles users can target
  const rolesList = Object.values(Role).filter(r => r !== Role.GUEST);

  // List of shifts
  const shiftsList = Object.values(Shift);

  // Filtered users lists for manual picker search
  const searchedUsersList = useMemo(() => {
    if (!userSearchText.trim()) return users;
    const lower = userSearchText.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(lower) || 
      u.role.toLowerCase().includes(lower) || 
      (u.workGroup && u.workGroup.toLowerCase().includes(lower))
    );
  }, [users, userSearchText]);

  // Determine what incoming items should be listed for authority
  const incomingMessages = useMemo(() => {
    if (!isAuthority) return [];
    
    // Admin receives messages aimed at 'admin'
    if (isAdmin) {
      return allMessages.filter(m => m.recipientType === 'admin');
    }
    // Schedulers/Supervisors receive messages aimed at 'scheduler'
    if (isSchedulerOrSupervisor) {
      return allMessages.filter(m => m.recipientType === 'scheduler');
    }
    return [];
  }, [allMessages, isAuthority, isAdmin, isSchedulerOrSupervisor]);

  const handleToggleUserTarget = (userId: string) => {
    if (targetUserIds.includes(userId)) {
      setTargetUserIds(prev => prev.filter(id => id !== userId));
    } else {
      setTargetUserIds(prev => [...prev, userId]);
    }
  };

  const handleClearSelectedTargets = () => {
    setTargetUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      if (isAuthority) {
        // Send a targeted announcement broadcast
        await onSubmit(
          category,
          content,
          false, // Announcement broadcasts don't require reply validation
          recipientType,
          recipientType === 'role' ? targetRole : undefined,
          recipientType === 'shift' ? targetShift : undefined,
          recipientType === 'area' ? targetArea : undefined,
          recipientType === 'individuals' ? targetUserIds : undefined
        );
        alert('Broadcast announcement posted successfully!');
        setCategory('General Update');
        setContent('');
        setRecipientType('all');
        setTargetUserIds([]);
        setTab('incoming');
      } else {
        // User requesting help or sending query
        await onSubmit(category, content, wantsReply, recipientType);
        alert('Message sent successfully!');
        setCategory('Add something');
        setContent('');
        setWantsReply(false);
        setTab('inbox');
      }
    } catch (error) {
      alert('Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (msgId: string) => {
    if (!replyContent.trim() || !updateAdminMessage) return;
    try {
      await updateAdminMessage(msgId, {
        adminReply: replyContent,
        isReplyReadByUser: false,
        isReadByAdmin: true // Mark original message read
      });
      alert('Reply submitted successfully!');
      setReplyingToId(null);
      setReplyContent('');
    } catch (error) {
      alert('Failed to submit reply.');
    }
  };

  const markReplyRead = (msg: UserMessage) => {
    if (msg.adminReply && !msg.isReplyReadByUser && updateAdminMessage) {
      updateAdminMessage(msg.id, { isReplyReadByUser: true });
    }
  };

  const toggleAdminReadState = async (msgId: string, isRead: boolean) => {
    if (updateAdminMessage) {
      await updateAdminMessage(msgId, { isReadByAdmin: isRead });
    }
  };

  return (
    <div id="msg-admin-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h2 className="text-lg font-bold flex items-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Communication Center
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-gray-700 bg-gray-900/30">
          {isAuthority && (
            <button 
              className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest text-center ${tab === 'incoming' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setTab('incoming')}
            >
              Inbox ({incomingMessages.filter(m => !m.isReadByAdmin).length} Unread)
            </button>
          )}

          <button 
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest text-center ${tab === 'new' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => {
              setTab('new');
              // Pre-adjust send targets for Admin
              if (isAuthority) {
                setRecipientType('all');
                setCategory('General Update');
              } else {
                setRecipientType('admin');
                setCategory('Add something');
              }
            }}
          >
            {isAuthority ? 'Compose Broadcast' : 'New Message'}
          </button>

          <button 
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest text-center flex items-center justify-center ${tab === 'inbox' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setTab('inbox')}
          >
            {isAuthority ? 'My Sent Messages' : 'My Messages'}
            {userMessages.some(m => m.adminReply && !m.isReplyReadByUser) && (
              <span className="ml-2 bg-red-500 text-white text-[9px] px-1.5 rounded-full font-bold">
                {userMessages.filter(m => m.adminReply && !m.isReplyReadByUser).length}
              </span>
            )}
          </button>
        </div>

        {/* Body Container */}
        <div className="overflow-y-auto p-5 flex-1 min-h-[350px] custom-scrollbar bg-gray-850">
          
          {/* Tab 1: Incoming Messages Inbox (Admins and Schedulers / Supervisors Only) */}
          {tab === 'incoming' && (
            <div className="space-y-4">
              {incomingMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm italic">
                  No incoming messages received.
                </div>
              ) : (
                incomingMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`p-4 rounded-xl border transition-all ${msg.isReadByAdmin ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-800 border-blue-500/45 shadow-lg shadow-blue-500/5'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[10px] uppercase bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                            {msg.category}
                          </span>
                          <span className="text-gray-500 text-[10px]">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          From: <span className="text-gray-200 font-bold italic">{msg.senderName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleAdminReadState(msg.id, !msg.isReadByAdmin)}
                          className={`text-[9px] font-extrabold px-2 py-1 rounded tracking-wider uppercase transition-colors ${msg.isReadByAdmin ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                        >
                          {msg.isReadByAdmin ? 'Mark Unread' : 'Mark Read'}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-100 bg-gray-900/40 border border-gray-800 p-3 rounded-lg mt-2 whitespace-pre-wrap leading-relaxed">
                      "{msg.content}"
                    </p>

                    {/* Admin Reply Thread Container */}
                    {msg.adminReply && replyingToId !== msg.id && (
                      <div className="mt-3 p-3 bg-gray-900/95 rounded-lg border border-gray-700 text-xs">
                        <span className="text-[10px] font-extrabold text-blue-400 block mb-1 uppercase tracking-widest">
                          Your Reply
                        </span>
                        <p className="text-gray-300 whitespace-pre-wrap">{msg.adminReply}</p>
                        <div className="mt-2 text-[9px] text-gray-500 flex gap-2">
                          <span>Status: Sent</span>
                          <span>•</span>
                          <span>{msg.isReplyReadByUser ? 'Read by user' : 'Unread by user'}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          setReplyingToId(replyingToId === msg.id ? null : msg.id);
                          setReplyContent(msg.adminReply || '');
                        }}
                        className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 bg-blue-950/20 px-2.5 py-1 rounded uppercase tracking-wider transition-all"
                      >
                        {msg.adminReply ? 'Edit Reply' : 'Send Reply'}
                      </button>
                    </div>

                    {replyingToId === msg.id && (
                      <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-blue-500/30">
                        <label className="block text-[10px] font-extrabold text-blue-400 uppercase tracking-widest mb-1.5">
                          Write reply to {msg.senderName}
                        </label>
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your reply text here..."
                          rows={3}
                          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none mb-2"
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => setReplyingToId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSendReply(msg.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-colors"
                          >
                            Submit Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: New Message / Compose Broadcast Tab */}
          {tab === 'new' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* If Authority: broadcast selector, else standard recipient selector */}
              {isAuthority ? (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Target Broadcast Audience
                  </label>
                  <select 
                    value={recipientType} 
                    onChange={(e) => {
                      setRecipientType(e.target.value as any);
                      setTargetUserIds([]);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Broadcast to All Users</option>
                    <option value="role">Target by Role</option>
                    <option value="shift">Target by Shift</option>
                    <option value="area">Target by Workgroup (Area)</option>
                    <option value="individuals">Target Specific Individuals</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Send Inquiry To:
                  </label>
                  <select 
                    value={recipientType} 
                    onChange={(e) => setRecipientType(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="admin">Administrator Group</option>
                    <option value="scheduler">Scheduler & Supervisor Group</option>
                  </select>
                </div>
              )}

              {/* Dependent options based on selection */}
              {isAuthority && recipientType === 'role' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Select Target Role
                  </label>
                  <select 
                    value={targetRole} 
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">-- Choose Role --</option>
                    {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {isAuthority && recipientType === 'shift' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Select Target Shift
                  </label>
                  <select 
                    value={targetShift} 
                    onChange={(e) => setTargetShift(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">-- Choose Shift --</option>
                    {shiftsList.map(sh => <option key={sh} value={sh}>Shift {sh}</option>)}
                  </select>
                </div>
              )}

              {isAuthority && recipientType === 'area' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Select Target Workgroup (Area)
                  </label>
                  <select 
                    value={targetArea} 
                    onChange={(e) => setTargetArea(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">-- Choose Work Group --</option>
                    {workGroups.map(wg => <option key={wg.id} value={wg.name}>{wg.name}</option>)}
                  </select>
                </div>
              )}

              {/* Advanced Search & Multi-Individual Select Checklist */}
              {isAuthority && recipientType === 'individuals' && (
                <div className="space-y-3 bg-gray-900/40 p-4 rounded-xl border border-gray-700/60">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span>Target Individuals Search</span>
                    {targetUserIds.length > 0 && (
                      <button 
                        type="button" 
                        onClick={handleClearSelectedTargets}
                        className="text-red-400 hover:text-red-300 font-extrabold uppercase text-[10px]"
                      >
                        Clear Selection ({targetUserIds.length})
                      </button>
                    )}
                  </div>
                  
                  {/* Search filter input */}
                  <div id="search-container" className="relative">
                    <input 
                      type="text" 
                      placeholder="Type name, role or workgroup to filter..."
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Selected badges list */}
                  {targetUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-gray-950/40 rounded border border-gray-800">
                      {targetUserIds.map(uid => {
                        const targetUserObj = users.find(u => u.id === uid);
                        return (
                          <div key={uid} className="flex items-center gap-1 bg-blue-900/60 text-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-500/20">
                            {targetUserObj?.name || uid}
                            <button 
                              type="button" 
                              onClick={() => handleToggleUserTarget(uid)}
                              className="text-red-400 font-extrabold hover:text-red-300 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Searchable checklist scroll area */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-800/60 custom-scrollbar pr-1 bg-gray-950/70 p-2 rounded-lg border border-gray-800">
                    {searchedUsersList.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-xs italic">No matching users found.</div>
                    ) : (
                      searchedUsersList.map(u => (
                        <label 
                          key={u.id} 
                          className="flex items-center justify-between py-2 px-1 hover:bg-gray-800/40 cursor-pointer select-none text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={targetUserIds.includes(u.id)}
                              onChange={() => handleToggleUserTarget(u.id)}
                              className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className="text-gray-100 font-semibold">{u.name}</span>
                              <span className="text-[10px] text-gray-500 ml-2">({u.role})</span>
                            </div>
                          </div>
                          {u.workGroup && (
                            <span className="text-[9px] bg-gray-800/70 text-gray-400 px-1.5 py-0.5 rounded">
                              {u.workGroup}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-gray-400">
                  {isAuthority ? 'Announcement / Broadcast Message Body' : 'Message'}
                </label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your request or enter the text to broadcast..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  required
                />
              </div>

              {/* Only show 'Requires reply' for standard user compose */}
              {!isAuthority && (
                <div className="flex items-center space-x-2 py-1">
                  <input 
                    type="checkbox" 
                    id="wantsReply" 
                    checked={wantsReply} 
                    onChange={(e) => setWantsReply(e.target.checked)} 
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <label htmlFor="wantsReply" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                    Require written response from administrators
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 font-bold py-3 rounded-lg transition-colors text-sm text-white transition duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 font-bold py-3 rounded-lg transition-colors text-sm text-white transition duration-200"
                >
                  {submitting ? 'Sending...' : (isAuthority ? 'Post Broadcast' : 'Send Message')}
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: My Sent Messages Tab */}
          {tab === 'inbox' && (
            <div className="space-y-4">
              {userMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No recent messages found.</div>
              ) : (
                userMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`bg-gray-900/50 border rounded-xl p-4 text-sm transiton-all ${msg.adminReply && !msg.isReplyReadByUser ? 'border-red-500/50 relative bg-red-950/5' : 'border-gray-700'}`}
                    onMouseEnter={() => markReplyRead(msg)}
                  >
                    {msg.adminReply && !msg.isReplyReadByUser && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-[10px] text-gray-300 uppercase bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                          {msg.category}
                        </span>
                        {msg.recipientType && (
                          <span className="text-[9px] text-gray-400 font-medium">To: {msg.recipientType} group</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">"{msg.content}"</p>
                    
                    {msg.adminReply && (
                      <div className="mt-3 pt-3 border-t border-gray-700 bg-gray-800/40 p-3 rounded-lg">
                        <span className="text-xs font-extrabold text-blue-400 block mb-1 uppercase tracking-widest">
                          Reply received:
                        </span>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.adminReply}</p>
                      </div>
                    )}
                    {!msg.adminReply && msg.wantsReply && (
                      <div className="mt-3 pt-2 text-xs text-yellow-500 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                        Status: Awaiting administrative reply...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MessageAdminModal;
