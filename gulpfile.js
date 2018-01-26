var gulp         = require('gulp'),
    sass         = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    hash         = require('gulp-hash'),
    fingerprint  = require('gulp-fingerprint'),
    uglify       = require('gulp-uglify'),
    connect      = require('gulp-connect'),
    sequence     = require('run-sequence'),
    webpack      = require('webpack-stream'),
    del          = require('del');

var execSync = require('child_process').execSync;

var { ProvidePlugin } = require('webpack');

var paths = {
  src: 'src',
  dest: 'static',
  data: 'data',
  public: 'public',
};

gulp.task('default', ['connect', 'watch']);

gulp.task('connect', function() {
  connect.server({
    root: paths.public,
    livereload: true,
  });
});

gulp.task('build', ['js', 'images', 'scss'], function(done) {
  sequence('hugo', done);
});

gulp.task('prod', function(done) {
  sequence(
    'js', 'js:uglify', 'js:hash',
    'images', 'images:hash',
    'scss', 'scss:fingerprint', 'scss:hash',
    'hugo',
    done);
});

gulp.task('scss', function() {
  del([paths.dest + '/css/**/*', paths.data + '/css/hash.json']);

  return gulp.src(paths.src + '/scss/main.scss')
    .pipe(sass({
      outputStyle: 'compressed',
      includePaths: ['node_modules'],
    }))
    .pipe(autoprefixer({
      browsers: ["last 20 versions"]
    }))
    .pipe(gulp.dest(paths.dest + '/css'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/css'));
});

gulp.task('scss:fingerprint', function() {
  manifest = require('./' + paths.data + '/images/hash.json');

  var options = {
    prefix: '../images/',
    verbose: true,
  };

  return gulp.src(paths.dest + '/css/main.css')
    .pipe(fingerprint(manifest, options))
    .pipe(gulp.dest(paths.dest + '/css'));
});

gulp.task('scss:hash', function() {
  del([paths.data + '/css/hash.json']);

  return gulp.src(paths.dest + '/css/main.css')
    .pipe(hash())
    .pipe(gulp.dest(paths.dest + '/css'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/css'));
});

gulp.task('images', function() {
  del([paths.dest + '/images/**/*', paths.data + '/images/hash.json']);

  return gulp.src(paths.src + '/images/**/*')
    .pipe(gulp.dest(paths.dest + '/images'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/images'));
});

gulp.task('images:hash', function() {
  del([paths.data + '/images/hash.json']);

  return gulp.src(paths.src + '/images/**/*')
    .pipe(hash())
    .pipe(gulp.dest(paths.dest + '/images'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/images'));
});

gulp.task('js', function() {
  del([paths.dest + '/js/**/*', paths.data + '/js/hash.json']);

  return gulp.src(paths.src + '/js/main.js')
    .pipe(webpack({
      output: {
        filename: "main.js"
      },
      resolve: {
        alias: {
          // some packages only work if you create an alias for them
          // here is the place to do so
        }
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['env']
              }
            }
          }
        ]
      },
      plugins: [
        // Some dependencies must be globally available.
        // https://getbootstrap.com/docs/4.0/getting-started/webpack/
        // https://github.com/webpack/webpack/issues/542#issuecomment-59664371
        new ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery',
          Popper: ['popper.js', 'default']
        }),
      ]
    }))
    .pipe(gulp.dest(paths.dest + '/js'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/js'));
});

gulp.task('js:uglify', function() {
  return gulp.src(paths.dest + '/js/main.js')
    .pipe(uglify())
    .pipe(gulp.dest(paths.dest + '/js'));
});

gulp.task('js:hash', function() {
  del([paths.data + '/css/hash.json']);

  return gulp.src(paths.dest + '/js/main.js')
    .pipe(hash())
    .pipe(gulp.dest(paths.dest + '/js'))
    .pipe(hash.manifest('hash.json'))
    .pipe(gulp.dest(paths.data + '/js'));
});

gulp.task('watch', ['build'], function() {
  gulp.watch(paths.src + '/scss/**/*', ['scss']);
  gulp.watch(paths.src + '/images/**/*', ['images', 'scss']);
  gulp.watch(paths.src + '/js/**/*', ['js']);

  gulp.watch(
    [
      'layouts/**/*',
      paths.dest + '/**/*',
      paths.src + '/data/**/hash.json',
    ],
    ['hugo']);
});

gulp.task('hugo', function() {
  var output = execSync('$(npm bin)/hugo -v');
  console.log(output.toString('utf8'));

  return gulp.src(paths.public + '/**/*')
             .pipe(connect.reload());
});
