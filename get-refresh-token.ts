import { google } from 'googleapis';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:9002/api/auth/callback/google'  // This MUST match the URI you set in the Cloud Console
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get a refresh token
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:\n');
  console.log(authorizeUrl);
  console.log('\n----------------------------------------\n');

  rl.question('Enter the code from that page here: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      console.log('\nTokens acquired:');
      console.log(tokens);

      if (tokens.refresh_token) {
        console.log('\n✅ SUCCESS! Here is your Refresh Token!');
        console.log('Copy the line below and add it to your .env file as GOOGLE_REFRESH_TOKEN\n');
        console.log('----------------------------------------');
        console.log(tokens.refresh_token);
        console.log('----------------------------------------');
      } else {
        console.log('\n❌ ERROR: No refresh token was returned. Make sure you are using an OAuth Client ID for a "Web application" and that you haven\'t authorized it before. You may need to revoke access in your Google account settings and try again.');
      }
    } catch (e: any) {
      console.error('Error while trying to retrieve access token', e.message);
    }
  });
}

main().catch(console.error);