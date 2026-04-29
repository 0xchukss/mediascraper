const axios = require('axios');

async function test() {
  const API_KEY = 'e4o9c5nwFUdXtukJHz7L9kgQHcG0fHgWJ8KFvM2r';
  const query = 'vintage car';
  const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${API_KEY}&rows=5`;

  try {
    const response = await axios.get(url);
    console.log('Status:', response.status);
    console.log('Total results:', response.data.response.rowCount);
    console.log('First result title:', response.data.response.rows[0]?.title);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
    process.exit(1);
  }
}

test();
