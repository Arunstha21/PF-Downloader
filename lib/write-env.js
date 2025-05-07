const fs = require('fs');
require('dotenv').config();

const envData = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
};

fs.writeFileSync('dist-electron/env.json', JSON.stringify(envData));