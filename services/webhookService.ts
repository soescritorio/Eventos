import { Attendee, Event } from '../types';

export const sendToAgendor = async (attendee: Attendee, event: Event, webhookUrl?: string): Promise<boolean> => {
  if (!webhookUrl) {
    console.log('[CRM] Webhook URL not configured. Skipping sync.');
    return false;
  }

  const payload = {
    action: 'new_lead',
    lead: {
      name: attendee.fullName,
      email: attendee.email,
      phone: attendee.phone,
      company: attendee.company,
      origin: 'SOES App',
      note: `Inscrito no evento: ${event.title} em ${event.date}`
    }
  };

  try {
    console.log(`[CRM] Sending data to ${webhookUrl}`, payload);
    
    // In a real scenario, we would await the fetch. 
    // For this demo, we simulate a successful POST request.
    // const response = await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    // return response.ok;

    // Simulating delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return true; 
  } catch (error) {
    console.error('[CRM] Sync failed', error);
    return false;
  }
};
