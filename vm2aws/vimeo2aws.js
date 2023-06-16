const AWS = require('aws-sdk')
const axios = require('axios')
const fs = require('fs');
const mysql = require('mysql')
const { v4: uuidv4 } = require('uuid')

// connection database
console.log('connecting database ...')
// you can chage database setting here
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rl_db',
})
console.log('database connection success..')

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: 'AKIAY2GEG7ROBF4FFDFZ',
  secretAccessKey: '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',
})
const s3Bucket = 'reallifenetwork';
const s3FolderName = 'drop/rljh/test/';

const vimeoToken = "229898c696b00ebb5a364706862c52d9";//"cfc8e36f9c534affa707dc5c92beedc2";
const vimeoUserId = "14050482";//"202214418";
const mysqlUserId = "100";

const vimeoHost = "https://api.vimeo.com";
const filePath = './vm2aws/links.json';

const { readFile } = require('fs/promises');
const iStart = 0;
const iEnd = 0;

const readList = async () => {
  console.log("reading list")
  const result = await readFile(filePath, "utf-8")
  const lists = JSON.parse(result);
  iEnd = lists.length;

  for (let i = iStart; i < iEnd; i++) {
    try {
      const list = lists[i];
      list.url = await uploadFile(list.url, "video", s3FolderName);
      list.thumbnail = await uploadFile(list.thumbnail, "image", s3FolderName);

      const sql = `INSERT INTO videos(title, short_description, url, video_type, quality, duration, thumbnail, release_date, user_id, approved, created_at) VALUES("${list.title}", "${list.short_description}", "${list.url}", "${list.video_type}", "${list.quality}", "${list.duration}", "${list.thumbnail}", "${list.release_date}", "${list.user_id}", "${list.approved}", "${list.created_at}");`
      const mres = await asyncQuery(connection, sql)
    } catch (e) {
      console.log(e)
    }
    console.log(i)
  }
}

async function makeList() {
  const lists = [];

  console.log("making list");
  let projectUrl = `/users/${vimeoUserId}/projects?page=1`;
  const projectFields = "&fields=uri";

  while (projectUrl != null) {
    try {
      let res = await axios.get(
        `${vimeoHost}${projectUrl}${projectFields}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${vimeoToken}`
          }
        }
      );
      projectUrl = res.data.paging.next;

      const projects = res.data.data;
      let index = 0;
      for (let i = 0; i < projects.length; i++) {
        let videoUrl = `${projects[i].uri}/videos?page=1`;
        const videoFilters="&filters=uri,name,description,player_embed_url,duration,pictures,release_time"
        while (videoUrl != null) {
          try {
            res = await axios.get(
              `${vimeoHost}${videoUrl}${videoFilters}`,
              {
                headers: {
                  Accept: 'application/json',
                  Authorization: `Bearer ${vimeoToken}`
                }
              }
            );
            videoUrl = res.data.paging.next;

            const videos = res.data.data;
            for (let j = 0; j < videos.length; j++) {
              const video = videos[j];
              lists.push({
                index: index++,
                title: video.name,
                short_description: video.description,
                url: video.player_embed_url,
                video_type: "MP4",
                quality: "FHD",
                duration: video.duration,
                thumbnail: video.pictures.sizes[video.pictures.sizes.length - 1].link,
                release_date: video.release_time,
                user_id: mysqlUserId,
                approved: 1,
                created_at: new Date(Date.now()).toISOString()
              })
            }
          } catch (e) {
            console.log(e)
          }
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
  fs.writeFile(filePath, JSON.stringify(lists), (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Data written to file successfully!');
  });
}

async function uploadFile(url, type, folderName) {
  try {
    const response = await axios({
      url: url,
      responseType: 'stream',
    })

    const contentType = response.headers['content-type']

    if (type === 'image') {
      s3Key = folderName + uuidv4() + '.jpg'
    } else {
      s3Key = folderName + uuidv4() + '.mp4'
    }

    const params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: response.data,
      ACL: 'public-read',
      ContentType: contentType,
    }

    const data = await s3.upload(params).promise()
    return data.Location
  } catch (error) {
    console.error(error)
    return error
  }
}
async function asyncQuery(conn, query) {
  return new Promise((resolve, reject) => {
    conn.query(query, function (error, results, fields) {
      if (error) {
        reject(error)
      } else {
        resolve(results)
      }
    })
  })
}
async function main() {
  try {
    await readList();
  } catch (e) {
    console.log(e)
    await makeList();
  }
  console.log("done")
}

///////////////////////////////////////
main();