import React, { useState, useEffect } from 'react';
import { database, ref, set, get, onValue } from '../lib/firebase';

// Lucide icons as inline SVG components
const Plane = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
  </svg>
);

const Monitor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2"/>
    <line x1="8" x2="16" y1="21" y2="21"/>
    <line x1="12" x2="12" y1="17" y2="21"/>
  </svg>
);

const Smartphone = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
    <path d="M12 18h.01"/>
  </svg>
);

const LogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

export default function FlightTrackerSync() {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [inputSessionId, setInputSessionId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [step, setStep] = useState('choose');
  const [lastOpenedFlight, setLastOpenedFlight] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('flightTrackerSession');
      if (stored) {
        const session = JSON.parse(stored);
        setSessionId(session.id);
        setMode(session.mode);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, []);

  useEffect(() => {
    if (mode === 'receiver' && sessionId && isLoggedIn) {
      const flightRef = ref(database, `flights/${sessionId}`);
      
      const unsubscribe = onValue(flightRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setActiveSession(data);
          
          // Auto-open new window when a new flight is detected
          if (data.flightNumber && data.flightNumber !== lastOpenedFlight) {
            setLastOpenedFlight(data.flightNumber);
            window.open(`https://www.flightradar24.com/${data.flightNumber}`, '_blank', 'width=' + screen.width + ',height=' + screen.height);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [mode, sessionId, isLoggedIn, lastOpenedFlight]);

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const createNewSession = async (selectedMode) => {
    const id = generateSessionId();
    const session = { id, mode: selectedMode };
    
    try {
      sessionStorage.setItem('flightTrackerSession', JSON.stringify(session));
      setSessionId(id);
      setMode(selectedMode);
      setIsLoggedIn(true);

      const flightRef = ref(database, `flights/${id}`);
      await set(flightRef, { flightNumber: '', timestamp: Date.now() });
      
      alert(`✅ New session created and synced: ${id}`);
    } catch (error) {
      console.error('Storage initialization failed:', error);
      alert('⚠️ Failed to create session. Please try again.');
    }
  };

  const joinSession = async (selectedMode) => {
    if (!inputSessionId.trim()) {
      alert('Please enter a session ID');
      return;
    }

    const id = inputSessionId.trim().toUpperCase();
    const session = { id, mode: selectedMode };
    
    try {
      sessionStorage.setItem('flightTrackerSession', JSON.stringify(session));
      setSessionId(id);
      setMode(selectedMode);
      setIsLoggedIn(true);

      const flightRef = ref(database, `flights/${id}`);
      const snapshot = await get(flightRef);
      
      if (!snapshot.exists()) {
        await set(flightRef, { flightNumber: '', timestamp: Date.now() });
      }
      
      alert(`✅ Successfully synced to session: ${id}`);
    } catch (error) {
      console.error('Join session failed:', error);
      alert('⚠️ Failed to join session. Please try again.');
    }
  };

  const sendFlight = async () => {
    if (!flightNumber.trim()) return;
    
    const data = {
      flightNumber: flightNumber.toUpperCase(),
      timestamp: Date.now()
    };

    try {
      const flightRef = ref(database, `flights/${sessionId}`);
      await set(flightRef, data);
      alert(`✅ Flight ${data.flightNumber} sent successfully!\n\nThe receiver will display it within 2 seconds.`);
    } catch (error) {
      console.error('Failed to send flight:', error);
      alert('❌ Failed to send flight data. Please try again.');
    }
  };

  const stopFlight = async () => {
    try {
      const flightRef = ref(database, `flights/${sessionId}`);
      await set(flightRef, { flightNumber: '', timestamp: Date.now() });
      setActiveSession(null);
      setLastOpenedFlight(null);
    } catch (error) {
      console.error('Failed to stop flight:', error);
    }
  };

  const logout = async () => {
    if (mode === 'sender') {
      await stopFlight();
    }
    sessionStorage.removeItem('flightTrackerSession');
    setIsLoggedIn(false);
    setMode(null);
    setSessionId('');
    setFlightNumber('');
    setActiveSession(null);
    setStep('choose');
    setInputSessionId('');
    setLastOpenedFlight(null);
  };

  if (!isLoggedIn && step === 'choose') {
    return (
      <>
        <video muted autoPlay playsInline loop id="myVideo">
          <source src="/smoke.mp4" type="video/mp4" />
        </video>
        <div className="lines">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4" style={{position: 'relative', zIndex: 1}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 text-blue-600"><Plane /></div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Flight Tracker Sync</h1>
              <p className="text-gray-600">Choose your device mode</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  setMode('sender');
                  setStep('create-or-join');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="w-6 h-6"><Smartphone /></div>
                Sender (Phone)
              </button>
              
              <button
                onClick={() => {
                  setMode('receiver');
                  setStep('create-or-join');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="w-6 h-6"><Monitor /></div>
                Receiver (Computer)
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isLoggedIn && step === 'create-or-join') {
    return (
      <>
        <video muted autoPlay playsInline loop id="myVideo">
          <source src="/smoke.mp4" type="video/mp4" />
        </video>
        <div className="lines">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4" style={{position: 'relative', zIndex: 1}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <button
              onClick={() => {
                setStep('choose');
                setMode(null);
              }}
              className="text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Back
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {mode === 'sender' ? 'Sender Setup' : 'Receiver Setup'}
              </h2>
              <p className="text-gray-600">Create a new session or join existing</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => createNewSession(mode)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Create New Session
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Session ID
                </label>
                <input
                  type="text"
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value.toUpperCase())}
                  placeholder="e.g., A3F7K2M9"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg uppercase font-mono"
                />
              </div>

              <button
                onClick={() => joinSession(mode)}
                disabled={!inputSessionId.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Join Session
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Create a session on one device, then use the same Session ID to join on the other device.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (mode === 'sender' && isLoggedIn) {
    return (
      <>
        <video muted autoPlay playsInline loop id="myVideo">
          <source src="/smoke.mp4" type="video/mp4" />
        </video>
        <div className="lines">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4" style={{position: 'relative', zIndex: 1}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Send Flight</h2>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Logout"
              >
                <div className="w-5 h-5"><LogOut /></div>
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Session ID:</p>
              <p className="text-2xl font-mono font-bold text-blue-600 tracking-wider">{sessionId}</p>
              <p className="text-xs text-gray-500 mt-2">Share this ID with your receiver device</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight Number
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="e.g., AA123, BA456"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg uppercase"
                />
              </div>

              <button
                onClick={sendFlight}
                disabled={!flightNumber.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="w-6 h-6"><Plane /></div>
                Start Tracking
              </button>

              <button
                onClick={stopFlight}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Stop Tracking
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (mode === 'receiver' && isLoggedIn) {
    const currentFlight = activeSession?.flightNumber;

    return (
      <>
        <video muted autoPlay playsInline loop id="myVideo">
          <source src="/smoke.mp4" type="video/mp4" />
        </video>
        <div className="lines">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 flex items-center justify-center p-4" style={{position: 'relative', zIndex: 1}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Receiver Mode</h2>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Logout"
              >
                <div className="w-5 h-5"><LogOut /></div>
              </button>
            </div>

            <div className="mb-8 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Session ID:</p>
              <p className="text-2xl font-mono font-bold text-indigo-600 tracking-wider">{sessionId}</p>
            </div>

            {currentFlight ? (
              <div className="space-y-4">
                <div className="p-6 bg-green-50 border-2 border-green-500 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2">Now Tracking:</p>
                  <p className="text-3xl font-bold text-green-700">{currentFlight}</p>
                  <p className="text-sm text-gray-500 mt-2">✅ FlightRadar24 opened automatically</p>
                </div>

                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 text-green-600"><Plane /></div>
                    <p className="text-gray-600 font-semibold">Window opened in new tab/window</p>
                    <p className="text-sm text-gray-500 mt-2">Check your browser tabs</p>
                  </div>
                </div>

                <button
                  onClick={() => window.open(`https://www.flightradar24.com/${currentFlight}`, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105"
                >
                  Re-open FlightRadar24
                </button>

                <button
                  onClick={stopFlight}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Stop Tracking
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 text-gray-300 animate-pulse"><Monitor /></div>
                <p className="text-xl text-gray-600">Waiting for flight from sender...</p>
                <p className="text-sm text-gray-400 mt-2">Make sure your sender uses session ID: <span className="font-mono font-bold">{sessionId}</span></p>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>⚠️ Important:</strong> Allow pop-ups for this site to enable automatic window opening.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
}