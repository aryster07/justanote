import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NoteData } from './types';
import Landing from './pages/Landing';
import { RecipientTheme, SelectSong, ComposeMessage, DeliverySettings, Success } from './pages/CreateFlow';
import { GiftReveal, NoteDisplay } from './pages/ViewNote';
import { AdminDashboard } from './pages/Admin';
import { StoryPreview } from './pages/Share';

const INITIAL_DATA: NoteData = {
  recipientName: '',
  vibe: '',
  song: null,
  message: '',
  photo: null,
  isAnonymous: false,
  senderName: '',
  deliveryMethod: 'admin',
  recipientInstagram: '',
  senderEmail: '',
};

const App = () => {
  const [noteData, setNoteData] = useState<NoteData>(INITIAL_DATA);

  const updateData = (newData: Partial<NoteData>) => {
    setNoteData(prev => ({ ...prev, ...newData }));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full min-h-screen bg-white relative flex flex-col">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Creation Flow */}
            <Route path="/create/recipient" element={<RecipientTheme data={noteData} updateData={updateData} />} />
            <Route path="/create/song" element={<SelectSong data={noteData} updateData={updateData} />} />
            <Route path="/create/message" element={<ComposeMessage data={noteData} updateData={updateData} />} />
            <Route path="/create/delivery" element={<DeliverySettings data={noteData} updateData={updateData} />} />
            <Route path="/create/success" element={<Success data={noteData} />} />

            {/* Recipient View */}
            <Route path="/reveal/:id" element={<GiftReveal />} />
            <Route path="/view/:id" element={<NoteDisplay />} />

            {/* Sharing */}
            <Route path="/story-preview" element={<StoryPreview />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
};

export default App;