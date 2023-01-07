const User = require("../schema/user.schema");

module.exports.getUsersWithPostCount = async (req, res) => {
  try {
    const limit = req.query.limit * 1 || 10;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    const filter = [
      { 
        $facet: { userCount: [ { $count: "count" }],
          users: [
            { $skip: skip },
            { $limit: limit },
            { $lookup: { 
                from: "posts", let: { uid: "$_id" }, as: "posts",
                pipeline: [ { $match: { $expr: { $eq: ["$$uid", "$userId"] } } },  { $count: "count" } ],
              },
            },
            { $addFields: { posts: { $first: "$posts.count" }}},
            { $unset: "__v" },
          ],
        },
      },
      {
        $addFields: {
          totalDocs: { $first: "$userCount.count" },
          totalPages: { $ceil: { $divide: [ { $first: "$userCount.count" }, limit ]}},
          pagingCounter: limit*(page -1) + 1,
          page: page,
          limit: limit,
        },
      },
      {
        $project: {
          users: 1,
          pagination: {
            totalDocs: "$totalDocs",
            limit: "$limit",
            page: "$page",
            totalPages: "$totalPages",
            pagingCounter: "$pagingCounter",
            hasPrevPage: {
              $cond: { if: { $ne: [ "$page", 1 ] }, then: true, else: false }
            },
            hasNextPage: {
              $cond: { if: { $lt: [ "$page", "$totalPages" ] }, then: true, else: false }
            },
            prevPage: {
              $cond: { if: { $ne: [ "$page", 1 ] }, then: {$subtract: ["$page", 1]}, else: null }
            },
            nextPage: {
              $cond: { if: { $lt: [ "$page", "$totalPages" ] }, then: {$add: ["$page", 1]}, else: null }
            },
          },
        },
      },
    ];

    const users = await User.aggregate(filter);

    res.status(200).json({
      data: users[0],
    });
  } catch (error) {
    res.send({ error: error.message });
  }
};
