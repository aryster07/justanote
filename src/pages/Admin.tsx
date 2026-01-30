import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { db, auth } from '../config/firebase';
import { NoteData, VIBES } from '../types';
import { 
  Lock, 
  Eye, 
  Instagram, 
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
  LogOut
} from 'lucide-react';

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

// Allowed admin emails
const ALLOWED_ADMINS = [
  'aryanrana762@gmail.com',
  'justanote07@gmail.com'
];

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, delivered: 0, todayCreated: 0 });

  // EmailJS configuration
  const EMAILJS_SERVICE_ID = 'service_h5xg96d';
  const EMAILJS_TEMPLATE_ID = 'template_bs0eycc';
  const EMAILJS_PUBLIC_KEY = 'H-Ra201ag7dDMUXiunF2x';

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser?.email);
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
        console.log('Checking redirect result...');
        const result = await getRedirectResult(auth);
        console.log('Redirect result:', result?.user?.email);
        
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

  // Check if current domain needs to use redirect
  const isCustomDomain = () => {
    const hostname = window.location.hostname;
    return hostname.includes('justanote.me') || 
           hostname === 'www.justanote.me' || 
           hostname === 'justanote.me';
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
      
      // Use redirect on mobile devices or custom domains (popup often fails)
      if (isMobile() || isCustomDomain()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      
      // Use popup on desktop
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

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Fetch notes when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchNotes();
    }
  }, [isAuthorized]);

  // Fetch notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notes'),
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
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to fetch notes');
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
      if (note?.senderEmail) {
        const noteLink = `${window.location.origin}/note/${noteId}`;
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
          console.log('Email sent successfully to:', note.senderEmail);
        } catch (emailErr) {
          console.error('Failed to send email:', emailErr);
          // Don't block the delivery status update if email fails
        }
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

  // Copy link to clipboard
  const copyLink = (noteId: string) => {
    const link = `${window.location.origin}/note/${noteId}`;
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
  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
              <p className="text-gray-500 mt-2">Sign in with authorized Google account</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
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

            <p className="text-xs text-gray-400 text-center mt-6">
              Only authorized emails can access admin panel
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Just A Note</h1>
              <p className="text-sm text-gray-500">Welcome, {user.displayName || user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotes}
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
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
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
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{vibe.emoji}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            To: {note.recipientName}
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

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* Sender Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserIcon className="w-4 h-4" />
                          <span>
                            {note.isAnonymous ? 'Anonymous' : note.senderName || 'Not provided'}
                          </span>
                        </div>
                        
                        {note.senderEmail && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <a 
                              href={`mailto:${note.senderEmail}`}
                              className="text-rose-500 hover:underline"
                            >
                              {note.senderEmail}
                            </a>
                          </div>
                        )}
                        
                        {note.recipientInstagram && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Instagram className="w-4 h-4" />
                            <a 
                              href={`https://instagram.com/${note.recipientInstagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-500 hover:underline"
                            >
                              {note.recipientInstagram.startsWith('@') ? note.recipientInstagram : `@${note.recipientInstagram}`}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Song Info */}
                      {note.song && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          {note.song.albumCover || note.song.coverUrl ? (
                            <img 
                              src={note.song.albumCover || note.song.coverUrl} 
                              alt="" 
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                              <Music className="w-6 h-6 text-rose-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{note.song.title}</p>
                            <p className="text-sm text-gray-500 truncate">{note.song.artist}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Preview */}
                    {note.message && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <p className="text-sm text-gray-600 line-clamp-3">{note.message}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/note/${note.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Note
                      </a>
                      
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
                          Send via DM
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
      </main>
    </div>
  );
}
