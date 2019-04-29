const gulp = require('gulp'); 
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
var rename = require('gulp-rename');

/**
 * Uglify and rename index.js file in the src directory
 **/ 
gulp.task('uglify', () => {
    return gulp.src('src/index.js')
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(uglify())
        .pipe(rename('index.min.js'))
        .pipe(gulp.dest('src'))
});