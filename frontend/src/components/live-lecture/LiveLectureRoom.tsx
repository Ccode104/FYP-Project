import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { joinLiveLecture, getLiveLectureById } from '../../features/live-lecture/api/liveLectures';
import { RoomHeader } from './RoomHeader';

interface LiveLectureRoomProps {
  lectureId: number;
  userId: number;
  userName: string;
  userRole: string;
  lectureTitle?: string;
  lectureDescription?: string;
  onClose: () => void;
}

interface LectureInfo {
  id: number;
  title: string;
  description?: string;
  status: string;
  scheduled_at?: string;
  started_at?: string;
  meeting_url?: string;
}

const LiveLectureRoom: React.FC<LiveLectureRoomProps> = ({
  lectureId,
  lectureTitle,
  lectureDescription,
  onClose,
}) => {
  // Lecture state
  const [lectureInfo, setLectureInfo] = useState<LectureInfo | null>(null);
  const [isWaitingForLecture, setIsWaitingForLecture] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLectureData();
  }, [lectureId]);

  const fetchLectureData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const lectureData = await getLiveLectureById(lectureId);
      const lecture = lectureData.lecture;
      setLectureInfo(lecture);

      if (lecture.status === 'scheduled') {
        setIsWaitingForLecture(true);
      } else if (lecture.status !== 'live') {
        setError(`Cannot join lecture with status: ${lecture.status}`);
      }
    } catch (err: any) {
      console.error('Failed to fetch lecture data:', err);
      setError(err?.message || 'Failed to load lecture information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeet = useCallback(async () => {
    if (!lectureInfo?.meeting_url) return;
    
    try {
      // Record attendance
      await joinLiveLecture(lectureId);
      // Open Google Meet in new tab
      window.open(lectureInfo.meeting_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to record attendance:', err);
      // Still open the link even if attendance recording fails
      window.open(lectureInfo.meeting_url, '_blank', 'noopener,noreferrer');
    }
  }, [lectureId, lectureInfo]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-blue-400 animate-pulse text-lg font-medium">Loading session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center p-8 bg-red-900/20 rounded-xl border border-red-500/30 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isWaitingForLecture && lectureInfo) {
    return (
      <motion.div
        className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center p-8 bg-blue-900/20 rounded-2xl border border-blue-500/30 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Lecture Scheduled</h2>
          <p className="text-blue-400 font-medium mb-4">{lectureInfo.title}</p>
          
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Starts At</p>
            <p className="text-white">
              {lectureInfo.scheduled_at ? new Date(lectureInfo.scheduled_at).toLocaleString() : 'Not set'}
            </p>
          </div>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            The session has not started yet. Please return at the scheduled time to join the Google Meet session.
          </p>

          <button 
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
          >
            Close Room
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <RoomHeader
        title={lectureTitle || 'Live Lecture'}
        description={lectureDescription}
        connectionStatus="connected"
        participantCount={0}
        isRecording={false}
        duration="00:00"
        onClose={onClose}
      />

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          className="text-center p-10 bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl max-w-xl w-full border border-gray-700"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to Join?</h2>
          <p className="text-gray-300 text-lg mb-10 leading-relaxed">
            This lecture is active on Google Meet. Click below to enter the meeting. 
            Attendance will be recorded upon entry.
          </p>
          
          {lectureInfo?.meeting_url ? (
            <button 
              onClick={handleJoinMeet}
              className="inline-flex items-center justify-center w-full px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/30 group"
            >
              <span>Launch Google Meet</span>
              <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-500 font-medium">
              Meeting link is currently unavailable. Please contact your instructor.
            </div>
          )}

          <button 
            onClick={onClose}
            className="mt-8 text-gray-400 hover:text-white transition-colors font-medium underline underline-offset-4"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LiveLectureRoom;
