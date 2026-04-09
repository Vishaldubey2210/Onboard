const axios = require('axios');
require('dotenv').config({path: './.env'});
axios.get('https://api.groq.com/openai/v1/models', {
  headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
}).then(res => {
  console.log(res.data.data.map(m => m.id).join('\n'));
}).catch(console.error);
