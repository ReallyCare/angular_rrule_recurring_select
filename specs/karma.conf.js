module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha-debug', 'mocha', 'chai', 'sinon'],
    files: [
      '../node_modules/angular/angular.js',
      '../node_modules/moment/moment.js',
      '../node_modules/rrule/dist/es5/rrule.js',
      '../node_modules/angular-mocks/angular-mocks.js',
      '../node_modules/lodash/lodash.js',
      '../node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
      '../node_modules/fng-bootstrap-datetime/fng-bootstrap-datetime.js',
      '../lib/rrule_recurring_select.js',
      './support/spec_helper.js',
      './unit/**/*_spec.js',
      '../template/*.html'
    ],
    watched: [
    ],
    exclude: [],
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '../template/*.html': 'ng-html2js'
    },
    ngHtml2JsPreprocessor: {
        // If your build process changes the path to your templates,
        // use stripPrefix and prependPrefix to adjust it.
        //stripPrefix: "source/path/to/templates/.*/",
        // prependPrefix: "web/path/to/templates/",
        cacheIdFromPath: function(filepath) {
          var path = filepath.match(/(template\/.*$)/)[0];
          console.log("cached filepath: " + path);
          return path;
        },

        // the name of the Angular module to create
        moduleName: "rruleTemplates"
    },
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots'],
    port: 9877,
    colors: true,
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    autoWatch: true,
    customLaunchers: {
      ChromeHeadless: {
        base: "Chrome",
        flags: [
          "--headless",
          "--disable-gpu",
          // Without a remote debugging port, Google Chrome exits immediately.
          "--remote-debugging-port=9222"
        ]
      }
    },

    browsers: ["ChromeHeadless"],
    // browsers : ['Firefox'],
    singleRun: false
  });
};
