module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            // eslint-disable-next-line global-require
            plugins: [require('tailwindcss'), require('autoprefixer')],
          },
        },
      },
    ],
  },
};
