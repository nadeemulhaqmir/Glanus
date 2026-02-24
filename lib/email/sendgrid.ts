import { logError, logInfo, logWarn } from '@/lib/logger';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment variables
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    logWarn('SENDGRID_API_KEY is not set. Emails will be logged to console only.');
}

type EmailData = {
    to: string;
    subject: string;
    html: string;
    text?: string; // Optional plain text version
};

export const sendEmail = async (data: EmailData): Promise<void> => {
    if (!process.env.SENDGRID_API_KEY) {
        logInfo('Mock email send (no SendGrid key configured)', {
            to: data.to,
            subject: data.subject,
            htmlPreview: data.html.substring(0, 100),
        });
        return;
    }

    const msg = {
        to: data.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@glanus.com', // Must be verified sender
        subject: data.subject,
        html: data.html,
        text: data.text || data.html.replace(/<[^>]*>?/gm, ''), // Simple strip tags fallback
    };

    try {
        await sgMail.send(msg);
    } catch (error: any) {
        logError('Email send error', error);
        if (error.response) {
            logError('Email API response error', error.response.body);
        }
        // We might want to throw or handle silently depending on requirements
        // For now, let's throw so the caller knows it failed
        throw new Error('Failed to send email');
    }
};
