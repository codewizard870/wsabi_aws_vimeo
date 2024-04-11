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

  console.log('result',result)

  for (let i = 0; i < series.seasons.length; i++) {
    const season = series.seasons[i];
    for (let j = 0; j < season.episodes.length; j++) {
      const episode = season.episodes[j];

      for (let k = 0; k < result.length; k++)

        if (episode.title === result[k].title) {

          const shortDescription = connection.escape(episode.shortDescription);
          const releaseDate = connection.escape(episode.releaseDate);
          const duration = connection.escape(episode.content.duration);

          const updateQuery = `UPDATE videos SET short_description = ${shortDescription},release_date = ${releaseDate},duration=${duration}`;
          console.log(updateQuery)

          await asyncQuery(connection, updateQuery);

          console.log("updated");
        } else {
          console.log("Updated fault")
        }

    }
  }
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
