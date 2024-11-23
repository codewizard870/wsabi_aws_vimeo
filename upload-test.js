const AWS = require('aws-sdk')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

///////////////////////////////////////
const s3 = new AWS.S3({
  accessKeyId: '',
  secretAccessKey: '',
  useAccelerateEndpoint: true
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
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.jpg'
    } else {
      s3Key = 'drop/test/' + folderName + '/' + uuidv4() + '.mp4'
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
    console.log(`File uploaded successfully. File location: ${data.Location}\n`)
    return data.Location
  } catch (error) {
    console.error(error)
    return error
  }
}
///////////////////////////////////////


async function main() {
  // upload poster to s3 and get poster url
  const remoteURL = 'https://via.placeholder.com/600x400'
  const imgURL = await uploadFile(
    remoteURL,
    'image',
    'testfolder'
  )

  console.log(imgURL)
}

main()