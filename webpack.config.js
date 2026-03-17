const path              = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin        = require('copy-webpack-plugin');

module.exports = (env, argv) => ({
  entry: './js/main.js',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  // Tell webpack that 'phaser' is not bundled — it comes from the global `Phaser`
  // loaded via CDN in index.html. This drops the bundle from ~1.2MB to ~100KB.
  externals: {
    phaser: 'Phaser',
  },
  devtool: argv.mode === 'production' ? false : 'eval-source-map',
  devServer: {
    static: './dist',
    hot: false,
    liveReload: true,
    port: 8080,
    open: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body',
    }),
    // Ship a local Phaser copy so the CDN onerror fallback in index.html works offline
    new CopyPlugin({
      patterns: [{ from: 'node_modules/phaser/dist/phaser.min.js', to: 'phaser.min.js' }],
    }),
  ],
  resolve: {
    extensions: ['.js'],
  },
  performance: { hints: false },
});
