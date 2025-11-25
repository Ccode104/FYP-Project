import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
}

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
  activePoll: Poll | null;
  onVote: (pollId: string, optionId: string) => void;
  userRole: string;
}

export const PollModal: React.FC<PollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
  activePoll,
  onVote,
  userRole,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [showResults, setShowResults] = useState(false);

  const handleCreatePoll = () => {
    if (question.trim() && options.filter(opt => opt.trim()).length >= 2) {
      onCreatePoll(question, options.filter(opt => opt.trim()));
      setQuestion('');
      setOptions(['', '']);
    }
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4">
              <h2 className="text-lg font-semibold">
                {activePoll ? 'Live Poll' : 'Create Poll'}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {activePoll ? (
                /* Active Poll View */
                <div>
                  <h3 className="text-xl font-semibold mb-4">{activePoll.question}</h3>

                  <div className="space-y-3 mb-4">
                    {activePoll.options.map((option) => {
                      const percentage = activePoll.totalVotes > 0
                        ? (option.votes / activePoll.totalVotes) * 100
                        : 0;

                      return (
                        <div key={option.id} className="relative">
                          <button
                            onClick={() => onVote(activePoll.id, option.id)}
                            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={userRole !== 'student'}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">{option.text}</span>
                              <span className="text-sm text-gray-500">
                                {option.votes} ({percentage.toFixed(0)}%)
                              </span>
                            </div>

                            {showResults && (
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <motion.div
                                  className="bg-blue-600 h-2 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {userRole === 'teacher' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResults(!showResults)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {showResults ? 'Hide Results' : 'Show Results'}
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Close Poll
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Create Poll View */
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question
                    </label>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your question..."
                      maxLength={200}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Option ${index + 1}`}
                            maxLength={100}
                          />
                          {options.length > 2 && (
                            <button
                              onClick={() => removeOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {options.length < 5 && (
                      <button
                        onClick={addOption}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        + Add option
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreatePoll}
                      disabled={!question.trim() || options.filter(opt => opt.trim()).length < 2}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Create Poll
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};