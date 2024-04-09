import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import readline from 'readline';

const TOKEN_PATH = 'token.json';

async function authorize(credentials: any): Promise<OAuth2Client> {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = await fs.readFile(TOKEN_PATH);
    oauth2Client.setCredentials(JSON.parse(token.toString()));
    return oauth2Client;
  } catch (err) {
    return getNewToken(oauth2Client);
  }
}

async function getNewToken(oauth2Client: OAuth2Client): Promise<OAuth2Client> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/photoslibrary.readonly'],
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const code = await new Promise<string>((resolve) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(code);
    });
  });
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token stored to', TOKEN_PATH);
  return oauth2Client;
}

async function listLatestPhoto(auth: OAuth2Client) {
  const service = google.photoslibrary({ version: 'v1', auth });
  try {
    const res = await service.mediaItems.search({
      requestBody: {
        pageSize: 1,
      },
    });
    const items = res.data.mediaItems;
    if (items.length) {
      console.log('Latest photo:');
      items.forEach((item) => {
        console.log(`${item.filename} (${item.mediaMetadata.creationTime})`);
      });
    } else {
      console.log('No photos found.');
    }
  } catch (err) {
    console.log('The API returned an error: ' + err);
  }
}

async function main() {
  const content = await fs.readFile('credentials.json');
  const auth = await authorize(JSON.parse(content.toString()));
  await listLatestPhoto(auth);
}

main().catch(console.error);