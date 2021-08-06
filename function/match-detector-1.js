const Bucket = require("@spica-devkit/bucket");

/*
{
  kind: 'insert',
  bucket: '61093ba92dab3c002db1f10b',
  documentKey: '610a9e772dab3c002db1f135',
  current: {
    user: '610a9e0a2dab3c002db1f12e',
    liked_user: '610a9e5b2dab3c002db1f133',
    created_at: '2021-08-04T14:04:39.272Z',
    _id: '610a9e772dab3c002db1f135'
  }
}
*/

const MATCH_BUCKET_ID = process.env.MATCH_BUCKET_ID;
const API_KEY = process.env.API_KEY;

export async function matchDetector(trigger_data) {
  let bucket_data = trigger_data.current;
  let LIKES_BUCKET_ID = trigger_data.bucket;

  Bucket.initialize({ apikey: API_KEY });

  let liked_user_like_data = await Bucket.data
    .getAll(LIKES_BUCKET_ID, {
      queryParams: {
        filter: {
          user: bucket_data.liked_user,
          liked_user: bucket_data.user,
        },
      },
    })
    .catch((error) => {
      console.log("error: ", error);
    });

  if (!liked_user_like_data || liked_user_like_data.length == 0) {
    return true;
  }

  let match_data = {
    user1: liked_user_like_data[0].user,
    user2: bucket_data.user,
    user1_like_type: liked_user_like_data[0].like_type,
    user2_like_type: bucket_data.like_type,
  };

  await Bucket.data.insert(MATCH_BUCKET_ID, match_data).catch((error) => {
    console.log("Error while creating match: ", error);
  });

  let patch_data = {
    matched: true,
  };

  let promises = [];

  promises.push(
    Bucket.data.patch(LIKES_BUCKET_ID, bucket_data._id, patch_data)
  );
  promises.push(
    Bucket.data.patch(LIKES_BUCKET_ID, liked_user_like_data[0]._id, patch_data)
  );

  await Promise.all(promises)
    .then((_) => {})
    .catch((error) => {
      console.log("error: ", error);
    });

  return true;
}
