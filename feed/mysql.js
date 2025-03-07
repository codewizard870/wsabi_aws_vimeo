const fastXmlParser = require('fast-xml-parser');
const AWS = require('aws-sdk');
const axios = require('axios');
const mysql = require('mysql2/promise');

const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3Bucket = 'reallifenetwork';
const s3FolderName = 'drop/standontheword/';

const xmlPath = 'https://bible.frc.org/rss/SOTW/feed.xml';
const series_id = 688;
let iSkip = 0;
let iSuccess = 0;
let iFailed = 0;

async function uploadFile(url, type, folderName) {
  console.log('upload file:' + url + '\n');
  try {
    const response = await axios({
      url: url,
      responseType: 'stream',
    });

    const contentType = response.headers['content-type'];

    if (type === 'image') {
      s3Key = folderName + uuidv4() + '.jpg';
    } else {
      s3Key = folderName + uuidv4() + '.mp4';
    }

    const params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: response.data,
      ACL: 'public-read',
      ContentType: contentType,
    };

    const data = await s3.upload(params).promise();
    console.log('uploaded', data.Location);
    return data.Location;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
}

const readList = async () => {
  console.log('reading list');

  const { data: result } = await axios.get(xmlPath);
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '',
  };
  const parser = new fastXmlParser.XMLParser(options);
  const jsonObj = parser.parse(result);
  console.log(jsonObj);
  const lists = jsonObj.rss.channel.item;
  const iStart = 0;
  const iEnd = lists.length;
  console.log(lists.length);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  for (let i = 0; i < iEnd; i++) {
    try {
      const list = lists[i];
      try {
        const [rows] = await connection.execute(
          `SELECT * from videos where title='${list.title}'`
        );

        console.log(
          list.title,
          list.enclosure.length,
          rows[0].id,
          rows[0].title,
          rows[0].duration
        );

        if (rows.length > 0) {
          console.log('skipping');
          iSkip++;
          continue;
        }
      } catch (e) {
        console.log('error', i, e);
      }

      const url = await uploadFile(list.enclosure.url, 'video', s3FolderName);

      let release_date = list.pubDate;
      const weekdays = {
        Tues: 'Tue',
        Weds: 'Wed',
        Thur: 'Thu',
        Frid: 'Fri',
        Satu: 'Sat',
        Sund: 'Sun',
        Mond: 'Mon',
      };

      // Replace each 4-letter weekday abbreviation
      Object.keys(weekdays).forEach((fourLetter) => {
        const threeLetter = weekdays[fourLetter];
        release_date = release_date.replace(
          new RegExp(fourLetter, 'g'),
          threeLetter
        );
      });
      console.log(list.pubDate, release_date);

      const params = {
        title: list.title,
        short_description: list.description,
        url: url,
        video_type: 'mp4',
        quality: 'FHD',
        duration: list.enclosure.length,
        thumbnail:
          'https://reallifenetwork.s3.amazonaws.com/drop/standontheword/5071540281706392602_20240826173336.jpg',
        release_date: release_date,
        series_id: series_id,
        approved: 1,
      };
      console.log(params);

      try {
        const [seasons] = await connection.execute(
          `SELECT * from seasons where series_id = ${series_id}`
        );

        const query = `
        INSERT INTO videos (title, short_description, url, video_type, quality, duration, thumbnail, release_date, series_id, approved, season_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          params.title,
          params.short_description,
          params.url,
          params.video_type,
          params.quality,
          params.duration,
          params.thumbnail,
          params.release_date,
          params.series_id,
          params.approved,
          seasons[0].id,
          Date.now(),
          Date.now(),
        ];
        const [result] = await connection.execute(query, values);
        console.log(i, params.title + ' success');
        iSuccess++;
      } catch (error) {
        console.log('Creation Error: ', error);
        throw new Error(error);
      }
    } catch (e) {
      console.log('error at ', i + ' \n');
      iFailed++;
    }
    console.log('current index', i, lists[i].title);
  }

  console.log('success: ' + iSuccess);
  console.log('failed: ' + iFailed);
  console.log('skip :' + iSkip);
  process.exit(1);
};

readList();
