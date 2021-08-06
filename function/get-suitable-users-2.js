const Bucket = require("@spica-devkit/bucket");

const USER_BUCKET_ID = process.env.USER_BUCKET_ID;
const API_KEY = process.env.API_KEY;
const LIKES_BUCKET_ID = process.env.LIKES_BUCKET_ID;
const UNLIKES_BUCKET_ID = process.env.UNLIKES_BUCKET_ID;

/*
POST - REQUEST

REQUEST: {
    user: __user_data___,
    distance?: __distance_radius__   [DEFAULT:10],
    limit?: __max_user_limit__       [DEFAULT:10],
    skip?: __skip_number__           [DEFAULT:0],
}

RESPONSE: [
    users: [
        user,
        user,
        ...
    ],
    can_be_more: false | true // can be more shows that is there more users to get with this filter or not
]
 */

export async function getUsers(req, res) {
  let { distance, user, limit, skip } = req.body;
  distance = distance ? distance : 10;
  limit = limit ? limit : 10;
  skip = skip ? skip : 0;

  let filter = {};
  filter["location.coordinates"] = {
    $geoWithin: {
      $centerSphere: [
        [
          Number(user.location.coordinates[0]),
          Number(user.location.coordinates[1]),
        ],
        distance / 6378.1,
      ],
    },
  };

  // get users by distance
  Bucket.initialize({ apikey: API_KEY });

  let matchable_users = await Bucket.data
    .getAll(USER_BUCKET_ID, { queryParams: { filter: filter } })
    .catch(console.log);

  let liked_users = await Bucket.data.getAll(LIKES_BUCKET_ID, {
    queryParams: { filter: { user: user._id } },
  });

  let unliked_users = await Bucket.data.getAll(UNLIKES_BUCKET_ID, {
    queryParams: { filter: { user: user._id } },
  });

  // eliminate already liked users
  let eliminated_users = eliminateLikedUsers(matchable_users, liked_users);
  eliminated_users = eliminateLikedUsers(eliminated_users, unliked_users);

  // slice the number of users that needed, and assign can be more status
  let sliced_users = eliminated_users.slice(skip, skip + limit);
  let can_be_more =
    skip + sliced_users.length < eliminated_users.length ? true : false;

  return res
    .status(200)
    .send({ users: sliced_users, can_be_more: can_be_more });
}

function eliminateLikedUsers(matchable_users, users) {
  let eliminated_users = matchable_users.filter(
    (matchable_user) => JSON.stringify(users).indexOf(matchable_user._id) < 1
  );

  return eliminated_users;
}
