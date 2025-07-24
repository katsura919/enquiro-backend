// User app module exports
// This follows Django-like app structure where each app has its own views and URLs

const userUrls = require('./urls');

module.exports = {
  urls: userUrls,
};
