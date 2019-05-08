import replace from 'rollup-plugin-replace';
import cleanup from 'rollup-plugin-cleanup';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import uglify from "rollup-plugin-uglify";

export default {
  input: 'src/webxr.js',
  output: {
    file: './dist/webxr-min.js',
    format: 'es'
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    commonjs(),
    resolve(),
    cleanup({
      comments: 'none',
    }),
    uglify()
  ]
};
