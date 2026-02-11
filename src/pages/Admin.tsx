import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { db, auth } from '../config/firebase';
import { NoteData, VIBES } from '../types';
import { 
  Lock, 
  Instagram, 
  Trash2, 
  Mail, 
  CheckCircle, 
  Clock, 
  Music, 
  User as UserIcon, 
  Heart,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  Send,
  Calendar,
  LogOut,
  Filter,
  BarChart3,
  Key
} from 'lucide-react';

// SHA-256 hash function using SubtleCrypto (browser-native, no library needed)
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface Note extends NoteData {
  id: string;
  createdAt: any;
  deliveredAt?: any;
}

interface Stats {
  total: number;
  pending: number;
  delivered: number;
  todayCreated: number;
}

interface AllNotesStats {
  total: number;
  self: number;
  admin: number;
  delivered: number;
  pending: number;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

// Pull allowed admin emails from env (with fallback so site never breaks)
const ALLOWED_ADMINS = (import.meta.env.VITE_ADMIN_EMAILS || 'aryanrana762@gmail.com,justanote07@gmail.com,arshrana762@gmail.com,anushkapuri17@gmail.com').split(',').map((e: string) => e.trim()).filter(Boolean);

// Admin password hash (SHA-256 of password, with fallback)
const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH || '7d72fe16ad1fc9e2e5b81a89b5c2f71ad61e039c578f262ec311ba4bad6e19f3';

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, delivered: 0, todayCreated: 0 });
  const [allNotesStats, setAllNotesStats] = useState<AllNotesStats>({ total: 0, self: 0, admin: 0, delivered: 0, pending: 0 });
  const [currentView, setCurrentView] = useState<'delivery' | 'allNotes'>('delivery');
  
  // All notes filters
  const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: '', endDate: '' });
  const [vibeFilter, setVibeFilter] = useState<string>('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<'all' | 'self' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');

  // EmailJS configuration from env (with fallbacks so site never breaks)
  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_h5xg96d';
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_gkanixq';
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'D0IP-NcoiDAvCP57u';

  // Password login state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMode, setLoginMode] = useState<'choose' | 'password' | 'google'>('choose');


  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_ADMINS.includes(currentUser.email || '')) {
        setIsAuthorized(true);
        setAuthLoading(false);
      } else if (currentUser) {
        // User is signed in but not authorized
        setIsAuthorized(false);
        setAuthLoading(false);
      }
      // Don't set authLoading false here if no user - wait for redirect result
    });

    return () => unsubscribe();
  }, []);

  // Handle redirect result (for mobile sign-in)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          if (!ALLOWED_ADMINS.includes(result.user.email || '')) {
            await signOut(auth);
            setError('Access denied. This email is not authorized.');
            setAuthLoading(false);
          }
          // If authorized, onAuthStateChanged will handle setting the state
        } else {
          // No redirect result, check if there's already a user
          if (!auth.currentUser) {
            setAuthLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Redirect sign in error:', err);
        setAuthLoading(false);
        // More specific error messages for mobile
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // User cancelled, don't show error
          return;
        } else if (err.code === 'auth/network-request-failed') {
          setError('Network error. Please check your internet connection.');
        } else if (err.code === 'auth/unauthorized-domain') {
          setError(`Domain "${window.location.hostname}" is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`);
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('Google sign-in is not enabled. Please contact admin.');
        } else {
          setError(`Sign in failed: ${err.message || 'Unknown error'}`);
        }
      }
    };
    handleRedirectResult();
  }, []);

  // Detect if mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      // Add prompt to always show account picker
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Use redirect ONLY on mobile devices, popup on desktop (including custom domains)
      if (isMobile()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      
      // Use popup on desktop (works better, stays in same session)
      const result = await signInWithPopup(auth, provider);
      
      if (!ALLOWED_ADMINS.includes(result.user.email || '')) {
        await signOut(auth);
        setError('Access denied. This email is not authorized.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        // Fallback to redirect if popup is blocked
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({
            prompt: 'select_account'
          });
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          setError(`Failed to sign in: ${redirectErr.message || 'Unknown error'}`);
        }
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain not authorized. Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(`Sign in failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  // Handle password login (hash-compare, no plaintext stored)
  const handlePasswordLogin = async () => {
    if (!passwordInput.trim()) return;
    setSigningIn(true);
    setError('');
    try {
      const inputHash = await sha256(passwordInput.trim());
      const storedHash = ADMIN_PASSWORD_HASH;
      if (inputHash === storedHash) {
        // Password matches — grant access without Google auth
        setIsAuthorized(true);
        setAuthLoading(false);
        setPasswordInput('');
      } else {
        setError('Incorrect password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      setIsAuthorized(false);
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Real-time listener for notes
  useEffect(() => {
    if (!isAuthorized) return;

    setLoading(true);
    
    // Create query for admin delivery notes
    const q = query(
      collection(db, 'notes'),
      where('deliveryMethod', '==', 'admin'),
      orderBy('createdAt', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allNotes: Note[] = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Note[];

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const pending = allNotes.filter(n => n.status === 'pending').length;
        const delivered = allNotes.filter(n => n.status === 'delivered').length;
        const todayCreated = allNotes.filter(n => {
          if (!n.createdAt?.toDate) return false;
          const created = n.createdAt.toDate();
          return created >= today;
        }).length;

        setStats({
          total: allNotes.length,
          pending,
          delivered,
          todayCreated
        });

        setNotes(allNotes);
        setLoading(false);
        setError('');
      },
      (err) => {
        // If composite index is missing, show helpful error with the link
        if (err.code === 'failed-precondition') {
          setError('Database index required. Check browser console for the index creation link.');
        } else {
          setError(`Failed to load notes: ${err.message || 'Unknown error'}`);
        }
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [isAuthorized]);

  // Fetch ALL notes (for analytics/all notes view)
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchAllNotes = async () => {
      try {
        const q = query(
          collection(db, 'notes'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const fetchedNotes: Note[] = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Note[];

        setAllNotes(fetchedNotes);

        // Calculate all notes stats
        const selfDelivery = fetchedNotes.filter(n => n.deliveryMethod === 'self').length;
        const adminDelivery = fetchedNotes.filter(n => n.deliveryMethod === 'admin').length;
        const delivered = fetchedNotes.filter(n => n.status === 'delivered').length;
        const pending = fetchedNotes.filter(n => n.status === 'pending').length;

        setAllNotesStats({
          total: fetchedNotes.length,
          self: selfDelivery,
          admin: adminDelivery,
          delivered,
          pending
        });
      } catch (err: any) {
        console.error('Error fetching all notes:', err);
      }
    };

    fetchAllNotes();
  }, [isAuthorized]);

  // Manual refresh function (forces re-fetch)
  const refreshNotes = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError('');
    
    try {
      const q = query(
        collection(db, 'notes'),
        where('deliveryMethod', '==', 'admin'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const allNotes: Note[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Note[];

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pending = allNotes.filter(n => n.status === 'pending').length;
      const delivered = allNotes.filter(n => n.status === 'delivered').length;
      const todayCreated = allNotes.filter(n => {
        if (!n.createdAt?.toDate) return false;
        const created = n.createdAt.toDate();
        return created >= today;
      }).length;

      setStats({
        total: allNotes.length,
        pending,
        delivered,
        todayCreated
      });

      setNotes(allNotes);
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      if (err.code === 'failed-precondition') {
        setError('Database index required. Check Firebase Console.');
      } else {
        setError('Failed to fetch notes');
      }
    }
    setLoading(false);
  };

  // Mark as delivered and send email confirmation
  const markAsDelivered = async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      
      const docRef = doc(db, 'notes', noteId);
      await updateDoc(docRef, {
        status: 'delivered',
        deliveredAt: serverTimestamp()
      });
      
      // Send email confirmation to sender if they provided email
      let emailSent = false;
      if (note?.senderEmail) {
        const noteLink = `${window.location.origin}/view/${noteId}`;
        const vibe = getVibe(note.vibe || '1');
        
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: note.senderEmail,
              sender_name: note.isAnonymous ? 'Anonymous Sender' : (note.senderName || 'Someone special'),
              recipient_name: note.recipientName,
              note_link: noteLink,
              vibe_emoji: vibe.emoji,
              vibe_label: vibe.label,
              message_preview: note.message ? (note.message.length > 100 ? note.message.substring(0, 100) + '...' : note.message) : 'No message',
            },
            EMAILJS_PUBLIC_KEY
          );
          emailSent = true;
        } catch (emailErr: any) {
          // Show error but don't block delivery status
          alert(`Note marked as delivered, but email failed: ${emailErr?.text || emailErr?.message || 'Unknown error'}`);
        }
      }
      
      // Show success message
      if (emailSent) {
        alert(`✅ Marked as delivered! Email sent to ${note?.senderEmail}`);
      } else if (!note?.senderEmail) {
        alert('✅ Marked as delivered! (No email to send - sender email not provided)');
      }
      
      // Update local state
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, status: 'delivered' } : n
      ));
      
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        delivered: prev.delivered + 1
      }));
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note status');
    }
  };

  // Delete a single note
  const deleteNote = async (noteId: string) => {
    if (!user) {
      alert('Delete requires Google sign-in. Please sign out and use Google login.');
      return;
    }
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const note = notes.find(n => n.id === noteId);
      await deleteDoc(doc(db, 'notes', noteId));
      
      // Update local state
      setNotes(prev => prev.filter(n => n.id !== noteId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        pending: note?.status === 'pending' ? prev.pending - 1 : prev.pending,
        delivered: note?.status === 'delivered' ? prev.delivered - 1 : prev.delivered,
      }));
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note');
    }
  };

  // Delete all notes (admin only)
  const deleteAllNotes = async () => {
    if (!user) {
      alert('Delete requires Google sign-in. Please sign out and use Google login.');
      return;
    }
    if (!confirm('Are you sure you want to delete ALL notes? This cannot be undone!')) return;
    if (!confirm('This will permanently delete all notes. Type "DELETE" to confirm.')) return;
    
    try {
      setLoading(true);
      for (const note of notes) {
        await deleteDoc(doc(db, 'notes', note.id));
      }
      setNotes([]);
      setStats({ total: 0, pending: 0, delivered: 0, todayCreated: 0 });
      alert('All notes deleted successfully');
    } catch (err) {
      console.error('Error deleting all notes:', err);
      alert('Failed to delete all notes');
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const copyLink = (noteId: string) => {
    const link = `${window.location.origin}/view/${noteId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(noteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get vibe info
  const getVibe = (vibeId: string) => {
    return VIBES.find(v => v.id === vibeId) || { emoji: '❤️', label: 'Love' };
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (filter === 'all') return true;
    return n.status === filter;
  });

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
              <p className="text-gray-500 mt-2">
                {loginMode === 'choose' ? 'Choose login method' : loginMode === 'password' ? 'Enter admin password' : 'Sign in with Google'}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {loginMode === 'choose' && (
              <div className="space-y-3">
                <button
                  onClick={() => { setLoginMode('password'); setError(''); }}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-3"
                >
                  <Key className="w-5 h-5" />
                  Login with Password
                </button>
                <button
                  onClick={() => { setLoginMode('google'); setError(''); }}
                  className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}

            {loginMode === 'password' && (
              <div className="space-y-3">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  placeholder="Enter admin password"
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-0 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                />
                <button
                  onClick={handlePasswordLogin}
                  disabled={signingIn || !passwordInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Verifying...</>
                  ) : (
                    <><Lock className="w-5 h-5" /> Login</>
                  )}
                </button>
                <button
                  onClick={() => { setLoginMode('choose'); setError(''); setPasswordInput(''); }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  ← Back to login options
                </button>
              </div>
            )}

            {loginMode === 'google' && (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Signing in...</>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setLoginMode('choose'); setError(''); }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  ← Back to login options
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-6">
              Authorized access only
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Just A Note</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.displayName || user?.email || 'Admin'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={refreshNotes}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
          
          {/* View Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('delivery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'delivery'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-100'
              }`}
            >
              <Send className="w-4 h-4" />
              Delivery Queue
            </button>
            <button
              onClick={() => setCurrentView('allNotes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'allNotes'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              All Notes
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Conditional rendering based on current view */}
        {currentView === 'delivery' ? (
          <>
            {/* Delivery Queue View - Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Notes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.todayCreated}</p>
                <p className="text-sm text-gray-500">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['pending', 'delivered', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === f 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-100'
              }`}
            >
              {f} {f === 'pending' && stats.pending > 0 && (
                <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-rose-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-rose-100">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No {filter === 'all' ? '' : filter} notes found</p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const vibe = getVibe(note.vibe || '1');
              
              return (
                <div 
                  key={note.id}
                  className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden"
                >
                  <div className="p-4 md:p-6">
                    {/* Header - Minimal info for privacy */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{vibe.emoji}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Note #{note.id.slice(-6).toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {vibe.label} • {formatDate(note.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        note.status === 'pending' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {note.status === 'pending' ? 'Pending' : 'Delivered'}
                      </span>
                    </div>

                    {/* Only show Instagram handle for delivery - no other personal info */}
                    <div className="mb-4">
                      {note.recipientInstagram && (
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                          <Instagram className="w-5 h-5 text-pink-500" />
                          <span className="font-medium text-gray-900">Deliver to:</span>
                          <a 
                            href={`https://instagram.com/${note.recipientInstagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-500 hover:underline font-semibold"
                          >
                            @{note.recipientInstagram.replace('@', '')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyLink(note.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copiedId === note.id ? 'Copied!' : 'Copy Link'}
                      </button>

                      {note.recipientInstagram && (
                        <a
                          href={`https://instagram.com/${note.recipientInstagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                          Open IG Profile
                        </a>
                      )}

                      {note.status === 'pending' && (
                        <button
                          onClick={() => markAsDelivered(note.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ml-auto"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
          </>
        ) : (
          <>
            {/* All Notes View */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Notes Analytics
              </h2>
              
              {/* Filters First */}
              <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-gray-900">Filter Analytics</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Vibe Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vibe</label>
                    <select
                      value={vibeFilter}
                      onChange={(e) => setVibeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    >
                      <option value="all">All Vibes</option>
                      {VIBES.map(vibe => (
                        <option key={vibe.id} value={vibe.id}>{vibe.emoji} {vibe.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Delivery Method Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
                    <select
                      value={deliveryMethodFilter}
                      onChange={(e) => setDeliveryMethodFilter(e.target.value as 'all' | 'self' | 'admin')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    >
                      <option value="all">All Methods</option>
                      <option value="self">Self Delivery</option>
                      <option value="admin">Admin Delivery</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-3 flex gap-2">
                  {/* Status Filter */}
                  <div className="flex gap-2">
                    {(['all', 'pending', 'delivered'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                          statusFilter === status
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  
                  {/* Clear Filters */}
                  <button
                    onClick={() => {
                      setDateFilter({ startDate: '', endDate: '' });
                      setVibeFilter('all');
                      setDeliveryMethodFilter('all');
                      setStatusFilter('all');
                    }}
                    className="ml-auto px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Dynamic Stats based on filters */}
              {(() => {
                const filteredNotes = allNotes.filter(note => {
                  // Date filter
                  if (dateFilter.startDate || dateFilter.endDate) {
                    if (!note.createdAt?.toDate) return false;
                    const noteDate = note.createdAt.toDate();
                    if (dateFilter.startDate && noteDate < new Date(dateFilter.startDate)) return false;
                    if (dateFilter.endDate && noteDate > new Date(dateFilter.endDate + 'T23:59:59')) return false;
                  }
                  // Vibe filter
                  if (vibeFilter !== 'all' && note.vibe !== vibeFilter) return false;
                  // Delivery method filter
                  if (deliveryMethodFilter !== 'all' && note.deliveryMethod !== deliveryMethodFilter) return false;
                  // Status filter
                  if (statusFilter !== 'all' && note.status !== statusFilter) return false;
                  return true;
                });

                const filteredStats = {
                  total: filteredNotes.length,
                  self: filteredNotes.filter(n => n.deliveryMethod === 'self').length,
                  admin: filteredNotes.filter(n => n.deliveryMethod === 'admin').length,
                  delivered: filteredNotes.filter(n => n.status === 'delivered').length,
                  pending: filteredNotes.filter(n => n.status === 'pending').length,
                };

                return (
                  <>
                    {/* Filtered Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredStats.total}</p>
                            <p className="text-sm text-gray-500">Total</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredStats.self}</p>
                            <p className="text-sm text-gray-500">Self</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Send className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredStats.admin}</p>
                            <p className="text-sm text-gray-500">Admin</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredStats.delivered}</p>
                            <p className="text-sm text-gray-500">Delivered</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredStats.pending}</p>
                            <p className="text-sm text-gray-500">Pending</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-4">
                      {filteredNotes.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-rose-100">
                          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No notes match the current filters</p>
                        </div>
                      ) : (
                        filteredNotes.map((note) => {
                          const noteVibe = VIBES.find(v => v.id === note.vibe) || { emoji: '❤️', label: 'Love' };
                          return (
                            <div key={note.id} className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
                              <div className="p-4 md:p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="text-3xl">{noteVibe.emoji}</div>
                                    <div>
                                      <h3 className="font-semibold text-gray-900">Note #{note.id.slice(-6).toUpperCase()}</h3>
                                      <p className="text-sm text-gray-500">{noteVibe.label} • {formatDate(note.createdAt)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      note.deliveryMethod === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {note.deliveryMethod === 'admin' ? 'Admin' : 'Self'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      note.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {note.status === 'pending' ? 'Pending' : 'Delivered'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span>To: <strong className="text-gray-700">{note.recipientName}</strong></span>
                                  {note.song && (
                                    <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {note.song.title}</span>
                                  )}
                                  {note.recipientInstagram && (
                                    <span className="flex items-center gap-1"><Instagram className="w-3 h-3" /> @{note.recipientInstagram.replace('@', '')}</span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-3">
                                  <button onClick={() => copyLink(note.id)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                                    {copiedId === note.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    {copiedId === note.id ? 'Copied!' : 'Copy Link'}
                                  </button>
                                  <a href={`${window.location.origin}/view/${note.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm">
                                    <ExternalLink className="w-3 h-3" /> View
                                  </a>
                                  <button onClick={() => deleteNote(note.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm ml-auto">
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
