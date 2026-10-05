import fs from 'fs';
import { getGoogleDriveClient } from './dist/config/googleDrive.js';

const test = async () => {
  const drive = getGoogleDriveClient();
  fs.writeFileSync('test_local_file.txt', 'Hello world');
  
  const fileMetadata = {
    name: 'test_upload_fs.txt',
    parents: ['root'],
  };
  
  const media = {
    mimeType: 'text/plain',
    body: fs.createReadStream('test_local_file.txt'),
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
