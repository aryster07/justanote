// Email service using EmailJS (free, no backend required)
// Sign up at https://www.emailjs.com/ and get your keys

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_46vg54o';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
const EMAILJS_DELIVERED_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_DELIVERED_TEMPLATE || 'YOUR_DELIVERED_TEMPLATE';
const EMAILJS_VIEWED_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VIEWED_TEMPLATE || 'YOUR_VIEWED_TEMPLATE';

interface EmailParams {
  [key: string]: string;
}

async function sendEmail(templateId: string, params: EmailParams): Promise<boolean> {
  // Check if EmailJS is configured
  if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('EmailJS is not configured. Set environment variables to enable email notifications.');
    console.log('Would send email with params:', params);
    return true; // Return true so app doesn't break
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: params,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send notification to sender that their note was delivered to the recipient
 * Note: recipientName may be a generic placeholder if encrypted
 */
export async function sendDeliveredNotification(
  senderEmail: string,
  recipientName: string,
  recipientInstagram: string
): Promise<boolean> {
  const instagramHandle = recipientInstagram ? `@${recipientInstagram.replace('@', '')}` : '';

  return sendEmail(EMAILJS_DELIVERED_TEMPLATE_ID, {
    to_email: senderEmail,
    recipient_name: recipientName,
    recipient_instagram: instagramHandle,
    subject: `Your heartfelt note has been delivered! 💌`,
    message: instagramHandle
      ? `Great news! Your heartfelt note has been delivered to ${instagramHandle} via Instagram DM. They can now view your special message! 💕`
      : `Great news! Your heartfelt note has been delivered. They can now view your special message! 💕`,
  });
}

/**
 * Send notification to sender that recipient opened their note
 */
export async function sendViewedNotification(
  senderEmail: string,
  recipientName: string,
  viewLink: string
): Promise<boolean> {
  return sendEmail(EMAILJS_VIEWED_TEMPLATE_ID, {
    to_email: senderEmail,
    recipient_name: recipientName,
    view_link: viewLink,
    subject: `${recipientName} opened your heartfelt note! 💖`,
  });
}
