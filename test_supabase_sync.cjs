const https = require('https');

const apiKey = 'sb_publishable_g3dzrIJkPdEPu4Aw7LxsnA_hpQIo5Qw';
const bizId = '47a2d807-bcee-4414-90ce-e0faa5a121d1';
const staffId = 'cf06f1de-115a-425b-b836-6e24c8eb2f64';

const testPayload = JSON.stringify({
  business_id: bizId,
  assigned_to: staffId,
  created_by: staffId,
  title: 'Cloud Sync Direct POST Test ' + new Date().toLocaleTimeString(),
  priority: 'medium',
  status: 'pending',
  due_date: new Date().toISOString().slice(0,10)
});

const req = https.request('https://uxkimcabvvgbrdpkvond.supabase.co/rest/v1/tasks', {
  method: 'POST',
  headers: {
    'apikey': apiKey,
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('INSERT HTTP STATUS:', res.statusCode);
    console.log('INSERT RESPONSE DATA:', data);
  });
});

req.on('error', (err) => console.error('INSERT ERROR:', err));
req.write(testPayload);
req.end();
