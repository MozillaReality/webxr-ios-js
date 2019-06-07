/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

import fs from 'fs';
import path from 'path';
import replace from 'rollup-plugin-replace';
import cleanup from 'rollup-plugin-cleanup';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import uglify from "rollup-plugin-uglify";
const banner = fs.readFileSync(path.join(__dirname, 'licenses.txt'));

export default [
  {
    input: 'src/webxr.js',
    output: {
    //  banner: banner
      file: './dist/webxr-min.js',
      format: 'umd',
      name: 'WebXRPolyfill'
    },
    plugins: rollupPlugins() 
  }]
  

function rollupPlugins() {
  return [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      commonjs(),
      resolve(),
      cleanup({
        comments: 'none',
      }),
      uglify()
    ];
}
