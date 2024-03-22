import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

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
          ident: 'postcss',
          plugins: [tailwindcss, autoprefixer],
        },
      },
    ],
  },
};
