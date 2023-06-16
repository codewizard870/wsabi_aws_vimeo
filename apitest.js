const axios = require('axios');

const host = 'http://localhost:8000';
// const host = 'https://login.reallifenetwork.com'

console.log('Script start');

const title = 'Movieguideddd';

async function main() {
  try {
    const resp = await axios.get(
      `${host}/api/video/getbytitled?title=${title}`
    );

    console.log('res', resp.data);
  } catch (error) {
    
  }
}

main();
