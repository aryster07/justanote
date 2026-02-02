import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { RecipientStep, SongStep, MessageStep, DeliveryStep, SuccessPage } from './pages/CreateFlow';
import ViewNote from './pages/ViewNote';
import Admin from './pages/Admin';
import { NoteData } from './types';

// Initial state for a new note
const initialNoteData: NoteData = {
  recipientName: '',
  vibe: null,
  song: null,
  songData: null,
  message: '',
  photo: null,
  photoBase64: null,
  isAnonymous: true,
  senderName: '',
  deliveryMethod: 'self',
  senderEmail: '',
  recipientInstagram: '',
};

// Context for sharing note data across steps
interface NoteContextType {
  noteData: NoteData;
  updateNoteData: (data: Partial<NoteData>) => void;
  resetNoteData: () => void;
}

const NoteContext = createContext<NoteContextType | null>(null);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within NoteProvider');
  }
  return context;
};

// Note Provider component
const NoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [noteData, setNoteData] = useState<NoteData>(() => {
    // Try to restore from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem('noteData');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't restore File objects, they can't be serialized
        return { ...parsed, photo: null };
      }
    } catch (e) {
      console.log('Could not restore note data');
    }
    return initialNoteData;
  });

  // Save to sessionStorage on changes (except photo file)
  useEffect(() => {
    try {
      const toSave = { ...noteData, photo: null };
      sessionStorage.setItem('noteData', JSON.stringify(toSave));
    } catch (e) {
      console.log('Could not save note data');
    }
  }, [noteData]);

  const updateNoteData = (data: Partial<NoteData>) => {
    setNoteData((prev) => ({ ...prev, ...data }));
  };

  const resetNoteData = () => {
    setNoteData(initialNoteData);
    sessionStorage.removeItem('noteData');
    sessionStorage.removeItem('completedNoteId'); // Clear completion flag
  };

  return (
    <NoteContext.Provider value={{ noteData, updateNoteData, resetNoteData }}>
      {children}
    </NoteContext.Provider>
  );
};

// Create flow wrapper component - now uses context
const CreateFlowWrapper: React.FC = () => {
  const { step } = useParams<{ step: string }>();
  const { noteData, updateNoteData, resetNoteData } = useNoteContext();
  const navigate = useNavigate();

  // Check if user has completed a note in this session
  useEffect(() => {
    const completedNoteId = sessionStorage.getItem('completedNoteId');
    const currentPath = window.location.pathname;
    
    // If user completed a note and tries to access create flow, redirect to home
    if (completedNoteId && currentPath.startsWith('/create')) {
      navigate('/', { replace: true });
      return;
    }

    // Enforce step order - prevent skipping steps via URL manipulation
    const validSteps = ['recipient', 'song', 'message', 'delivery'];
    const currentStepIndex = validSteps.indexOf(step || 'recipient');
    
    // Check if user is trying to skip steps
    if (currentStepIndex > 0) {
      // Check if previous steps have required data
      const hasRecipientData = noteData.recipientName.trim() && noteData.vibe;
      
      if (currentStepIndex >= 1 && !hasRecipientData) {
        // Missing recipient data, redirect to first step
        navigate('/create/recipient', { replace: true });
        return;
      }
      
      if (currentStepIndex >= 3 && !noteData.message.trim()) {
        // Missing message data, redirect to message step
        navigate('/create/message', { replace: true });
        return;
      }
    }

    // Prevent back navigation after reaching success page
    const handlePopState = (event: PopStateEvent) => {
      const completedId = sessionStorage.getItem('completedNoteId');
      if (completedId && window.location.pathname.startsWith('/create')) {
        // User is trying to go back to create flow after completing
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step, noteData, navigate]);

  const stepComponents: Record<string, React.ReactNode> = {
    recipient: <RecipientStep data={noteData} updateData={updateNoteData} />,
    song: <SongStep data={noteData} updateData={updateNoteData} />,
    message: <MessageStep data={noteData} updateData={updateNoteData} />,
    delivery: <DeliveryStep data={noteData} updateData={updateNoteData} />,
  };

  return <>{stepComponents[step || 'recipient']}</>;
};

// Success wrapper
const SuccessWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { noteData, resetNoteData } = useNoteContext();
  
  // Store the delivery data before reset
  const [savedData, setSavedData] = useState<typeof noteData | null>(null);

  useEffect(() => {
    // Save the current note data before resetting
    if (!savedData && noteData.recipientName) {
      setSavedData({ ...noteData, id });
      // Mark this session as having completed a note
      sessionStorage.setItem('completedNoteId', id || '');
    }
  }, [noteData, id, savedData]);

  // Reset note data after saving
  useEffect(() => {
    if (savedData) {
      const timer = setTimeout(() => {
        resetNoteData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [savedData]);

  // Use saved data if available, otherwise use current noteData
  const displayData = savedData || { ...noteData, id };

  return <SuccessPage data={displayData} />;
};

// 404 Not Found component
const NotFound: React.FC = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6">
      <div className="text-6xl">🔍</div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-slate-500 text-center">The page you're looking for doesn't exist</p>
      <a
        href="/"
        className="mt-4 px-6 py-3 bg-royal-gold text-white font-bold rounded-full"
      >
        Go Home
      </a>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NoteProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/create/:step" element={<CreateFlowWrapper />} />
          <Route path="/success/:id" element={<SuccessWrapper />} />
          <Route path="/view/:id" element={<ViewNote />} />
          <Route path="/note/:id" element={<ViewNote />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/aryan" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NoteProvider>
    </BrowserRouter>
  );
};

export default App;
