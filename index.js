const AWS = require('aws-sdk')
const axios = require('axios')
const mysql = require('mysql')
const { v4: uuidv4 } = require('uuid')
const data = require('./data')

const s3FolderNames = [
  'drop/biblediscovery/',
  'drop/understandingthetimesconference/',
  'drop/happeningnowconference/',
  'drop/futuresconference/',
  'drop/focusonthefamily/',
  'drop/calvarychapelhonolulu/',
  'drop/reallifewithjackhibbs/',
  'drop/beholdisrael/',
  'drop/crossexamined/',
  'drop/wayofthemaster/',
  'drop/igniteyourlife/',
  'drop/imiolachurch/',
  'drop/turningpoint/',
  'drop/bgea/',
  'drop/schusoff/',
  'drop/calvarychapelwestsidemaui/',
  'drop/buildingblocks/',
  'drop/answersnews/',
  'drop/answersingenesis/',
  'drop/endureconference/',
  'drop/hawaiiprayerbreakfast/',
  'drop/kaloonthestreet/',
  'drop/talkstoryunscripted/',
  'drop/faithinpolitics/',
]
// connection database
console.log('connecting database ...')
// you can chage database setting here
const connection = mysql.createConnection({
  host: '34.67.47.161',
  user: 'root',
  password: 'hHzzzP75csJtbCAvfw2G',
  database: 'main',
})
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'main',
// })
console.log('database connection success..')

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: 'AKIAY2GEG7ROBF4FFDFZ',
  secretAccessKey: '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',
})
const s3Bucket = 'reallifenetwork'

async function uploadFile(url, type, folderName) {
  console.log('Upload starting ...')
  console.log(`url: ${url}`)
  console.log(`type: ${type}`)
  console.log(`s3 folder: ${folderName} \n`)
  try {
    console.log('Receiving stream ... ')
    const response = await axios({
      url: url,
      responseType: 'stream',
    })
    console.log('Received stream.\n')

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

    if (type === 'image') {
      console.log('Uploading image to s3...')
    } else {
      console.log('Uploading video to s3. It will take some timme ...')
    }
    const data = await s3.upload(params).promise()
    console.log(`File uploaded successfully. File location: ${data.Location}`)
    return data.Location
  } catch (error) {
    console.error(error)
    return error
  }
}
///////////////////////////////////////

// app
const channelId = 358
const categoryIds = [
  859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873,
  874, 875, 876, 877, 903, 904, 905, 906, 907,
]
const series = data.series
let tags = ''
let count = 0

async function processData() {
  for (const categories of series) {
    let sql1 = ''
    let sql2 = ''
    console.log(
      `\n===============================  Current Category: ${categoryIds[count]}  ====================================\n`
    )
    if (count < categoryIds.length) {
      tags = ''

      query = `SELECT * FROM app_categories WHERE id = '${categoryIds[count]}'`

      const result = await asyncQuery(connection, query)

      if (!result.length) {
        // get poster url
        const posterURL = await uploadFile(
          categories.poster,
          'image',
          s3FolderNames[count]
        )

        sql1 = `INSERT INTO app_categories(id, channel_id, photo, created, description, name) VALUES("${categoryIds[count]}", "${channelId}", "${posterURL}", "${categories.releaseDate}", "${categories.shortDescription}", "${categories.title}");`
        const rsql1 = await asyncQuery(connection, sql1)
        console.log(
          `New row created successfully in table app_categories for id: ${categoryIds[count]}`
        )
      }

      for (const session of categories.seasons) {
        for (const episode of session.episodes) {
          tags = ''
          for (const tag of episode.tags) {
            tags = tags + ',' + tag
          }

          duration = 0

          if (episode.content.duration) {
            duration = episode.content.duration
          }

          const streaming_url = episode.content.videos[0].url
          const new_streaming_url = await uploadFile(
            streaming_url,
            'video',
            s3FolderNames[count]
          )

          query2 = `SELECT * FROM app_feeds WHERE streaming_url = '${streaming_url}' AND channel_id = '${channelId}' AND category_ids = '${categoryIds[count]}';`

          const res2 = await asyncQuery(connection, query2)

          if (res2.length > 0) {
            // update if row is found
            sql2 = `UPDATE app_feeds SET streaming_url = "${new_streaming_url}" WHERE streaming_url = "${streaming_url}" AND channel_id = "${channelId}" AND category_ids = "${categoryIds[count]}";`
            const rsql2 = await asyncQuery(connection, sql2)
            console.log(
              `Updated a row successfully in table app_feeds for category_ids: ${categoryIds[count]}, streaming_url: ${streaming_url}`
            )
          } else {
            // insert if row doesn't exist
            sql2 = `INSERT INTO app_feeds(channel_id, category_ids, name, created, streaming_url, format, quality, length, photo, tags, description, synopsis) VALUES("${channelId}", "${
              categoryIds[count]
            }", "${episode.title}", "${new Date(
              episode.content.dateAdded
            )}", "${new_streaming_url}", "${
              episode.content.videos[0].videoType
            }", "${episode.content.videos[0].quality}", "${duration}", "${
              episode.thumbnail
            }", "${tags.trimStart(",")}", "${episode.shortDescription}", "${
              episode.longDescription
            }");`
            const rsql2 = await asyncQuery(connection, sql2)
            console.log(
              `New row created successfully in table app_feeds for category_ids: ${categoryIds[count]}`
            )
          }
        }
      }
    } else {
      break
    }

    count++
  }
  console.log('===================================  COMPLETED =====================================')
}

// processData()

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
