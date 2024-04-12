const axios = require('axios')
const mysql = require('mysql')
const data = require('./series82')

// connection database
console.log('connecting database ...')
// you can chage database setting here
// const connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'root',
//   password: '',
//   database: 'rl_db',
// })
const connection = mysql.createConnection({
  host: '146.190.220.218',
  user: 'dev_admin',
  password: 'GmkLS)ZlhE*E',
  database: 'dev_staging_reallife_admin',
})

console.log('database connection success..')
///////////////////////////////////////
const series = data

async function processData() {

  query = `SELECT * FROM videos WHERE series_id = '82'`
  const result = await asyncQuery(connection, query)

  const updatedCount = 0;

  const totalCount = 0;
  const succed = 0;

  for (let i = 0; i < series.seasons.length; i++) {
    const season = series.seasons[i];
    for (let j = 0; j < season.episodes.length; j++) {
      const episode = season.episodes[j];
      totalCount++;

      for (let k = 0; k < result.length; k++) {
        if (episode.title === result[k].title) {
          const shortDescription = connection.escape(episode.shortDescription);
          const releaseDate = connection.escape(episode.releaseDate);
          const duration = connection.escape(episode.content.duration);

          const updateQuery = `UPDATE videos SET short_description = "${shortDescription}", release_date = "${releaseDate}", duration = "${duration}"`;

          await asyncQuery(connection, updateQuery);

          const videoId = result[k].id;
          const queryTag = `DELETE FROM video_tag WHERE video_id = '${videoId}'`
          await asyncQuery(connection, queryTag);

          for (let p = 0; p < episode.tags.length; p++) {
            const tag = episode.tags[p];
            const queryTagId = `SELECT id FROM tags WHERE name = "${tag}"`;
            const resultTag = await asyncQuery(connection, queryTagId);

            if (resultTag && resultTag.length > 0) {
              const addQuery = `INSERT INTO video_tag (video_id, tag_id) VALUES (${videoId}, ${resultTag[0].id})`;
              await asyncQuery(connection, addQuery);
            } else {
              const addQuery = `INSERT INTO tags(name) VALUES ("${tag}")`;
              const resultAddTag = await asyncQuery(connection, addQuery);

              if (resultAddTag) {
                const addNewQuery = `INSERT INTO video_tag (video_id, tag_id) VALUES (${videoId}, ${resultAddTag.insertId})`;
                console.log(addNewQuery, videoId, "ddd");
                await asyncQuery(connection, addNewQuery);
              } else {
                console.log("error!");
              }
            }
          }
          console.log("updated");
          succed++;
        } else {
          console.log("Updated fault")
        }
      }
    }
  }
  console.log(totalCount, succed);
  console.log('=== COMPLETED ===')
}
processData()

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
