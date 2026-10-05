import fs from 'fs';
import { getGoogleDriveClient } from './dist/config/googleDrive.js';
import { PassThrough } from 'stream';

const test = async () => {
  const drive = getGoogleDriveClient();
  const fileBuffer = Buffer.from('Hello world this is a test file');
  
  const bufferStream = new PassThrough();
  bufferStream.end(fileBuffer);
  
  const fileMetadata = {
    name: 'test_upload_passthrough.txt',
    parents: ['root'],
  };
  
  const media = {
    mimeType: 'text/plain',
    body: bufferStream,
  };
  
  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
      supportsAllDrives: true,
    });
    console.log('Upload success:', response.data);
  } catch (err) {
    console.error('Upload error:', err.message);
  }
};

test();
