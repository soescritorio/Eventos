import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { 
  Event, 
  Attendee, 
  AppSettings, 
  DEFAULT_SETTINGS 
} from './types';
import * as storage from './services/storageService';
import * as webhookService from './services/webhookService';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Download, 
  Image as ImageIcon,
  Loader2,
  Search,
  AlertTriangle,
  Ticket,
  Upload
} from 'lucide-react';

// --- Helper Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline', color?: string }> = ({ 
  children, variant = 'primary', className = '', color, style, ...props 
}) => {
  let baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const styles: React.CSSProperties = { ...style };
  
  if (variant === 'primary') {
    if (color) {
        styles.backgroundColor = color;
        styles.color = 'white';
    } else {
        baseClass += " bg-gray-900 text-white hover:bg-gray-800";
    }
  } else if (variant === 'secondary') {
    baseClass += " bg-gray-100 text-gray-700 hover:bg-gray-200";
  } else if (variant === 'danger') {
    baseClass += " bg-red-50 text-red-600 hover:bg-red-100";
  } else if (variant === 'outline') {
    baseClass += " border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white";
  }

  return (
    <button className={`${baseClass} ${className}`} style={styles} {...props}>
      {children}
    </button>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  // --- State ---
  const [currentPage, setCurrentPage] = useState('home'); // home, event-detail, login, admin-events, admin-settings, admin-attendees
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Selection State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'register' | 'attendee_edit' | 'attendee_create' | 'success' | 'delete_confirmation' | 'settings_saved' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'event' | 'attendee' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forms State
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [eventForm, setEventForm] = useState<Partial<Event>>({});
  const [registerForm, setRegisterForm] = useState<Partial<Attendee> & { confirmEmail?: string }>({});
  const [attendeeEditForm, setAttendeeEditForm] = useState<Partial<Attendee>>({});

  // --- Effects ---

  const refreshData = async () => {
    setIsDataLoading(true);
    try {
        const [loadedSettings, loadedEvents, loadedAttendees] = await Promise.all([
            storage.getSettings(),
            storage.getEvents(),
            storage.getAttendees()
        ]);
        setSettings(loadedSettings);
        setEvents(loadedEvents);
        setAttendees(loadedAttendees);
    } catch (error) {
        console.error("Error loading data", error);
    } finally {
        setIsDataLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Check if session is persisted (simplified for demo)
    const sessionAdmin = sessionStorage.getItem('soes_admin');
    if (sessionAdmin === 'true') setIsAdmin(true);
  }, []);

  // --- Navigation Helpers ---

  const navigateTo = (page: string, eventId?: string) => {
    if (eventId) setSelectedEventId(eventId);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // --- Logic Helpers ---
  
  const getEventStats = (eventId: string, capacity?: number) => {
    const count = attendees.filter(a => a.eventId === eventId).length;
    // Strict check for capacity to avoid 0 being treated as false/undefined loosely
    const hasCapacityLimit = capacity !== undefined && capacity !== null;
    const isSoldOut = hasCapacityLimit ? count >= capacity : false;
    const spotsLeft = hasCapacityLimit ? capacity - count : null;
    const isUrgent = spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0;
    
    return { count, isSoldOut, spotsLeft, isUrgent };
  };

  // --- Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.user === 'admin' && loginForm.pass === 'admin321') {
      setIsAdmin(true);
      sessionStorage.setItem('soes_admin', 'true');
      navigateTo('admin-events');
    } else {
      alert('Credenciais inválidas!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('soes_admin');
    navigateTo('home');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await storage.saveSettings(settings);
    setIsLoading(false);
    setModalMode('settings_saved');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500kb limit safety
        alert("A imagem deve ter no máximo 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500kb limit safety
        alert("A imagem da logo deve ter no máximo 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Convert capacity to number or undefined if empty
    // Explicitly handle "empty string" or 0
    let capacityInt: number | undefined = undefined;
    if (eventForm.capacity !== undefined && eventForm.capacity.toString() !== '') {
         capacityInt = parseInt(eventForm.capacity.toString());
    }
    
    const eventToSave: Partial<Event> = { 
        ...eventForm, 
        capacity: capacityInt,
        // If creating new, generate ID if not present (though DB might handle it, we generate UUID for consistency)
        id: eventForm.id || crypto.randomUUID(),
        active: true
    };

    if (modalMode === 'create') {
        // Ensure required fields are present for TS
        if (eventToSave.title && eventToSave.date && eventToSave.location) {
             await storage.saveEvent(eventToSave);
        }
    } else if (modalMode === 'edit' && eventToSave.id) {
        await storage.saveEvent(eventToSave);
    }

    await refreshData();
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    setItemToDelete({ id, type: 'event' });
    setModalMode('delete_confirmation');
    setIsModalOpen(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    if (registerForm.email !== registerForm.confirmEmail) {
        alert("Os endereços de e-mail não coincidem. Por favor, verifique.");
        return;
    }
    
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent) return;

    // Concurrency check (fetching fresh data would be better, but local check first)
    const { isSoldOut } = getEventStats(selectedEvent.id, selectedEvent.capacity);
    if (isSoldOut) {
        alert("Desculpe, as vagas para este evento acabaram de se esgotar.");
        setIsModalOpen(false);
        return;
    }

    setIsLoading(true);

    const newAttendee: Partial<Attendee> = {
      id: crypto.randomUUID(),
      eventId: selectedEventId,
      fullName: registerForm.fullName!,
      email: registerForm.email!,
      phone: registerForm.phone!,
      company: registerForm.company!,
      registrationDate: new Date().toISOString(),
      syncedToCrm: false
    };

    // Simulate webhook call
    const synced = await webhookService.sendToAgendor(newAttendee as Attendee, selectedEvent, settings.webhookUrl);
    newAttendee.syncedToCrm = synced;

    await storage.saveAttendee(newAttendee);
    await refreshData();
    setIsLoading(false);
    
    setModalMode('success');
  };

  const handleSaveAttendeeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (modalMode === 'attendee_edit' && attendeeEditForm.id) {
        await storage.saveAttendee(attendeeEditForm);
    } else if (modalMode === 'attendee_create' && selectedEventId) {
        const event = events.find(e => e.id === selectedEventId);
        if (!event) return;

        const newAttendee: Partial<Attendee> = {
            id: crypto.randomUUID(),
            eventId: selectedEventId,
            fullName: attendeeEditForm.fullName!,
            email: attendeeEditForm.email!,
            phone: attendeeEditForm.phone!,
            company: attendeeEditForm.company!,
            registrationDate: new Date().toISOString(),
            syncedToCrm: false
        };

        const synced = await webhookService.sendToAgendor(newAttendee as Attendee, event, settings.webhookUrl);
        newAttendee.syncedToCrm = synced;

        await storage.saveAttendee(newAttendee);
    }
    
    await refreshData();
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const handleCancelRegistration = (id: string) => {
    setItemToDelete({ id, type: 'attendee' });
    setModalMode('delete_confirmation');
    setIsModalOpen(true);
  };

  const confirmDeletion = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    
    if (itemToDelete.type === 'event') {
        await storage.deleteEvent(itemToDelete.id);
        // Backend handles cascading delete of attendees usually, but good to refresh
    } else if (itemToDelete.type === 'attendee') {
         await storage.deleteAttendee(itemToDelete.id);
    }
    
    await refreshData();
    setIsLoading(false);
    setIsModalOpen(false);
    setItemToDelete(null);
  };

  const exportAttendees = (eventId: string) => {
    const eventAttendees = attendees.filter(a => a.eventId === eventId);
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Nome,Email,Telefone,Empresa,Data\n"
        + eventAttendees.map(e => `${e.fullName},${e.email},${e.phone},${e.company},${new Date(e.registrationDate).toLocaleDateString()}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inscritos.csv");
    document.body.appendChild(link);
    link.click();
  };

  // --- Render (mostly same as before, just using loading states) ---
  
  if (isDataLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Carregando sistema...</p>
              </div>
          </div>
      )
  }

  // --- Sub-Views ---

  const renderHome = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
          Próximos Eventos
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Confira nossa agenda e garanta sua vaga. Todos os nossos eventos são gratuitos e focados em networking e aprendizado.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {events.filter(e => e.active).map(event => {
          const { isSoldOut, isUrgent, spotsLeft } = getEventStats(event.id, event.capacity);
          
          return (
            <div key={event.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col group">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isSoldOut ? 'grayscale' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-gray-100">
                  Grátis
                </div>
                {isSoldOut && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg transform -rotate-6 border-2 border-white">Esgotado</span>
                  </div>
                )}
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-center text-sm text-gray-500 mb-2 gap-4">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(event.date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                
                {/* Urgency Message */}
                {isUrgent && !isSoldOut && (
                  <p className="text-orange-600 text-xs font-bold mb-2 flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} /> Restam apenas {spotsLeft} vagas!
                  </p>
                )}
                
                <p className="text-gray-600 mb-6 line-clamp-3 flex-grow text-sm">{event.description}</p>
                
                <Button 
                  onClick={() => navigateTo('event-detail', event.id)}
                  color={isSoldOut ? undefined : settings.primaryColor}
                  variant={isSoldOut ? 'secondary' : 'primary'}
                  disabled={isSoldOut}
                  className="w-full mt-auto"
                >
                  {isSoldOut ? 'Esgotado' : 'Detalhes e Inscrição'}
                </Button>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            Nenhum evento disponível no momento.
          </div>
        )}
      </div>
    </div>
  );

  const renderEventDetail = () => {
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return <div>Evento não encontrado</div>;

    const { isSoldOut, isUrgent, spotsLeft } = getEventStats(event.id, event.capacity);

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button onClick={() => navigateTo('home')} className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-2">
           &larr; Voltar para eventos
        </button>
        
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="h-64 sm:h-96 bg-gray-200 relative">
             {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.title} className={`w-full h-full object-cover ${isSoldOut ? 'grayscale filter brightness-75' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <ImageIcon size={64} />
                </div>
              )}
             {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-red-600/90 text-white px-8 py-3 rounded-xl font-black text-3xl uppercase tracking-widest shadow-2xl border-4 border-white transform -rotate-6">
                      Esgotado
                   </div>
                </div>
             )}
          </div>
          <div className="p-8 sm:p-12">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-8">
                <div>
                   <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
                   <div className="flex flex-wrap gap-4 text-gray-500 mt-2">
                      <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><Calendar size={16} /> {new Date(event.date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><MapPin size={16} /> {event.location}</span>
                   </div>
                </div>
                <div className="text-center sm:text-right">
                   <div className="text-sm text-gray-500 mb-1">Valor da inscrição</div>
                   <div className="text-2xl font-bold text-green-600">Grátis</div>
                </div>
             </div>

             <div className="prose prose-lg text-gray-600 mb-12">
               <h3 className="text-gray-900 font-semibold mb-4">Sobre o evento</h3>
               <p className="whitespace-pre-wrap">{event.description}</p>
             </div>

             <div className={`rounded-xl p-8 text-center transition-colors ${isSoldOut ? 'bg-gray-100' : 'bg-gray-50'}`}>
                
                {isSoldOut ? (
                    <>
                        <h3 className="text-xl font-bold text-gray-500 mb-2">Inscrições Encerradas</h3>
                        <p className="text-gray-400">Todas as vagas para este evento foram preenchidas.</p>
                    </>
                ) : (
                    <>
                        {isUrgent ? (
                            <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full font-bold text-sm animate-pulse">
                                <Ticket size={16} />
                                Atenção: Restam apenas {spotsLeft} vagas!
                            </div>
                        ) : (
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Garanta sua vaga agora</h3>
                        )}
                        
                        <p className="text-gray-500 mb-6">As vagas são limitadas. Inscreva-se gratuitamente preenchendo o formulário.</p>
                        
                        <Button 
                        onClick={() => {
                            setRegisterForm({});
                            setModalMode('register');
                            setIsModalOpen(true);
                        }}
                        color={settings.primaryColor}
                        className="mx-auto w-full sm:w-auto px-12 py-4 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                        >
                        Inscrever-se Grátis
                        </Button>
                    </>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogin = () => (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Acesso Administrativo</h2>
          <p className="text-sm text-gray-500 mt-2">Entre para gerenciar seus eventos</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={loginForm.user}
              onChange={e => setLoginForm({...loginForm, user: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={loginForm.pass}
              onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full py-2.5" color={settings.primaryColor}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );

  const renderAdminEvents = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Eventos</h2>
        <Button 
          onClick={() => {
            setEventForm({});
            setModalMode('create');
            setIsModalOpen(true);
          }}
          color={settings.primaryColor}
        >
          <Plus size={18} /> Novo Evento
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscritos / Cap.</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map(event => {
                const count = attendees.filter(a => a.eventId === event.id).length;
                const capacity = event.capacity;
                // Check undefined/null explicitly
                const hasCapacity = capacity !== undefined && capacity !== null;
                const isFull = hasCapacity ? count >= capacity : false;

                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      {isFull && <span className="text-xs text-red-600 font-bold">Esgotado</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isFull ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                {count}
                            </span>
                            <span className="text-gray-400">/</span>
                            <span>{hasCapacity ? capacity : '∞'}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button onClick={() => navigateTo('admin-attendees', event.id)} className="text-blue-600 hover:text-blue-900" title="Ver Inscritos">
                        <Users size={18} />
                      </button>
                      <button onClick={() => {
                        setEventForm(event);
                        setModalMode('edit');
                        setIsModalOpen(true);
                      }} className="text-indigo-600 hover:text-indigo-900" title="Editar">
                        <Edit size={18} />
                      </button>
                      <button type="button" onClick={() => handleDeleteEvent(event.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
            })}
             {events.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Nenhum evento criado.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAdminAttendees = () => {
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return null;
    const eventAttendees = attendees.filter(a => a.eventId === event.id);

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button onClick={() => navigateTo('admin-events')} className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-2">
           &larr; Voltar para Eventos
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-gray-800">Inscritos: {event.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Total: {eventAttendees.length} {event.capacity ? `/ ${event.capacity}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportAttendees(event.id)}>
              <Download size={16} /> CSV
            </Button>
            <Button 
                onClick={() => {
                    setAttendeeEditForm({});
                    setModalMode('attendee_create');
                    setIsModalOpen(true);
                }}
                color={settings.primaryColor}
            >
                <UserPlus size={16} /> Adicionar Manualmente
            </Button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRM</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventAttendees.map(att => (
                <tr key={att.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{att.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {att.syncedToCrm ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Sincronizado</span>
                    ) : (
                        <span className="text-yellow-600 flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <button type="button" onClick={() => {
                        setAttendeeEditForm(att);
                        setModalMode('attendee_edit');
                        setIsModalOpen(true);
                    }} className="text-indigo-600 hover:text-indigo-900">
                        <Edit size={16} />
                    </button>
                    <button type="button" onClick={() => handleCancelRegistration(att.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                        <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
               {eventAttendees.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhum inscrito ainda.</td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">Configurações do Sistema</h2>
      <div className="bg-white shadow rounded-xl p-8 border border-gray-100">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do App</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={settings.appName}
                  onChange={e => setSettings({...settings, appName: e.target.value})}
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária (Hex)</label>
                <div className="flex gap-2">
                    <input 
                    type="color" 
                    className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    />
                    <input 
                    type="text" 
                    className="flex-1 px-3 py-2 border rounded-md uppercase"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    />
                </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo do App</label>
            <div className="flex flex-col gap-3">
                {settings.logoUrl && (
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                        <img src={settings.logoUrl} alt="Logo Preview" className="h-12 w-auto object-contain" />
                        <button 
                            type="button" 
                            onClick={() => setSettings({...settings, logoUrl: ''})}
                            className="text-red-500 text-sm hover:underline"
                        >
                            Remover Logo
                        </button>
                    </div>
                )}
                
                <div className="flex items-center gap-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                <input 
                type="text" 
                className="w-full px-3 py-2 border rounded-md text-sm text-gray-600"
                placeholder="Ou cole a URL de uma imagem..."
                value={settings.logoUrl || ''}
                onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                />
                <p className="text-xs text-gray-500">Recomendado: PNG transparente, máx 500KB.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Integrações</h3>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook CRM (Agendor)</label>
                <input 
                  type="url" 
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="https://api.agendor.com.br/webhook/..."
                  value={settings.webhookUrl || ''}
                  onChange={e => setSettings({...settings, webhookUrl: e.target.value})}
                />
                 <p className="text-xs text-gray-500 mt-1">Os dados dos inscritos serão enviados via POST para esta URL.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} color={settings.primaryColor}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <Layout 
        settings={settings} 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
        currentPage={currentPage}
        onNavigate={navigateTo}
    >
      {currentPage === 'home' && renderHome()}
      {currentPage === 'event-detail' && renderEventDetail()}
      {currentPage === 'login' && renderLogin()}
      {isAdmin && currentPage === 'admin-events' && renderAdminEvents()}
      {isAdmin && currentPage === 'admin-attendees' && renderAdminAttendees()}
      {isAdmin && currentPage === 'admin-settings' && renderSettings()}

      {/* --- Global Modals --- */}
      
      {/* Event Create/Edit Modal */}
      <Modal 
        isOpen={isModalOpen && (modalMode === 'create' || modalMode === 'edit')} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Novo Evento' : 'Editar Evento'}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Evento</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-md" value={eventForm.title || ''} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input required type="datetime-local" className="w-full px-3 py-2 border rounded-md" value={eventForm.date || ''} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-md" value={eventForm.location || ''} onChange={e => setEventForm({...eventForm, location: e.target.value})} />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Máxima de Inscrições</label>
                <input 
                    type="number" 
                    min="1"
                    className="w-full px-3 py-2 border rounded-md" 
                    placeholder="Deixe em branco para ilimitado"
                    // Handle the value carefully: undefined/null -> '', number -> number
                    value={eventForm.capacity ?? ''} 
                    onChange={e => {
                        const val = e.target.value;
                        setEventForm({
                            ...eventForm, 
                            capacity: val === '' ? undefined : parseInt(val)
                        })
                    }} 
                />
                 <p className="text-xs text-gray-500 mt-1">Limite opcional para controlar as vagas.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capa do Evento</label>
                <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
                {eventForm.imageUrl && <img src={eventForm.imageUrl} alt="Preview" className="h-20 w-auto mt-2 rounded border" />}
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Descrição</label>
                </div>
                <textarea rows={4} className="w-full px-3 py-2 border rounded-md" value={eventForm.description || ''} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
            </div>
            <Button type="submit" className="w-full" color={settings.primaryColor} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Evento'}
            </Button>
        </form>
      </Modal>

      {/* Registration Modal */}
      <Modal 
        isOpen={isModalOpen && modalMode === 'register'} 
        onClose={() => setIsModalOpen(false)}
        title="Inscrição no Evento"
      >
        <form onSubmit={handleRegister} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-md" value={registerForm.fullName || ''} onChange={e => setRegisterForm({...registerForm, fullName: e.target.value})} />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input required type="email" className="w-full px-3 py-2 border rounded-md" value={registerForm.email || ''} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar E-mail</label>
                <input 
                    required 
                    type="email" 
                    className={`w-full px-3 py-2 border rounded-md ${registerForm.email && registerForm.confirmEmail && registerForm.email !== registerForm.confirmEmail ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={registerForm.confirmEmail || ''} 
                    onChange={e => setRegisterForm({...registerForm, confirmEmail: e.target.value})} 
                    onPaste={(e) => {
                        e.preventDefault();
                        alert('Por favor, digite o e-mail novamente para confirmar.');
                    }}
                    placeholder="Digite o e-mail novamente"
                />
                {registerForm.email && registerForm.confirmEmail && registerForm.email !== registerForm.confirmEmail && (
                    <p className="text-xs text-red-500 mt-1">Os e-mails não coincidem.</p>
                )}
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input required type="tel" className="w-full px-3 py-2 border rounded-md" value={registerForm.phone || ''} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-md" value={registerForm.company || ''} onChange={e => setRegisterForm({...registerForm, company: e.target.value})} />
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} color={settings.primaryColor}>
                {isLoading ? 'Processando...' : 'Confirmar Inscrição'}
            </Button>
            <p className="text-xs text-center text-gray-500 mt-2">Seus dados serão enviados para a organização do evento.</p>
        </form>
      </Modal>

      {/* Edit/Create Attendee Modal */}
      <Modal 
        isOpen={isModalOpen && (modalMode === 'attendee_edit' || modalMode === 'attendee_create')} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'attendee_create' ? 'Adicionar Participante' : 'Editar Participante'}
      >
          <form onSubmit={handleSaveAttendeeAdmin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-md" value={attendeeEditForm.fullName || ''} onChange={e => setAttendeeEditForm({...attendeeEditForm, fullName: e.target.value})} />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input required type="email" className="w-full px-3 py-2 border rounded-md" value={attendeeEditForm.email || ''} onChange={e => setAttendeeEditForm({...attendeeEditForm, email: e.target.value})} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input required type="tel" className="w-full px-3 py-2 border rounded-md" value={attendeeEditForm.phone || ''} onChange={e => setAttendeeEditForm({...attendeeEditForm, phone: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-md" value={attendeeEditForm.company || ''} onChange={e => setAttendeeEditForm({...attendeeEditForm, company: e.target.value})} />
                </div>
            </div>
            <Button type="submit" className="w-full" color={settings.primaryColor} disabled={isLoading}>
                {modalMode === 'attendee_create' ? 'Adicionar Inscrito' : 'Salvar Alterações'}
            </Button>
          </form>
      </Modal>
      
      {/* Success Modal */}
      <Modal 
        isOpen={isModalOpen && modalMode === 'success'} 
        onClose={() => {
            setIsModalOpen(false);
            navigateTo('home');
        }}
        title="Sucesso"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Inscrição Confirmada!</h3>
            <p className="text-gray-600 mb-6">Sua vaga está garantida. Enviamos um e-mail com todos os detalhes do evento.</p>
            <Button 
                onClick={() => {
                    setIsModalOpen(false);
                    navigateTo('home');
                }}
                color={settings.primaryColor}
                className="w-full"
            >
                Entendi
            </Button>
        </div>
      </Modal>

      {/* Settings Saved Modal */}
      <Modal 
        isOpen={isModalOpen && modalMode === 'settings_saved'} 
        onClose={() => setIsModalOpen(false)}
        title="Sucesso"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Configurações Salvas!</h3>
            <p className="text-gray-600 mb-6">As alterações no sistema foram aplicadas com sucesso.</p>
            <Button 
                onClick={() => setIsModalOpen(false)}
                color={settings.primaryColor}
                className="w-full"
            >
                Fechar
            </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isModalOpen && modalMode === 'delete_confirmation'} 
        onClose={() => setIsModalOpen(false)}
        title="Confirmar Exclusão"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tem certeza?</h3>
            <p className="text-gray-600 mb-6">
                {itemToDelete?.type === 'event' 
                    ? 'Você está prestes a excluir este evento e todos os seus inscritos. Esta ação não pode ser desfeita.' 
                    : 'Você está prestes a remover este inscrito. Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex gap-3 w-full">
                <Button 
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                >
                    Cancelar
                </Button>
                <Button 
                    variant="danger"
                    onClick={confirmDeletion}
                    className="flex-1"
                    disabled={isLoading}
                >
                    {isLoading ? 'Excluindo...' : 'Excluir'}
                </Button>
            </div>
        </div>
      </Modal>

    </Layout>
  );
}