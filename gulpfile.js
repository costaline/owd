// plugins

var gulp = require("gulp");
var less = require("gulp-less");
var sass = require("gulp-sass");
var plumber = require("gulp-plumber");
var posthtml = require("gulp-posthtml");
var include = require("posthtml-include");
var autoprefixer = require("gulp-autoprefixer");
var imagemin = require("gulp-imagemin");
var svgstore = require("gulp-svgstore");
var cheerio = require("gulp-cheerio");
var rename = require("gulp-rename");
var browserSync = require("browser-sync").create();
var del = require("del");
var sourcemaps = require("gulp-sourcemaps");
var uglify = require("gulp-uglify");
var flatten = require("gulp-flatten");
var filter = require("gulp-filter");
var imageminMozjpeg = require("imagemin-mozjpeg");
var csso = require("gulp-csso");
var gulpif = require("gulp-if");
var argv = require("yargs").argv;
var gcmq = require("gulp-group-css-media-queries");
var debug = require("gulp-debug");

// functions
function clean() {
  return del(["build/*"]);
}

function copy() {
  return gulp
    .src(["source/fonts/**/*.{woff,woff2}", "source/lib/**"], {
      base: "source"
    })
    .pipe(gulp.dest("build"));
}

function normalize() {
  return gulp
    .src(["node_modules/normalize.css/normalize.css"])
    .pipe(gulp.dest("build/css"));
}

function style() {
  return gulp
    .src("source/style/style.*")
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(debug({ title: "scss or less" }))
    .pipe(gulpif("**/*.scss", sass(), less()))
    .pipe(gulpif(argv.group, gcmq()))
    .pipe(autoprefixer({ cascade: false }))
    .pipe(gulpif(!argv.prod, sourcemaps.write(".")))
    .pipe(gulpif(!argv.prod, gulp.dest("build/css")))
    .pipe(gulpif(!argv.prod, filter("**/*.css")))
    .pipe(csso())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulpif(!argv.prod, sourcemaps.write(".")))
    .pipe(gulp.dest("build/css"))
    .pipe(browserSync.stream());
}

function html() {
  return gulp
    .src("source/*.html")
    .pipe(posthtml([include()]))
    .pipe(gulp.dest("build"));
}

function script() {
  return gulp
    .src("source/js/*.js")
    .pipe(uglify({ toplevel: true }))
    .pipe(gulp.dest("build/js"))
    .pipe(browserSync.stream());
}

function images() {
  return gulp
    .src([
      "source/blocks/**/img/*.{png,jpg,jpeg,svg}",
      "!source/blocks/**/img/*-icon.svg"
    ])
    .pipe(flatten())
    .pipe(
      imagemin([
        imagemin.optipng({ optimizationLevel: 3 }),
        imagemin.jpegtran({ progressive: true }),
        imageminMozjpeg({ quality: 85 }),
        imagemin.svgo()
      ])
    )
    .pipe(gulp.dest("build/img"));
}

function sprite() {
  return gulp
    .src("source/blocks/**/img/*-icon.svg")
    .pipe(
      cheerio({
        run: function($) {
          $("[fill]").removeAttr("fill");
        },
        parserOptions: { xmlMode: true }
      })
    )
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("build/img"));
}

function browserSyncReload(done) {
  browserSync.reload();
  done();
}

function watch() {
  browserSync.init({
    server: { baseDir: "build/" },
    port: 3000
  });

  gulp.watch("source/**/style/**/*.??ss", style);
  gulp.watch("source/js/*.js", script);
  gulp.watch("source/*.html", gulp.series(html, browserSyncReload));
}

// complex tasks

var build = gulp.series(
  clean,
  copy,
  normalize,
  sprite,
  gulp.parallel(style, html, script, images)
);
var dev = gulp.series(build, watch);

// export tasks

exports.clean = clean;
exports.style = style;
exports.sprite = sprite;
exports.html = html;
exports.script = script;
exports.images = images;
exports.copy = copy;
exports.watch = watch;
exports.normalize = normalize;

exports.default = build;
exports.build = build;
exports.dev = dev;
