const fastXmlParser = require('fast-xml-parser');
const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3Bucket = 'reallifenetwork';
const s3FolderName = 'drop/standontheword/';

const feedPath =
  'https://ga-prod-api.powr.tv/roku-rss.json?__site=reallifenetwork&thumbWidth=1920&thumbHeight=1080&thumbCrop=1&format=mp4&seriesPosters=true&allContent=true&includeChannels=true&includeAccessType=true';
const host = 'https://staging.login.reallifenetwork.com';

let iSkip = 0;
let iSuccess = 0;
let iFailed = 0;
return;

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

  const lists = jsonObj.series;
  const iStart = 0;
  const iEnd = lists.length;

  for (let i = iStart; i < iEnd; i++) {
    const seasons = lists[i].seasons;
    for (let j = 0; j < seasons.length; j++) {
      const episodes = seasons[j].episodes;
      for (let k = 0; k < episodes.length; k++) {
        try {
          const list = episodes[k];

          try {
            const { data } = await axios.get(
              `${host}/api/video/getbytitle?title=${list.title}`
            );
            console.log(data, list.title, list.content.videos, list.thumbnail);

            // const { data: series }  = await axios.get(`${host}/api/series/getbyname?name=${lists[i].title}`);
            // if(!series.id) {
            //   continue;
            // }

            // if (list.enclosure.length == data.data[0].duration) {
            //   console.log("skipping")
            //   iSkip++;
            //   continue;
            // }
          } catch (e) {
            console.log('error', e);
          }

          // const url = await uploadFile(list.enclosure.url, 'video', s3FolderName);

          // const params = {
          //   title: list.title,
          //   short_description: list.description,
          //   url: url,
          //   video_type: "mp4",
          //   quality: "FHD",
          //   duration: list.enclosure.length,
          //   thumbnail: "https://reallifenetwork.s3.amazonaws.com/drop/standontheword/5071540281706392602_20240826173336.jpg",
          //   release_date: list.pubDate,
          //   series_id: 688,
          //   approved: 0,
          //   tags: [],
          //   user_id: mysqlUserId
          // };
          // console.log(params)
          // try {
          //   const res = await axios.post(`${host}/api/video`, params);
          //   console.log(i, params.title + ' success');
          //   iSuccess++;
          // } catch (error) {
          //   console.log('===', error);
          //   throw new Error(error);
          // }
        } catch (e) {
          console.log('error at ', i + ' \n');
          // throw new Error(e);
          iFailed++;
        }
      }
    }
    console.log('current index', i, lists[i].title);
  }

  console.log('success: ' + iSuccess);
  console.log('failed: ' + iFailed);
  console.log('skip :' + iSkip);
};

readList();
