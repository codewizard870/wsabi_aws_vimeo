import AWS from 'aws-sdk';
import axos from 'axios';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const standardizeWeekdays = (releaseDate) => {
  const weekdays = {
    Tues: 'Tue',
    Weds: 'Wed',
    Thur: 'Thu',
    Frid: 'Fri',
    Satu: 'Sat',
    Sund: 'Sun',
    Mond: 'Mon',
  };

  let tempDate = releaseDate;
  // Replace each 4-letter weekday abbreviation
  Object.keys(weekdays).forEach((fourLetter) => {
    const threeLetter = weekdays[fourLetter];
    tempDate = tempDate.replace(new RegExp(fourLetter, 'g'), threeLetter);
  });
  return tempDate;
};

export const standardizeDate = (date) => {
  const timestamp = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  return timestamp;
};

export const uploadFile = async (url, type, bucket, folderName) => {
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
      Bucket: bucket,
      Key: s3Key,
      Body: response.data,
      ACL: 'public-read',
      ContentType: contentType,
    };

    const data = await s3.upload(params).promise();
    console.log('uploaded', data.Location);
    return data.Location;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
