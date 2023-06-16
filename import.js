const { default: axios } = require('axios')
const data = require('./import.json')

const s3FolderNames = [
  'biblediscovery',
  'understandingthetimesconference',
  'happeningnowconference',
  'futuresconference',
  'focusonthefamily',
  'calvarychapelhonolulu',
  'reallifewithjackhibbs',
  'beholdisrael',
  'crossexamined',
  'wayofthemaster',
  'igniteyourlife',
  'imiolachurch',
  'turningpoint',
  'bgea',
  'schusoff',
  'calvarychapelwestsidemaui',
  'buildingblocks',
  'answersnews',
  'answersingenesis',
  'endureconference',
  'hawaiiprayerbreakfast',
  'kaloonthestreet',
  'talkstoryunscripted',
  'faithinpolitics',
]

// const host = 'http://localhost:8000'
const host = 'https://admin.tvapps.ninja'
const series = data.series


console.log('Script start');

async function main() {
  for (let i = 0; i < series.length; i++) {
    console.log('Series ID =========>', series[i].id)
    // insert into users table
    const user = {
      name: series[i].title,
      email: s3FolderNames[i] + '@gmail.com',
      password: '123456',
      type: 'user',
      folder_name: s3FolderNames[i],
      short_description: series[i].shortDescription,
      poster: series[i].thumbnail,
      release_date: series[i].releaseDate?.split(' ')[0]
    }

    const response = await axios.post(`${host}/api/user`, user, { headers: { Accept: 'application/json' } })
    const userId = response.data.data.id

    // insert video
    for (const episode of series[i].episodes) {
      console.log('epiosde =======>', episode.title)

      const tags = episode.tags.split(',').map(tag => {
        if (tag) {
          return { text: tag }
        }
      })

      const video = {
        title: episode.title,
        short_description: episode.shortDescription,
        url: episode.content.videos[0].url,
        video_type: episode.content.videos[0].videoType,
        quality: episode.content.videos[0].quality,
        thumbnail: episode.thumbnail,
        release_date: episode.content.dateAdded.split(' ')[0],
        user_id: userId,
        approved: true,
        tags: tags.filter(tag => tag)
      }

      try {
        const res = await axios.post(`${host}/api/video`, video)
        console.log('episode ' + episode.id + " success")
      } catch (error) {
        console.log('===', error)
        console.log('video =>', video)
      }

    }


  }
  console.log('main')
}

main()