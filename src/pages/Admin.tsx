import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NoteData, VIBES } from '../types';
import { 
  Lock, 
  Eye, 
  Instagram, 
  Mail, 
  CheckCircle, 
  Clock, 
  Music, 
  User, 
  Heart,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  Send,
  Calendar
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

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, delivered: 0, todayCreated: 0 });

  // Admin password - in production, use environment variable
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_SECRET || 'justanote2024';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      setError('Invalid password');
    }
  };

  // Check for existing session
  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
    }
  }, [isAuthenticated]);

  // Mark as delivered
  const markAsDelivered = async (noteId: string) => {
    try {
      const docRef = doc(db, 'notes', noteId);
      await updateDoc(docRef, {
        status: 'delivered',
        deliveredAt: serverTimestamp()
      });
      
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

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
              <p className="text-gray-500 mt-2">Enter password to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                autoFocus
              />
              
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg shadow-rose-200"
              >
                Login
              </button>
            </form>
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
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          
          <button
            onClick={fetchNotes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                          <User className="w-4 h-4" />
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
