"use strict";

//Require Dependencies
const gulp       = require("gulp"),
    sass         = require("gulp-sass"),
    rename       = require("gulp-rename"),
    browserSync  = require("browser-sync").create(),
    clean        = require("del"),
    gulpif       = require("gulp-if"),
    useref       = require("gulp-useref"),
    imagemin     = require("gulp-imagemin"),
    newer        = require("gulp-newer"),
    uglify       = require("gulp-uglify"),
    uncss        = require("gulp-uncss"),
    cssnano      = require("gulp-cssnano");

//Production mode state
let isProduction = false;

const paths = {
    styles: [
        "./src/styles/index.scss",
        "./src/styles/**/*.scss",
        "./src/styles/**/*.css"
    ],
    images: [
        "./src/img/**/*.+(png|jpg|jpeg|gif|svg)"
    ],
    fonts: [
        "./src/fonts/**/*.+(eot|woff2|woff|ttf|svg|otf)"
    ],
    code: [
        "./src/**/*.+(html|php)",
        "!./src/fonts/", "!./src/fonts/**",
        "!./src/img/", "!./src/img/**",
        "!./src/js/", "!./src/js/**",
        "!./src/styles/", "!./src/styles/**"
    ],
    js: [
        "./src/js/**/*.js",
        "./node_modules/bootstrap/dist/js/bootstrap.min.js"
    ]
};

const dests = {
    styles: "dist/styles",
    images: "dist/img",
    fonts: "dist/fonts",
    code: "dist",
    js: "dist/js"
};

gulp.task("scss", () =>
    gulp
        .src(paths.styles)
        .pipe(sass().on("error", sass.logError))
        .pipe(rename("style.css"))
        .pipe(gulpif(isProduction, uncss({
            html: ["./src/**/*.+(html|php)"]
        })))
        .pipe(gulpif(isProduction, cssnano({ //Minify CSS
            discardComments: {removeAll: true} //Remove comments
        })))
        .pipe(gulpif(!isProduction, browserSync.reload({
            stream: true
        })))
        .pipe(gulp.dest(dests.styles))
);

//Copy 'code' files (html, php, etc)
gulp.task("copyCode", () =>
    gulp
        .src(paths.code)
        .pipe(gulpif(!isProduction, browserSync.reload({
            stream: true
        })))
        .pipe(gulpif(isProduction, useref()))
        .pipe(gulp.dest(dests.code))
);

//Copy font files
gulp.task("copyFonts", () =>
    gulp
        .src(paths.fonts)
        .pipe(gulpif(!isProduction, browserSync.reload({
            stream: true
        })))
        .pipe(gulp.dest(dests.fonts))
);

//Copy JS files
gulp.task("copyJs", () =>
    gulp
        .src(paths.js)
        .pipe(gulpif(!isProduction, browserSync.reload({
            stream: true
        })))
        .pipe(gulp.dest(dests.js))
);

//Look for images and image changes, if production mode is set use imagemin to compress the images
gulp.task("images", () =>
    gulp
        .src(paths.images)
        .pipe(gulpif(!isProduction, newer(dests.images)))
        .pipe(gulpif(!isProduction, browserSync.reload({
            stream: true
        })))
        .pipe(gulpif(isProduction, imagemin()))
        .pipe(gulp.dest(dests.images))
);

//Combine JS files
gulp.task("useref", () =>
    gulp
        .src(paths.code)
        .pipe(gulpif(isProduction, useref()))
        .pipe(gulpif("*.js", uglify()))
        .pipe(gulp.dest(dests.code))
);

//Set tasks to production mode
gulp.task("buildProduction", done => {
    isProduction = true;
    done();
});

//Delete the contents of 'dist' folder
gulp.task("clean", done => {
    clean.sync("dist");
    done();
});

gulp.task("default", gulp.series("scss", "copyCode", "copyFonts", "copyJs", "useref", "images"));

//Launch server and watch for changes and trigger main tasks when change is detected
gulp.task("watch", () => {
    gulp.series("scss", "copyCode", "copyFonts", "copyJs", "useref", "images");
    browserSync.init({
        server: {
            baseDir: "dist"
        },
        port: 1337
    });
    gulp.watch(paths.code, gulp.series("copyCode")).on("change", browserSync.reload);
    gulp.watch(paths.js, gulp.series("copyJs")).on("change", browserSync.reload);
    gulp.watch(paths.images, gulp.series("images")).on("change", browserSync.reload);
    gulp.watch(["./src/styles/index.scss", "./src/styles/**/*.scss", "./src/styles/**/*.css"], gulp.series("scss"))
        .on("change", browserSync.reload); //Invoke when change is detected
});

//Run main tasks and minify + uglify to make deliverable assets for production
gulp.task("dist", gulp.series("clean", "buildProduction", "scss", "copyCode", "copyFonts", "useref", "images"));
