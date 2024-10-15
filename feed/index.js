const fastXmlParser = require('fast-xml-parser');
const AWS = require('aws-sdk');
const axios = require('axios');

const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3({
  accessKeyId: '',
  secretAccessKey: '',
});
const s3Bucket = 'reallifenetwork';
const s3FolderName = 'drop/standontheword/';

const xmlPath = 'https://bible.frc.org/rss/SOTW/feed.xml';
const host = 'https://login.reallifenetwork.com';
const mysqlUserId = '100';

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
    console.log("uploaded", data.Location);
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
    attributeNamePrefix: ""
  };
  const parser = new fastXmlParser.XMLParser(options);
  const jsonObj = parser.parse(result);

  const lists = jsonObj.rss.channel.item;
  const iStart = 0;
  const iEnd = lists.length;
  console.log(iEnd);

  for (let i = 0; i < iEnd; i++) {
    try {
      const list = lists[i];
      try {
        const { data } = await axios.get(`${host}/api/video/getbytitle?title=${list.title}`);
        console.log(list.title, list.enclosure.length, data.data[0].title, data.data[0].duration)

        if (list.enclosure.length == data.data[0].duration) {
          console.log("skipping")
          iSkip ++;
          continue;
        }
      } catch (e) {
        console.log("error", i)
      }

      const url = await uploadFile(list.enclosure.url, 'video', s3FolderName);

      const params = {
        title: list.title,
        short_description: list.description,
        url: url,
        video_type: list.enclosure.type,
        quality: "FHD",
        duration: list.enclosure.length,
        thumbnail: "https://reallifenetwork.s3.amazonaws.com/drop/standontheword/5071540281706392602_20240826173336.jpg",
        release_date: list.pubDate,
        series_id: 688,
        approved: 0,
        tags: [],
        user_id: mysqlUserId
      };
      console.log(params)
      try {
        const res = await axios.post(`${host}/api/video`, params);
        console.log(i, params.title + ' success');
        iSuccess ++;
      } catch (error) {
        console.log('===', error);
        throw new Error(error);
      }
    } catch (e) {
      console.log('error at ', i + ' \n');
      // throw new Error(e);
      iFailed++;
    }
    console.log('current index', i, lists[i].title);
  }

  console.log("success: " + iSuccess);
  console.log("failed: " + iFailed);
  console.log("skip :" + iSkip);
}

readList();