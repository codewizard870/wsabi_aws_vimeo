const AWS = require('aws-sdk');
const axios = require('axios');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');
const items = require('./update-axioserror.json');

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: '',
  secretAccessKey: '',
  useAccelerateEndpoint: true,
});
const s3Bucket = 'reallifenetwork';

async function uploadFile(url, type, folderName) {
  console.log('Upload starting ...');
  console.log(`url: ${url}`);
  console.log(`type: ${type}`);
  console.log(`s3 folder: ${folderName} \n`);
  try {
    const response = await axios({
      url: url,
      responseType: 'stream',
    });

    const contentType = response.headers['content-type'];

    if (type === 'image') {
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.jpg';
    } else {
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.mp4';
    }

    const params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: response.data,
      ACL: 'public-read',
      ContentType: contentType,
    };

    if (type === 'image') {
      console.log('Uploading image to s3...');
    } else {
      console.log('Uploading video to s3. It will take some timme ...');
    }
    const data = await s3.upload(params).promise();
    console.log(
      `File uploaded successfully. File location: ${data.Location}\n`
    );
    return data.Location;
  } catch (error) {
    console.error(error);
    return 'error';
  }
}
///////////////////////////////////////

console.log('Script start');

// you can chage database setting here
const connection = mysql.createConnection({
  host: '146.190.220.218',
  user: 'dev_user',
  password: '*b#-UpZj*RP)',
  database: 'dev_reallife_admin',
});
console.log('database connection success..');

async function main() {
  try {
    for (let i = 0; i < items.length; i++) {
      console.log('\nVideo ID =========>', items[i].id);

      // upload video
      const videoURL = await uploadFile(
        items[i].url,
        'video',
        items[i].folder_name
      );

      if (videoURL === 'error') {
        throw new Error('upload error');
      } else {
        // update database
        query = `UPDATE videos SET url=${videoURL},duration=${items[i].duration} WHERE id = ${items[0].id}`;

        const result = await asyncQuery(connection, query);

        console.log('============', result);
      }
    }
  } catch (error) {
    console.log('-----------error-----------\n', error);
  }
}

async function asyncQuery(conn, query) {
  return new Promise((resolve, reject) => {
    conn.query(query, function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// main();
