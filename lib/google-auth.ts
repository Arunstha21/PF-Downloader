import { BrowserWindow } from 'electron';
import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { URL } from 'url';

// OAuth 2.0 client ID information
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const REDIRECT_URI = 'http://localhost:3001/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
    ];

// Token storage path
const TOKEN_PATH = path.join(app.getPath('userData'), 'google-token.json');

// Create OAuth client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};

// Get token from storage
const getStoredToken = async () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const token = await fs.readJSON(TOKEN_PATH);
      return token;
    }
  } catch (error) {
    console.error('Error reading stored token:', error);
  }
  return null;
};

// Store token
interface Token {
    access_token?: string | null;
    refresh_token?: string | null;
    scope?: string;
    token_type?: string | null;
    expiry_date?: number | null;
}

const storeToken = async (token: Token): Promise<void> => {
    try {
        await fs.writeJSON(TOKEN_PATH, token);
        console.log('Token stored to:', TOKEN_PATH);
    } catch (error) {
        console.error('Error storing token:', error);
    }
};

// Get authenticated OAuth client
export const getAuthClient = async (forceNewToken = false): Promise<OAuth2Client> => {
  const oAuth2Client = createOAuth2Client();
  
  // If we're forcing a new token or don't have one stored, get a new one
  if (forceNewToken) {
    return getNewToken(oAuth2Client);
  }
  
  // Try to use stored token
  const token = await getStoredToken();
  if (token) {
    oAuth2Client.setCredentials(token);
    
    // Check if token is expired and refresh if needed
    if (token.expiry_date && token.expiry_date < Date.now()) {
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        if (credentials.access_token) {
            await storeToken(credentials as Token);
        } else {
            console.error('Error: access_token is undefined');
        }
        oAuth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Error refreshing token:', error);
        return getNewToken(oAuth2Client);
      }
    }
    
    return oAuth2Client;
  }
  
  // No token found, get a new one
  return getNewToken(oAuth2Client);
};

// Get new token via OAuth flow
const getNewToken = (oAuth2Client: OAuth2Client): Promise<OAuth2Client> => {
    return new Promise((resolve, reject) => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
      });
  
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
  
      authWindow.loadURL(authUrl);
  
      const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/oauth2callback')) {
          const query = new URL(req.url, 'http://localhost:3001').searchParams;
          const code = query.get('code');
  
          res.end('✅ Authentication successful. You can now close this window.');
          server.close();
          authWindow.close();
  
          try {
            const { tokens } = await oAuth2Client.getToken(code || '');
            oAuth2Client.setCredentials(tokens);
            await storeToken(tokens);
            resolve(oAuth2Client); // ✅ resolves with correct type
          } catch (err) {
            reject(err);
          }
        }
      });
  
      server.listen(3001);
    });
  };
  

// Sign out - clear stored token
export const signOut = async () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      await fs.unlink(TOKEN_PATH);
      return { success: true };
    }
    return { success: true, message: 'No token found' };
  } catch (error : any) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is signed in
export const isSignedIn = async () => {
  const token = await getStoredToken();
  return !!token;
};

// Get user info
export const getUserInfo = async () => {
    try {
        const auth = await getAuthClient();
        const oauth2 = google.oauth2({
          auth: auth as OAuth2Client,
          version: 'v2',
        });
    
        const { data: user } = await oauth2.userinfo.get();
    
        if (!user || !user.email) {
          throw new Error('User info not found or incomplete.');
        }
    
        return {
          success: true,
          user,
        };
      } catch (error: any) {
        console.error('❌ Failed to retrieve user info:', error?.message || error);
        return {
          success: false,
          error: error?.message || 'Unknown error occurred while fetching user info.',
        };
      }
};

