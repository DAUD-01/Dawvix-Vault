import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

async function test() {
  const form = new FormData();
  form.append('files', Buffer.from('hello world'), 'test.txt');
  
  try {
    const res = await axios.post('http://localhost:5000/api/drive/upload', form, {
      headers: form.getHeaders()
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

test();
