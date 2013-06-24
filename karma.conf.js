// Karma configuration file

// base path, that will be used to resolve files and exclude
basePath = '';

// list of files / patterns to load in the browser
files = [
    JASMINE,
    JASMINE_ADAPTER,

    'xdm.js',

    {pattern: 'test/fixture/**/*.html', watched: true, served: true, included: false},

    'test/spec/**/*.js'
];

// use dots reporter, as travis terminal does not support escaping sequences
// possible values: 'dots', 'progress', 'junit', 'teamcity'
// CLI --reporters progress
reporters = ['dots'];

// web server port
// CLI --port 9876
port = 9876;

// cli runner port
// CLI --runner-port 9100
runnerPort = 9100;

// enable / disable watching file and executing tests whenever any file changes
// CLI --auto-watch --no-auto-watch
autoWatch = true;

// start these browsers
// CLI --browsers Chrome,Firefox,Safari
browsers = [
    'Chrome',
    'Firefox'
];

// auto run tests on start (when browsers are captured) and exit
// CLI --single-run --no-single-run
singleRun = false;
