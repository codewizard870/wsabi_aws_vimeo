const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: '',
  secretAccessKey: '',
});
const s3Bucket = 'reallifenetwork';
const s3FolderName = 'drop/rlmvimeo/';

const vimeoToken = '650fa71ef55e6d138bddc498d0bdaef0'; //"cfc8e36f9c534affa707dc5c92beedc2";
const vimeoUserId = '14050482'; //"202214418";
const mysqlUserId = '100';

const vimeoHost = 'https://api.vimeo.com';
const host = 'https://login.reallifenetwork.com';
// const host = 'https://staging.login.reallifenetwork.com';
const filePath = './vm2aws/links.json';
const failedPath = './vm2aws/failed.json';

const { readFile } = require('fs/promises');
const iStart = 401;
let iEnd = 401;
let failed = [];

const readList = async () => {
  console.log('reading list');
  const result = await readFile(filePath, 'utf-8');
  const lists = JSON.parse(result);
  iEnd = lists.length;

  for (let i = iStart; i < iEnd; i++) {
    try {
      const list = lists[i];
      console.log(list.url)
      list.url = await uploadFile(list.url, 'video', s3FolderName);
      list.thumbnail = await uploadFile(list.thumbnail, 'image', s3FolderName);
      console.log(list.thumbnail)

      try {
        const res = await axios.post(`${host}/api/video`, list);
        console.log(i, list.title + ' success');
      } catch (error) {
        console.log('===', error);
        throw new Error(error);
      }
    } catch (e) {
      console.log('error at ', i + ' \n', e);
      // throw new Error(e);
      failed.push(i);
    }
    console.log('current index', i, lists[i].title);
  }
};

async function makeList() {
  const lists = [];
  const failed = [];

  console.log('making list');

  let videoUrl = `/users/${vimeoUserId}/videos?page=1`;
  const videoFilters =
    '&filters=uri,name,description,download,duration,pictures,release_time&per_page=100';
  while (videoUrl != null) {
    try {
      res = await axios.get(`${vimeoHost}${videoUrl}${videoFilters}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${vimeoToken}`,
        },
      });
      videoUrl = res.data.paging.next;

      const videos = res.data.data;
      for (let j = 0; j < videos.length; j++) {
        const video = videos[j];

        let tags = [];
        if (video.tags.length > 0) {
          for (const tag of video.tags) {
            tags.push({ text: tag.tag });
          }
        }
        try {
          const download = video.download[video.download.length - 1];
          console.log(j + res.data.per_page * (res.data.page-1));

          lists.push({
            title: video.name,
            short_description: video.description,
            url: download.link,
            video_type: download.type,
            quality: download.quality,
            duration: video.duration,
            thumbnail: video.pictures.sizes[video.pictures.sizes.length - 1].link,
            release_date: video.release_time.split('T')[0],
            user_id: mysqlUserId,
            approved: 1,
            tags: tags,
          });
        } catch (e) {
          failed.push(video);
        }
      }
    } catch (e) {
      console.log(e);
      throw new Error(e);
    }
  }

  fs.writeFile(filePath, JSON.stringify(lists), (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Data written to file successfully!', lists.length);
  });

  fs.writeFile(failedPath, JSON.stringify(failed), (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Data written to file successfully!', failed.length);
  });
}

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
    return data.Location;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
}

async function main() {
  await readList();
  // await makeList();

  console.log('done');
}

///////////////////////////////////////
main();
