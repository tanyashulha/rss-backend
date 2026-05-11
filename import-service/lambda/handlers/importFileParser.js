const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const csv = require('csv-parser');

const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('EVENT:', JSON.stringify(event));

  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log('BUCKET:', bucket);
      console.log('KEY:', key);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3.send(command);

      const stream = response.Body;

      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => {
            console.log('CSV ROW:', data);
          })
          .on('end', () => {
            console.log('CSV parsing finished');
            resolve();
          })
          .on('error', reject);
      });
    }
  } catch (err) {
    console.error('ERROR:', err);
    throw err;
  }
};