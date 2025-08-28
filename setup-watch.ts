// setup-watch.ts
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function setupGmailWatch() {
    // Make sure to add this URL to your environment variables
    const webhookUrl = process.env.GMAIL_WEBHOOK_URL; 
    if (!webhookUrl) {
        console.error('Error: GMAIL_WEBHOOK_URL environment variable is not set.');
        return;
    }

    console.log('Setting up Google authentication...');
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth });

    try {
        console.log(`Subscribing to inbox notifications. Your webhook URL is: ${webhookUrl}`);
        const response = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                // The labelId 'INBOX' is a good start. Can be refined.
                labelIds: ['INBOX', 'SPAM'],
                // This is the public URL of the API endpoint you created in Step 1
                topicName: webhookUrl, 
            },
        });

        console.log('Successfully subscribed to Gmail push notifications!');
        console.log('Response:', response.data);
        console.log('IMPORTANT: This subscription will expire. You may need to run this script again periodically (e.g., every 6 days).');
    } catch (error: any) {
        console.error('Failed to set up Gmail watch:', error.message);
    }
}

setupGmailWatch();