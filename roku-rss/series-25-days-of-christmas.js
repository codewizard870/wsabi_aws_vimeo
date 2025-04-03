const AWS = require('aws-sdk');
const axios = require('axios');
const mysql = require('mysql2/promise');
const jsonObj = require('./roku-feed.json');

const { standardizeWeekdays, standardizeDate } = require('./util');
require('dotenv').config();

const s3Bucket = 'reallifenetwork';

const feedPath =
  'https://ga-prod-api.powr.tv/roku-rss.json?__site=reallifenetwork&thumbWidth=1920&thumbHeight=1080&thumbCrop=1&format=mp4&seriesPosters=true&allContent=true&includeChannels=true&includeAccessType=true';

const power_cms_series_id = '140-s2tf7dkxg0sc-25-days-of-christmas';
const series_id = 715;

let iSkip = 0;
let iSuccess = 0;
let iFailed = 0;
let iNew = 0;

const readList = async () => {
  console.log('reading list');
  // const { data: jsonObj } = await axios.get(feedPath);

  const series = jsonObj.series;

  const connectionStaging = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  const connectionLive = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_LIVE_DATABASE,
  });
  const timestamp = standardizeDate(Date.now());

  for (let m = 0; m < series.length; m++) {
    const seriesOne = series[m];
    if (seriesOne.id != power_cms_series_id) continue;

    console.log(`series - ${seriesOne.title}`);

    for (let p = 0; p < seriesOne.channels.length; p++) {
      let channel_id = null;

      const channel = seriesOne.channels[p];
      const [rows] = await connectionStaging.execute(
        `SELECT * from channels where powr_tv_channelid='${channel}'`
      );
      if (rows.length > 0) {
        channel_id = rows[0].id;

        const [checkingRows] = await connectionStaging.execute(
          `SELECT * from series_channels where series_id='${series_id}' and channel_id='${channel_id}'`
        );
        if (checkingRows.length > 0) {
          continue;
        }
      } else {
        const params = [
          channel,
          channel,
          'Videos',
          'Recent',
          timestamp,
          timestamp,
          channel,
        ];
        const query = `INSERT INTO channels (name, channel_name, type, sort_by, created_at, updated_at, powr_tv_channelid) VALUES(?, ?, ?, ?, ?, ?, ?)`;

        const [channelInsert] = await connectionStaging.execute(query, params);
        channel_id = channelInsert.insertId;
      }
      await connectionStaging.execute(`
        INSERT INTO series_channels (series_id, channel_id, created_at, updated_at) VALUES('${series_id}', '${channel_id}', '${timestamp}', '${timestamp}')
        `);
    }

    for (let p = 0; p < seriesOne.seasons.length; p++) {
      const season = seriesOne.seasons[p];
      let season_id = null;

      const [rows] = await connectionStaging.execute(
        `select * from seasons where name='${season.title}' and series_id='${series_id}'`
      );
      if (rows.length > 0) {
        season_id = rows[0].id;
      } else {
        const [seasonInsert] = await connectionStaging.execute(
          `INSERT INTO seasons (name, series_id, status, season_number, short_description, created_at, updated_at) VALUES('${season.title}', '${series_id}', '1', ${season.seasonNumber}, '${season.description}', '${timestamp}', '${timestamp}')`
        );
        season_id = seasonInsert.insertId;
      }

      const lists = season.episodes;
      console.log(`seasons ${season.title} - ${lists.length}`);

      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        // if (list.content.videos[0].videoType.toUpperCase() != 'MP4') {
        //   console.log(`skipping ${list.content.videos[0].videoType}`);
        //   continue;
        // }

        try {
          let videoUrl = null;
          let thumbnailUrl = null;

          const [stagingRows] = await connectionStaging.execute(
            `SELECT * from videos where source_id='${list.id}'`
          );
          if (stagingRows.length > 0) {
            iSkip++;
            continue;
          }

          const [rows] = await connectionLive.execute(
            `SELECT * from videos where id="${list.id}"`
          );

          if (rows.length > 0) {
            videoUrl = rows[0].url;
            thumbnailUrl = rows[0].thumbnail;
          } else {
            continue;

            const s3FolderName = `drop/${seriesOne.title
              .toUpperCase()
              .replace(/\s+/g, '-')}/`;
            console.log('Folder Name: ', s3FolderName);

            videoUrl = await uploadFile(
              list.content.videos[0].url,
              'video',
              s3Bucket,
              s3FolderName
            );

            thumbnailUrl = await uploadFile(
              list.thumbnail,
              'image',
              s3Bucket,
              s3FolderName
            );

            iNew++;
          }

          const release_date = standardizeDate(
            standardizeWeekdays(list.releaseDate)
          );

          const params = [
            list.id,
            list.title,
            list.shortDescription,
            videoUrl,
            list.content.videos[0].videoType,
            list.content.videos[0].quality,
            list.content.duration,
            thumbnailUrl,
            release_date,
            1,
            series_id,
            season_id,
            list.id,
            timestamp,
            timestamp,
          ];

          const query = `
              INSERT INTO videos (id, title, short_description, url, video_type, quality, duration, thumbnail, release_date, approved, series_id, season_id, source_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

          const [result] = await connectionStaging.execute(query, params);
          console.log(result.insertId);

          //-----channels------------------------------
          for (let j = 0; j < list.channels.length; j++) {
            if (seriesOne.channels.includes(list.channels[j])) continue;

            let channel_id = null;

            const channel = list.channels[j];
            const [rows] = await connectionStaging.execute(
              `SELECT * from channels where powr_tv_channelid='${channel}'`
            );
            if (rows.length > 0) {
              channel_id = rows[0].id;
            } else {
              const params = [
                channel,
                channel,
                'Videos',
                'Recent',
                timestamp,
                timestamp,
                channel,
              ];
              const query = `INSERT INTO channels (name, channel_name, type, sort_by, created_at, updated_at, powr_tv_channelid) VALUES(?, ?, ?, ?, ?, ?, ?)`;

              const [channelInsert] = await connectionStaging.execute(
                query,
                params
              );
              channel_id = channelInsert.insertId;
            }
            await connectionStaging.execute(`
                INSERT INTO videos_channels (video_id, channel_id, created_at, updated_at) VALUES('${result.insertId}', '${channel_id}', '${timestamp}', '${timestamp}')
                `);
          }

          //------tags--------------------------------------
          for (let j = 0; j < list.tags.length; j++) {
            if (!list.tags[j]) continue;
            list.tags[j] = list.tags[j].replace(/['"]/g, ' ');

            let tagId = undefined;
            const [tagResult] = await connectionStaging.execute(
              `SELECT * from tags where name="${list.tags[j]}"`
            );
            if (tagResult.length > 0) {
              tagId = tagResult[0].id;
            } else {
              const [tagInsert] = await connectionStaging.execute(`
                  INSERT INTO tags (name, created_at, updated_at) VALUES("${list.tags[j]}", "${timestamp}", "${timestamp}")
                `);
              tagId = tagInsert.insertId;
            }

            if (tagId) {
              await connectionStaging.execute(`
                    INSERT INTO video_tag (video_id, tag_id) VALUES(${result.insertId}, ${tagId})  
                  `);
            }
          }

          console.log(i, params[0] + ' success');
          iSuccess++;
        } catch (e) {
          console.log('error at ', i + ' \n');
          console.log(e);
          iFailed++;
        }
        console.log('current index', i, lists[i].title);
      }
    }
  }
  console.log('success: ' + iSuccess);
  console.log('failed: ' + iFailed);
  console.log('skip :' + iSkip);
  console.log('new :' + iNew);
  process.exit(1);
};

readList();
