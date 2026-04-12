import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './LiveLectureDashboard.css';

interface LiveLecture {
  id: number;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  google_meet_link?: string;
  course_offering_id: number;
}

interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  role?: 'student' | 'teacher' | 'ta';
  isSystem?: boolean;
}

interface Participant {
  id: number;
  userId: number;
  userName: string;
  role: 'student' | 'teacher' | 'ta';
  joinedAt: string;
  handRaised?: boolean;
}

export default function LiveLectureDashboard() {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState<LiveLecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const id = lectureId || '';
  const isBackend = id && /^\d+$/.test(id);

  const analytics = useMemo(
    () => ({
      engagement: 88,
      pendingQuestions: 12,
      avgStayTime: 18,
      isRecording: true,
    }),
    []
  );

  useEffect(() => {
    if (!isBackend) return;

    async function loadLecture() {
      try {
        const data = await apiFetch<LiveLecture>(`/api/live-lectures/${id}`);
        setLecture(data);
        if (data.status === 'live') {
          setIsLive(true);
        }
        if (data.started_at) {
          const startTime = new Date(data.started_at).getTime();
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }
      } catch (error) {
        console.error('Failed to load lecture:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadLecture();
  }, [id, isBackend]);

  useEffect(() => {
    if (!isLive || !elapsedTime) return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, elapsedTime]);

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      userId: 1,
      userName: 'You',
      message: newMessage,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      role: 'teacher',
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const handleEndSession = async () => {
    if (!lecture) return;
    try {
      await apiFetch(`/api/live-lectures/${lecture.id}/end`, { method: 'POST' });
      setIsLive(false);
      alert('Live session ended. Recording will be available shortly.');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleInvite = () => {
    if (lecture?.google_meet_link) {
      navigator.clipboard.writeText(lecture.google_meet_link);
      alert('Google Meet link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="live-lecture-loading">
        <div className="live-lecture-spinner"></div>
        <p>Loading live lecture...</p>
      </div>
    );
  }

  return (
    <div className="live-lecture-dashboard">
      {/* Header Section */}
      <header className="live-lecture-header">
        <div className="live-lecture-header-left">
          <div className="live-lecture-meta">
            <span className="live-lecture-role-badge">Teacher</span>
            {isLive && (
              <>
                <span className="live-lecture-live-dot"></span>
                <span className="live-lecture-live-text">LIVE SESSION</span>
              </>
            )}
          </div>
          <h1 className="live-lecture-title">{lecture?.title || 'Live Lecture'}</h1>
          <p className="live-lecture-info">
            Session ID:{' '}
            <span className="live-lecture-session-id">
              {lecture?.id ? `LL-${lecture.id}-${Date.now().toString(36).toUpperCase()}` : 'N/A'}
            </span>
            {' • '} {participants.length || 142} Students Connected
          </p>
        </div>
        <div className="live-lecture-header-actions">
          <button className="live-lecture-btn live-lecture-btn-outline" onClick={handleEndSession}>
            End Stream
          </button>
          <button className="live-lecture-btn live-lecture-btn-primary" onClick={handleInvite}>
            <span className="material-symbols-outlined">share</span>
            Invite
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="live-lecture-bento">
        {/* Main Broadcast View */}
        <div className="live-lecture-main">
          {/* Live Preview Container */}
          <div className="live-lecture-video-container">
            {lecture?.google_meet_link ? (
              <iframe
                src={lecture.google_meet_link.replace(
                  'meet.google.com',
                  'meet.google.com/hangouts/_'
                )}
                title="Google Meet"
                className="live-lecture-iframe"
                allow="camera; microphone; fullscreen; display-capture"
              />
            ) : (
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBubJf7H1Th6yFLu135DaHOKzA8cb6s_pXYe3vUxIjDK_03VuEZzc7e_HZfTMu4BOa_8-Q6Z8BO-aC5aj2SdPjXRc6nFh_b7vhIZgYJst12FLqVNiYFEXgmKq0PZT6wnjUjSM6ALql_ILHJwPl7vaNMvKClYlqi4IiXxGyln0w4Ckq8I7tesWsC_4_F1SFyEmr0ObJD2-kRRnF3jA1yyScqPGi49evGloJX-wcw_B0afx-iWwVwZN5NC0lHXJeyJF-6KgKgbKlWJQ8"
                alt="Lecture Canvas"
              />
            )}

            {/* Overlay Controls on Hover */}
            <div className="live-lecture-video-overlay">
              <div className="live-lecture-overlay-controls">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="live-lecture-overlay-btn">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      mic
                    </span>
                  </button>
                  <button className="live-lecture-overlay-btn">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      videocam
                    </span>
                  </button>
                  <button className="live-lecture-overlay-btn">
                    <span className="material-symbols-outlined">present_to_all</span>
                  </button>
                </div>
                <div className="live-lecture-latency-info">
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      bolt
                    </span>
                    14ms Latency
                  </span>
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      high_quality
                    </span>
                    1080p60
                  </span>
                </div>
              </div>
            </div>

            {/* ON AIR Indicator */}
            {isLive && (
              <div className="live-lecture-on-air">
                <span className="live-lecture-on-air-dot"></span>
                ON AIR: {formatElapsedTime(elapsedTime)}
              </div>
            )}
          </div>

          {/* Slide Navigator */}
          <div className="live-lecture-slides">
            {[4, 5, 6].map((slideNum, idx) => (
              <div key={slideNum} className={`live-lecture-slide ${idx === 0 ? 'active' : ''}`}>
                <img
                  src={
                    slideNum === 4
                      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFqsqn5_HFEJvEybpmpi6SoMbIakwVReFjR1Vdron_cH9ETFYBXSr5cA12kqEprf74xpnIqBy25htMOF2uu7GntuUBdLSTeXuqbqQsn34lI6vaiUStK6YZ3hkhTHiYyChATDEF0ZJbpDmDyGpin_nENEk7uEIugGPUyR4ouoVhFCxZFaVR27eCtoayn3pSDBKR8Qp2gJk-Kch2IHkgS3PLSqkoLpPoiiN1gwN_j53fWpcWvPPnrwOM_jUgL-S1M6OtBBhYya2QLiU'
                      : slideNum === 5
                        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBh8-LVojDPbgZvSJgCuyBcK5DZ53pfJVLx7pyGdaoTui7HP8endNgyhIOyEtqZXIVfqO2sNNaaVW-1ZNoqKiGxVyopWRxwrXkddh7GUMlT58CYjWUOguMXdMOTkTgSPNHJQSEvWSp0YX6lKCUS9b7mGJTt0Ta0vgNEcURQoUYNS0oWxiXmcn7CkM7B26B4P72QNutZ_xIfzSaJneXHP8hRrvX3WYG0pTArG3oJDeoH6xlEi7ErG8fBd4DLXwVdEeYAoyR8H4KmxDU'
                        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjxaN7WWijX8LmPZZVINgnrilxmS9aWxtB4SX-rUuvw6sutpTmkY7K7OVYJHS8ExOIY-UEirYSqeSoZ8sznfLnTkPncw-1E_svM9W1FnxagrPjIX30Uj3Qit-8UzUC_gImP92cdEdmHqxA9sOsor7-TgLeLuGLpsMo7yJdGntYS_qIpkzSWVBaOWZA3Q_XGeVuqOab8X9kemznkngUBPUtwqc7p2AXlrVGwW3KbZWUesUXuVRYERS7btENAA5tmNYCpIGCoCBzTlY'
                  }
                  alt={`Slide ${slideNum}`}
                />
                {idx === 0 && <span className="live-lecture-slide-badge">SLIDE {slideNum}</span>}
              </div>
            ))}
            <button className="live-lecture-slide-add">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="live-lecture-sidebar">
          {/* Chat Panel */}
          <div className="live-lecture-chat">
            <div className="live-lecture-chat-header">
              <h3>Live Discussion</h3>
              <span className="material-symbols-outlined">more_vert</span>
            </div>
            <div className="live-lecture-chat-messages">
              {/* Student Message */}
              <div className="live-lecture-message">
                <div className="live-lecture-message-avatar" style={{ background: '#abc7ff' }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeCuCLj-zNgBC79vVOexZ1cvcaba4WgYmnm54BgMvk37VTw9Y-lm9NE72hzCC2Xo4KAybwthWX86gXXkn9IEXXTKZBYZrNIw-opjCGquVqjBFL0nz1VdPas3CluwZ-ijOd106QLkZVhH2k84dSJcgtuDKBMjK_rOFuV-ASt9bcncHwNFhp_gwPUgiIwcMWwjO7Va_dSW9fUBkTnrWNgd0vJ7VdZHBjMYY_em6ESLOZAGjbYspRAK_yVUJcemNxVGDCXd_Sqyy3g8Y"
                    alt="Student"
                  />
                </div>
                <div className="live-lecture-message-content">
                  <div className="live-lecture-message-header">
                    <span className="live-lecture-message-name">Julian M.</span>
                    <span className="live-lecture-message-time">10:41 AM</span>
                  </div>
                  <div className="live-lecture-message-bubble">
                    Professor, could you clarify the Euler equation application in this specific
                    model?
                  </div>
                </div>
              </div>

              {/* TA Message */}
              <div className="live-lecture-message">
                <div className="live-lecture-message-avatar" style={{ background: '#89d3d4' }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrxfjauEicqq9h1udcpzgSFjAwHdJs-p7ZoACS0uE8ZROaccUnLtddOBbnC-KD3i3MyBRgJjAt1tBs7ZH9YX3H2UhMaLMxZgei_i_-cmIHwefN2FpJyWojOZfuwc_a2EIteqe8x2qAhMSFIHNTsXmijX_BwlCCpl1iSN_I3FYMqsezS3_g1itAK-RJAuY-xnB3ogiKyxHgKhS-AX1L7eOjhyPZLJRxJlbR01oIc1EZxpN5CtF6mmYuDFxuEQIGXuybtLj2Ipnh3Zk"
                    alt="TA"
                  />
                  <span className="live-lecture-ta-badge">TA</span>
                </div>
                <div className="live-lecture-message-content">
                  <div className="live-lecture-message-header">
                    <span className="live-lecture-message-name live-lecture-ta-name">
                      Sarah Chen (TA)
                    </span>
                    <span className="live-lecture-message-time">10:42 AM</span>
                  </div>
                  <div className="live-lecture-message-bubble ta">
                    Julian, checking the supplementary notes on Page 12 of the syllabus will help as
                    well.
                  </div>
                </div>
              </div>

              {/* System Alert */}
              <div className="live-lecture-system">
                <span>New Question Poll Started</span>
              </div>

              {/* Another Student Message */}
              <div className="live-lecture-message">
                <div className="live-lecture-message-avatar" style={{ background: '#d0bcff' }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYobeaynXXXo1QRt6y2TI8bOiZsG-lUzdwz_o2aA1c8nFDadc-AwiD1QU0RzrB7dm32TIa4VlBlYVzRWmPRvcJoItJ1SwH8njKB-4ywUWvyYwSpLrlOeQOjkLe-aRo48DkO6ulDP2MOuFdlkoH1M5aytDRQmIC39BZcryX0txmsmy4izj7oR9lVqxyfdQwQ5kj8tPB55MeribmRSGsbg1h-h7cvawSaVgfOtcdojBlTEq7PLakN7PWZHw_80M3lwytaQbLx6smD_4"
                    alt="Student"
                  />
                </div>
                <div className="live-lecture-message-content">
                  <div className="live-lecture-message-header">
                    <span className="live-lecture-message-name">Aaron K.</span>
                    <span className="live-lecture-message-time">10:44 AM</span>
                  </div>
                  <div className="live-lecture-message-bubble">
                    The visualization of the consumption path is really helpful.
                  </div>
                </div>
              </div>
            </div>
            <div className="live-lecture-chat-input">
              <input
                type="text"
                placeholder="Respond to the atelier..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>

          {/* Participants Panel */}
          <div className="live-lecture-participants">
            <div className="live-lecture-participants-header">
              <h3>Active Learners</h3>
              <span className="live-lecture-participants-count">
                {participants.length || 142} Online
              </span>
            </div>
            <div className="live-lecture-participants-list">
              <div className="live-lecture-participant">
                <div className="live-lecture-participant-avatar">JM</div>
                <div className="live-lecture-participant-info">
                  <span className="live-lecture-participant-name">Julian Marcov</span>
                  <span className="live-lecture-participant-status">Raised hand 2m ago</span>
                </div>
                <button className="live-lecture-participant-action">
                  <span className="material-symbols-outlined">call_made</span>
                </button>
              </div>
              <div className="live-lecture-participant">
                <div className="live-lecture-participant-avatar">AK</div>
                <div className="live-lecture-participant-info">
                  <span className="live-lecture-participant-name">Aaron Kessler</span>
                  <span className="live-lecture-participant-status">Active listener</span>
                </div>
              </div>
            </div>
            <button className="live-lecture-participants-view-all">View All Participants</button>
          </div>
        </div>
      </div>

      {/* Analytics Bottom Bar */}
      <div className="live-lecture-analytics">
        <div className="live-lecture-analytics-card">
          <span className="material-symbols-outlined">trending_up</span>
          <span className="live-lecture-analytics-value">{analytics.engagement}%</span>
          <span className="live-lecture-analytics-label">Engagement Score</span>
        </div>
        <div className="live-lecture-analytics-card">
          <span className="material-symbols-outlined">question_answer</span>
          <span className="live-lecture-analytics-value">{analytics.pendingQuestions}</span>
          <span className="live-lecture-analytics-label">Pending Questions</span>
        </div>
        <div className="live-lecture-analytics-card">
          <span className="material-symbols-outlined">timer</span>
          <span className="live-lecture-analytics-value">{analytics.avgStayTime}m</span>
          <span className="live-lecture-analytics-label">Avg. Stay Time</span>
        </div>
        <div className="live-lecture-analytics-card">
          <span className="material-symbols-outlined">emergency_recording</span>
          <span className="live-lecture-analytics-value">REC</span>
          <span className="live-lecture-analytics-label">Cloud Storage Sync</span>
        </div>
      </div>
    </div>
  );
}
