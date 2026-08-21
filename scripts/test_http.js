const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length, contentType: res.headers['content-type'] });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  const root = await testEndpoint('/');
  const customers = await testEndpoint('/api/sales/customers');
  console.log('App root status:', root);
  console.log('Customers API status:', customers);
}

run();
