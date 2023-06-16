const AWS = require('aws-sdk');
const axios = require('axios');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');
const series = require('./feed.json');

// const s3FolderNames = [
//   'prayerluncheon',
//   'jackhibbsmidweek',
//   'jackhibbslive',
//   'movieguide',
//   'mainthingministries',
//   'thetalkshowwithericmetaxas',
//   'dennisandjulie',
//   'thedineshdsouzapodcast',
//   'sidelinesanitywithmicheletafoya',
//   'thedougcollinspodcast',
//   'mikegallagher',
//   'cureamerica',
//   'thecarljacksonpodcast',
//   'dennisprager',
//   'hughhewitt',
//   'moralityinthe21stcentury',
//   'askajewaskagentile2022',
//   'libertystation',
//   'poplitics',
//   'waltsdisenchantedkingdom',
//   'biblediscovery',
//   'crossexamined',
//   'focusonthefamily',
//   'calvarychapelhonolulu',
//   'reallifewithjackhibbs',
//   'beholdisrael',
//   'wayofthemaster',
//   'imiolachurch',
//   'onelove',
//   'redefined',
//   'bgea',
//   'schusoff',
//   'godstory',
//   'calvarychapelwestsidemaui',
//   'buildingblocks',
//   'kaloshorts',
//   'endureconference',
//   'hawaiiprayerbreakfast',
//   'kaloonthestreet',
//   'reallifepodcast',
//   'talkstoryunscripted',
//   'faithinpolitics',
//   'toddstarnesshow',
// ]

const s3FolderNames = [
  'testfolder',
  'testfolder1',
  'testfolder2',
  'testfolder3',
  'testfolder4',
  'testfolder5',
  'testfolder6',
  'testfolder7',
  'testfolder8',
  'testfolder9',
  'testfolder10',
  'testfolder11',
  'testfolder12',
  'testfolder13',
  'testfolder14',
  'testfolder15',
  'testfolder16',
  'testfolder17',
  'testfolder18',
  'testfolder19',
  'testfolder20',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
  'testfolder',
];

const seriesTitles = [
  'Prayer Luncheon', // new   /prayerluncheon
  'Jack Hibbs Mid Week', // new. /jackhibbsmidweek
  'Jack Hibbs Live', // new /jackhibbslive
  'Movieguide', // new /movieguide
  'Main Thing Ministries', // old /mainthingministries
  'The Talk Show with Eric Metaxas', // new /thetalkshowwithericmetaxas
  'Dennis & Julie', // new /dennisandjulie
  "The Dinesh D'Souza Podcast", // new /thedineshdsouzapodcast
  'Sideline Sanity with Michele Tafoya', // new /sidelinesanitywithmicheletafoya
  'The Doug Collins Podcast', // new /thedougcollinspodcast
  'Mike Gallagher', // new /mikegallagher
  'Cure America with Star Parker', // new /cureamerica
  'The Carl Jackson Podcast', // new /thecarljacksonpodcast
  'Dennis Prager', // new /dennisprager
  'Hugh Hewitt', // new /hughhewitt'
  'Morality in the 21st Century', // new /moralityinthe21stcentury
  'Ask a Jew, Ask a Gentile 2022', // new /askajewaskagentile2022
  'Liberty Station', // new /libertystation
  'POPlitics', // new /poplitics
  "Walt's Disenchanted Kingdom", // new /waltsdisenchantedkingdom
  'Bible Discovery TV', // old /biblediscovery
  'Cross Examined', // old /crossexamined
  'Focus On The Family', // old /focusonthefamily
  'As We Gather - Calvary Chapel Honolulu', // old /calvarychapelhonolulu
  'Real Life With Jack Hibbs', // old /reallifewithjackhibbs
  'Behold Israel', // old /beholdisrael
  'Way of the Master - Living Waters', // old /wayofthemaster
  'Imiola Church', // old /imiolachurch
  'One Love', // old /onelove
  'Redefined with Nubia Brown', // new /redefined
  'Billy Graham Evangelistic Association', // old /bgea
  'Schus Off', // old /schusoff
  "God's Story", // new /godstory
  'Turn the Tables with Steve Santos', // old /calvarychapelwestsidemaui
  'Building Blocks -', // old /buildingblocks
  'Kalo Shorts', // new /kaloshorts
  'Endure', // old /endureconference
  'Hawaii Prayer Breakfast', // old /hawaiiprayerbreakfast
  'Kalo On The Streets', // old /kaloonthestreet
  'Jack Hibbs Podcast', // old /reallifepodcast
  'Unscripted Podcast', // old /talkstoryunscripted
  'Faith In Politics', // old /faithinpolitics
  'Todd Starnes Show', // new /toddstarnesshow
];

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: 'AKIAY2GEG7ROBF4FFDFZ',
  secretAccessKey: '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',
  useAccelerateEndpoint: true,
});
const s3Bucket = 'reallifenetwork';

async function uploadFile(url, type, folderName) {
  console.log('Upload starting ...');
  console.log(`url: ${url}`);
  console.log(`type: ${type}`);
  console.log(`s3 folder: ${folderName} \n`);
  try {
    const response = await axios({
      url: url,
      responseType: 'stream',
    });

    const contentType = response.headers['content-type'];

    if (type === 'image') {
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.jpg';
    } else {
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.mp4';
    }

    const params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: response.data,
      ACL: 'public-read',
      ContentType: contentType,
    };

    if (type === 'image') {
      console.log('Uploading image to s3...');
    } else {
      console.log('Uploading video to s3. It will take some timme ...');
    }
    const data = await s3.upload(params).promise();
    console.log(
      `File uploaded successfully. File location: ${data.Location}\n`
    );
    return data.Location;
  } catch (error) {
    console.error(error);
    return 'error';
  }
}
///////////////////////////////////////

const host = 'http://localhost:8000';
// const host = 'https://login.reallifenetwork.com'

console.log('Script start');
tc = 0
series.map((s, index) => {
  let count = 0;
  for (let i = 0; i < s.seasons.length; i++) {
    for (let j = 0; j < s.seasons[i].episodes.length; j++) {
      count++
      tc++
    }
  }
  console.log(index + 1, '===>', count)
})
console.log(tc)

async function main() {
  try {
    for (let i = 20; i < series.length; i++) {
      console.log('\nSeries ID =========>', series[i].id);
      let userId;

      try {
        // check if series exists
        const respp = await axios.get(
          `${host}/api/user/getbyfoldername?folder_name=${s3FolderNames[i]}`
        );

        if (respp.data.data.length === 0) {
          // upload poster to s3 and get poster url
          // const posterURL = await uploadFile(
          //   series[i].poster,
          //   'image',
          //   s3FolderNames[i]
          // );
          // insert into users table
          const user = {
            name: series[i].title,
            email: s3FolderNames[i] + '@gmail.com',
            password: '123456',
            type: 'user',
            folder_name: s3FolderNames[i],
            short_description: series[i].shortDescription,
            // poster: posterURL,
            poster: series[i].poster,
            release_date: series[i].releaseDate,
          };

          try {
            const response = await axios.post(`${host}/api/user`, user, {
              headers: { Accept: 'application/json' },
            });
            userId = response.data.data.id;
          } catch (e2) {
            console.log('error adding new user', user);
            throw e2;
          }
        } else {
          userId = respp.data.data[0].id;
        }
      } catch (e1) {
        console.log('error getting folder name');
        throw e1;
      }

      // insert video
      for (const season of series[i].seasons) {
        for (const episode of season.episodes) {
          console.log('epiosde =======>', episode.title);

          // check if episode exists
          const resp = await axios.get(
            `${host}/api/video/getbytitle?title=${episode.title}`
          );

          if (resp.data.data.length === 0) {
            const tags = episode.tags.map((tag) => {
              if (tag) {
                return { text: tag };
              }
            });

            // get video url
            // const videoURL = await uploadFile(
            //   episode.content.videos[0].url,
            //   'video',
            //   s3FolderNames[i]
            // )

            // get img url
            const thumbnailURL = await uploadFile(
              episode.thumbnail,
              'image',
              s3FolderNames[i]
            );

            const video = {
              title: episode.title,
              short_description: episode.shortDescription,
              // url: videoURL,
              url: episode.content.videos[0].url,
              video_type: episode.content.videos[0].videoType,
              quality: episode.content.videos[0].quality,
              thumbnail: episode.thumbnail,
              release_date: episode.releaseDate,
              user_id: userId,
              approved: true,
              tags: tags.filter((tag) => tag),
            };

            try {
              const res = await axios.post(`${host}/api/video`, video);
              console.log('episode ' + episode.id + ' success\n');
            } catch (error) {
              console.log('error adding video');
              throw error;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('-----------error-----------\n', error);
  }
}

// main();
