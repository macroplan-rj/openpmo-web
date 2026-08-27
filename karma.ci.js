// Config temporario para rodar a suite headless em container (nao versionar).
const base = require('./karma.conf.js');
module.exports = function (config) {
  base(config);
  config.set({
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },
    reporters: ['progress'],
    autoWatch: false,
    singleRun: true,
    restartOnFileChange: false
  });
};
