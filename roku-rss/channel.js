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
const channelName = 'RLN-NEWS';
const s3FolderName = 'drop/RLN-NEWS-CHANNEL/';

const feedPath =
  'https://ga-prod-api.powr.tv/roku-rss.json?__site=reallifenetwork&thumbWidth=1920&thumbHeight=1080&thumbCrop=1&format=mp4&seriesPosters=true&allContent=true&includeChannels=true&includeAccessType=true';
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
  const { data: jsonObj } = await axios.get(feedPath);

  const lists = jsonObj.shortFormVideos;
  const iStart = 0;
  const iEnd = lists.length;
  console.log(lists.length);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [channelIds] = await connection.execute(
    `SELECT * from channel where channel_name='${channelName}'`
  );
  const channelId = channelIds[0].id;
  console.log('channel id: ', channelId);

  for (let i = 0; i < iEnd; i++) {
    try {
      const list = lists[i];
      try {
        const [rows] = await connection.execute(
          `SELECT * from videos where source_id="${list.id}"`
        );

        console.log(list.title, rows[0].id, rows[0].title);
        if (rows.length > 0) {
          console.log('skipping');
          iSkip++;
          continue;
        }
      } catch (e) {
        console.log('not found', i, list.title);
        console.log(e);
      }

      console.log('uploading video');
      const videoUrl = '';
      const thumbnailUrl = '';
      // const videoUrl = await uploadFile(
      //   list.content.videos[0].url,
      //   'video',
      //   s3FolderName
      // );
      // console.log("uploading thumbnail")
      // const thumbnailUrl = await uploadFile(
      //   list.thumbnail,
      //   'image',
      //   s3FolderName
      // );

      let release_date = list.releaseDate;
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
      console.log(list.releaseDate, release_date);

      const params = {
        title: list.title,
        short_description: list.shortDescription,
        url: videoUrl,
        video_type: list.content.videos[0].videoType,
        quality: list.content.videos[0].quality,
        duration: list.content.duration,
        thumbnail: thumbnailUrl,
        release_date: release_date,
        channel_id: channelId,
        approved: 1,
        source_id: list.id,
      };
      console.log(params);

      try {
        const query = `
        INSERT INTO videos (title, short_description, url, video_type, quality, duration, thumbnail, release_date, channel_id, approved, source_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const timestamp = new Date(Date.now())
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ');

        const values = [
          params.title,
          params.short_description,
          params.url,
          params.video_type,
          params.quality,
          params.duration,
          params.thumbnail,
          params.release_date,
          params.channel_id,
          params.approved,
          params.source_id,
          timestamp,
          timestamp,
        ];
        const [result] = await connection.execute(query, values);
        console.log(result.insertId);

        for (let j = 0; j < list.tags.length; j++) {
          if (!list.tags[j]) continue;

          let tagId = undefined;
          const [tagResult] = await connection.execute(
            `SELECT * from tags where name="${list.tags[j]}"`
          );
          if (tagResult.length > 0) {
            tagId = tagResult[0].id;
          } else {
            const [tagInsert] = await connection.execute(`
              INSERT INTO tags (name, created_at, updated_at) VALUES("${list.tags[j]}", "${timestamp}", "${timestamp}")
            `);
            tagId = tagInsert.insertId;
          }
          console.log(tagId);
          if (tagId) {
            await connection.execute(`
              INSERT INTO video_tag (video_id, tag_id) VALUES(${result.insertId}, ${tagId})  
            `);
          }
        }

        console.log(i, params.title + ' success');
        iSuccess++;
        break;
      } catch (error) {
        console.log('Creation Error: ', error);
        throw new Error(error);
      }
    } catch (e) {
      console.log('error at ', i + ' \n');
      console.log(e);
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
