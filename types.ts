export interface Attendee {
  id: string;
  eventId: string;
  fullName: string;
  phone: string;
  email: string;
  company: string;
  registrationDate: string; // ISO string
  syncedToCrm: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl?: string;
  capacity?: number;
  active: boolean;
}

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  webhookUrl?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'SOES Eventos',
  primaryColor: '#ec4899', // Default pink-500 similar to Sympla
  webhookUrl: '',
};
