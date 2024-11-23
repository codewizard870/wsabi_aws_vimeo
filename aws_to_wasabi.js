const axios = require('axios');
const fs = require('fs');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: '',
  secretAccessKey: '',
});
const bucketName = 'reallifenetwork';

const folder_names = [
  'drop/Heidi St John/',
  'drop/Wildwood Calvary Chapel/',
  'drop/admin/',
  'drop/ali/',
  'drop/answersingenesis/',
  'drop/answersnews/',
  'drop/askajewaskagentile2022/',
  'drop/beholdisrael/',
  'drop/bgea/',
  'drop/biblediscovery/',
  'drop/bridgebibletalk/',
  'drop/buildingblocks/',
  'drop/buvi/',
  'drop/calvarychapelhonolulu/',
  'drop/calvarychapelwestsidemaui/',
  'drop/calvarysouthorangecounty/',
  'drop/cornerstonechapel/',
  'drop/crossexamined/',
  'drop/cureamerica/',
  'drop/dennisandjulie/',
  'drop/dennisprager/',
  'drop/endureconference/',
  'drop/faithinpolitics/',
  'drop/focusonthefamily/',
  'drop/futuresconference/',
  'drop/godstory/',
  'drop/groundworksministries/',
  'drop/happeningnowconference/',
  'drop/hawaiiprayerbreakfast/',
  'drop/heidistjohn/',
  'drop/hughhewitt/',
  'drop/igniteyourlife/',
  'drop/imiolachurch/',
  'drop/jackhibbslive/',
  'drop/jackhibbsmidweek/',
  'drop/kaloonthestreet/',
  'drop/kaloshorts/',
  'drop/libertystation/',
  'drop/littlepatriots/',
  'drop/mainthingministries/',
  'drop/mikegallagher/',
  'drop/mikemcclure/',
  'drop/mikemoorestudios/',
  'drop/moralityinthe21stcentury/',
  'drop/movieguide/',
  'drop/onelove/',
  'drop/pacificjusticeinstitute/',
  'drop/poplitics/',
  'drop/prayerluncheon/',
  'drop/reallifepodcast/',
  'drop/reallifewithjackhibbs/',
  'drop/redefined/',
  'drop/resurrectministry/',
  'drop/schusoff/',
  'drop/sevendaysinuptopia/',
  'drop/sidelinesanitywithmicheletafoya/',
  'drop/starspangledadventures/',
  'drop/talkstoryunscripted/',
  'drop/test_folder/',
  'drop/testing/',
  'drop/testing1/',
  'drop/testingfolder/',
  'drop/thewordfortoday/',
  'drop/thruthebible/',
  'drop/toddstarnesshow/',
  'drop/traveltheroad/',
  'drop/turningpoint/',
  'drop/undefined/',
  'drop/understandingthetimesconference/',
  'drop/wallbuilders/',
  'drop/waltsdisenchantedkingdom/',
  'drop/washingtonwatch/',
  'drop/wayofthemaster/',
];

const filePath = './links.json';

async function listFolderObjects(folder_name) {
  const response = await s3
    .listObjectsV2({
      Bucket: bucketName,
      Prefix: folder_name,
    })
    .promise();

  return response.Contents.map(
    (obj) => `https://${bucketName}.s3.amazonaws.com/${obj.Key}`
  );
}

const data = [];

async function main() {
  for (const folder_name of folder_names) {
    const links = await listFolderObjects(folder_name);

    for (const link of links) {
      data.push(link);
    }
  }

  fs.writeFile(filePath, data, (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Data written to file successfully!');
  });
}

main();
