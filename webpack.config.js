/**
 * Created by lunik on 04/07/2017.
 */
const webpack = require('webpack')
var nodeExternals = require('webpack-node-externals')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
var UnminifiedWebpackPlugin = require('unminified-webpack-plugin')

const BUILD_DIR = __dirname + '/build'

const DEV = process.env.NODE_ENV !== 'production'

const uglifyPlugin = DEV ? new UnminifiedWebpackPlugin() : new UglifyJsPlugin()

module.exports = [
  {
    entry: './src/index.js',
    watch: DEV,
    output: {
      path: BUILD_DIR,
      filename: 'server.js'
    },
    module: {
      loaders: [{
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }]
    },
    target: 'node',
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals()],
    plugins: [
      uglifyPlugin
    ]
  }
]
