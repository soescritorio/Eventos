import { Event, Attendee, AppSettings, DEFAULT_SETTINGS } from '../types';

const API_BASE = './api';

// --- Events ---

export const getEvents = async (): Promise<Event[]> => {
  try {
    const response = await fetch(`${API_BASE}/events.php`);
    if (!response.ok) throw new Error('Failed to fetch events');
    const data = await response.json();
    return data.map((e: any) => ({
      ...e,
      active: e.active === 1 || e.active === true, // SQLite stores bools as 0/1
      capacity: e.capacity ? Number(e.capacity) : undefined
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const saveEvent = async (event: Partial<Event>): Promise<Event> => {
  const response = await fetch(`${API_BASE}/events.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  if (!response.ok) throw new Error('Failed to save event');
  return await response.json();
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/events.php?id=${id}`, {
    method: 'DELETE',
  });
  return response.ok;
};

// --- Attendees ---

export const getAttendees = async (eventId?: string): Promise<Attendee[]> => {
  try {
    let url = `${API_BASE}/attendees.php`;
    if (eventId) url += `?eventId=${eventId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch attendees');
    const data = await response.json();
    return data.map((a: any) => ({
        ...a,
        syncedToCrm: a.syncedToCrm === 1 || a.syncedToCrm === true
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const saveAttendee = async (attendee: Partial<Attendee>): Promise<Attendee> => {
  const response = await fetch(`${API_BASE}/attendees.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attendee)
  });
  if (!response.ok) throw new Error('Failed to save attendee');
  return await response.json();
};

export const deleteAttendee = async (id: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE}/attendees.php?id=${id}`, {
      method: 'DELETE',
    });
    return response.ok;
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const response = await fetch(`${API_BASE}/settings.php`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    const data = await response.json();
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_SETTINGS, ...data };
  } catch (error) {
    console.error(error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/settings.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return response.ok;
};
