import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, MoreVertical, Link as LinkIcon, MailCheck, LayoutDashboard, History, User, Instagram } from 'lucide-react';
import { getAllDeliveryRequests, markAsDelivered, type DeliveryRequest } from '../lib/adminService';

export const AdminDashboard = () => {
    const [notes, setNotes] = useState<DeliveryRequest[]>([]);
    const [stats, setStats] = useState({ pending: 0, completed: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const deliveryRequests = await getAllDeliveryRequests();
                setNotes(deliveryRequests);
                
                const pendingCount = deliveryRequests.filter(n => n.status === 'pending').length;
                const completedCount = deliveryRequests.filter(n => n.status === 'delivered').length;
                
                setStats({ pending: pendingCount, completed: completedCount });
            } catch (e) {
                console.error("Error fetching notes:", e);
            }
        };

        fetchNotes();
    }, []);

    const handleMarkDelivered = async (noteId: string) => {
        setLoading(true);
        try {
            const success = await markAsDelivered(noteId);
            if (success) {
                // Refresh the list
                const deliveryRequests = await getAllDeliveryRequests();
                setNotes(deliveryRequests);
                
                const pendingCount = deliveryRequests.filter(n => n.status === 'pending').length;
                const completedCount = deliveryRequests.filter(n => n.status === 'delivered').length;
                
                setStats({ pending: pendingCount, completed: completedCount });
            }
        } catch (e) {
            console.error("Error marking as delivered:", e);
        } finally {
            setLoading(false);
        }
    };

    const deliveryQueue = notes;

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="flex items-center justify-between p-5 max-w-md mx-auto">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-royal-gold uppercase mb-1">Admin Dashboard</span>
                        <h2 className="text-2xl font-bold text-slate-900">Hello, Aryan</h2>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden ring-2 ring-royal-gold/30">
                        <img src="https://i.pravatar.cc/150?u=aryan" alt="Admin" className="w-full h-full object-cover" />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 pb-20">
                <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 md:gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-4 md:gap-6">
                        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm flex flex-col justify-between h-36 sm:h-40 md:h-48 border border-slate-100">
                             <div className="flex justify-between items-start">
                                 <div className="p-2.5 rounded-full bg-royal-gold/10 text-royal-gold">
                                     <Clock size={24} />
                                 </div>
                                 <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-royal-gold opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-royal-gold"></span>
                                </span>
                             </div>
                             <div>
                                 <p className="text-slate-400 text-sm font-medium mb-1">Total Pending</p>
                                 <p className="text-4xl font-extrabold text-slate-900">{stats.pending}</p>
                             </div>
                        </div>
                        <div className="bg-gold-gradient p-5 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-lg shadow-royal-gold/20 flex flex-col justify-between h-36 sm:h-40 md:h-48 text-white">
                             <div className="flex justify-between items-start">
                                 <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm">
                                     <CheckCircle2 size={24} />
                                 </div>
                             </div>
                             <div>
                                 <p className="text-white/90 text-sm font-medium mb-1">Total Notes</p>
                                 <p className="text-4xl font-extrabold">{notes.length}</p>
                             </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-end justify-between px-1 mb-4">
                            <h3 className="text-xl font-bold text-slate-900">Delivery Queue</h3>
                            <button className="text-royal-gold text-sm font-bold uppercase tracking-wide">View All</button>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            {deliveryQueue.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No pending deliveries</div>
                            ) : (
                                deliveryQueue.map((item) => (
                                    <div key={item.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center text-white shadow-md">
                                                    <Instagram size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-base">{item.recipientInstagram}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${item.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                            {item.status}
                                                        </span>
                                                        <span className="text-slate-400 text-xs font-medium">
                                                            {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400">
                                                <MoreVertical size={20} />
                                            </button>
                                        </div>
                                        <div className="h-px bg-slate-50 w-full"></div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => window.open(`/view/${item.id}`, '_blank')}
                                                className="flex-1 h-11 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50"
                                            >
                                                <LinkIcon size={16} /> View Link
                                            </button>
                                            <button 
                                                onClick={() => handleMarkDelivered(item.id)}
                                                disabled={loading || item.status === 'delivered'}
                                                className="flex-[1.5] h-11 rounded-full bg-gold-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <MailCheck size={18} /> {item.status === 'delivered' ? 'Delivered' : 'Mark Delivered'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around p-3 max-w-md mx-auto">
                    <button className="flex flex-col items-center gap-1 p-2 text-royal-gold">
                        <LayoutDashboard size={24} />
                        <span className="text-[10px] font-bold">Dashboard</span>
                    </button>
                     <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-royal-gold transition-colors">
                        <History size={24} />
                        <span className="text-[10px] font-medium">History</span>
                    </button>
                     <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-royal-gold transition-colors">
                        <User size={24} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};