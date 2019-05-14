const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        main: "./main.tsx",
        admin: "./admin/app.tsx",
        style: "./global/global-styles.scss",
    },
    output: {
        filename: "[name].js",
        path: __dirname + "/dist",
        publicPath: '/s/',
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader",
                options: {
                    // Supress warnings related to random .ts files that may be found in node_modules
                    // but aren't even used by our app. Only report errors for our frontend code.
                    reportFiles: "./**/*.{ts,tsx}"
                },
            },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

            // We include SCSS files and extract them to a combined output file
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader, // 4: extract the style sheets into a dedicated file
                    'css-loader',                // 3: translates CSS into CommonJS
                    'resolve-url-loader',        // 2: Fix relative url() references that Sass can't do natively
                    { 
                        loader: 'sass-loader',   // 1: compiles Sass to CSS, using Node Sass by default
                        options: {sourceMap: true, }  // SourceMap is required for resolve-url-loader
                    }
                ],
            },
            // Include images, either automatically inlined as data URLs or served from the 'dist' folder.
            {
                test: /\.(png|jp(e*)g|svg)$/,  
                use: [{
                    loader: 'url-loader',
                    options: { 
                        limit: 8000, // Convert images < 8kb to base64 strings
                        name: 'images/[name]-[hash].[ext]'
                    } 
                }]
            },
            // Include audio files, either automatically inlined as data URLs or served from the 'dist' folder.
            {
                test: /\.(mp3)$/,  
                use: [{
                    loader: 'url-loader',
                    options: { 
                        limit: 4000, // Convert sounds < 4kb to base64 strings
                        name: 'sounds/[name]-[hash].[ext]'
                    } 
                }]
            },
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        "react": "React",
        "react-dom": "ReactDOM"
    },

    plugins: [
        new CopyWebpackPlugin([
            {from:'other-images', to:'images'} 
        ]),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: '[name].css',
        }),
    ],
};
