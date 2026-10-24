import React, { useState, useRef, useEffect } from 'react';
import Modal from '../ui/Modal';
import { BreakdownReport, User, Comment } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { compressImage } from '../../utils';
import { Camera, X } from 'lucide-react';


interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BreakdownReport | null;
  currentUser: User;
  onUpdateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, report, currentUser, onUpdateReport }) => {
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
      setCommentImage(null);
      setZoomedImageId(null);
    }
  }, [isOpen, report?.comments]);

  if (!report) return null;

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 600, 0.7);
      setCommentImage(compressed);
    } catch (err) {
      console.error("Failed to compress comment image:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !commentImage) return;

    const comment: Comment = {
      id: uuidv4(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      ...(commentImage ? { commentImage } : {})
    };

    const updatedComments = [...(report.comments || []), comment];
    
    onUpdateReport(report.id, { comments: updatedComments });
    setNewComment('');
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Comments: ${report.equipment} - ${report.equipmentNumber}`}>
      <div className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto space-y-4 p-2 bg-gray-900 rounded-md mb-4 border border-gray-700">
          {(!report.comments || report.comments.length === 0) ? (
            <div className="text-center text-gray-500 my-4 text-sm">No comments yet. Be the first to comment!</div>
          ) : (
            report.comments.map((comment) => {
              const isOwn = comment.authorId === currentUser.id;
              return (
                <div key={comment.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-400 mb-1 px-1">
                    {comment.authorName} • {formatTime(comment.timestamp)}
                  </span>
                  <div 
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      isOwn 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-700 text-gray-100 rounded-tl-none'
                    }`}
                  >
                    <div>{comment.content}</div>
                    {comment.commentImage && (
                      <div className="mt-1.5 rounded-md overflow-hidden border border-white/10 max-h-48 cursor-pointer select-none">
                        <img 
                          src={comment.commentImage} 
                          alt="Comment attachment" 
                          onClick={() => setZoomedImageId(zoomedImageId === comment.id ? null : comment.id)}
                          className={`object-cover transition-all ${
                            zoomedImageId === comment.id ? 'max-h-96 w-auto max-w-full' : 'max-h-32 w-48'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {commentImage && (
          <div className="relative w-16 h-16 bg-gray-950 rounded border border-gray-700 mb-2 flex items-center justify-center p-1 group">
            <img src={commentImage} alt="preview" className="w-full h-full object-cover rounded" />
            <button
              type="button"
              onClick={() => setCommentImage(null)}
              className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 border border-gray-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <label className="bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 p-2.5 rounded-md text-gray-300 hover:text-white cursor-pointer transition flex items-center justify-center shrink-0" title="Attach picture">
            <Camera className="w-4 h-4" />
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleCommentImageUpload} 
              className="hidden" 
            />
          </label>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Type your comment..."
            autoFocus
          />
          <button
            type="submit"
            disabled={!newComment.trim() && !commentImage}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-2.5 px-4 rounded-md transition"
          >
            Send
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default CommentsModal;
