const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: 'dybgekx5y',
  api_key: '155751357817734',
  api_secret: 'G7LXcDmPpLrhEPdvc3sNbGFtvto',
});

module.exports = cloudinary;
