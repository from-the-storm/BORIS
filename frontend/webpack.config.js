const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: {
        main: "./main.tsx",
        admin: "./admin/app.tsx",
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
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

            // We include SCSS files and extract them to a combined output file
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract({
                    use: [
                        { loader: 'css-loader', options: { minimize: true } },
                        { loader: 'sass-loader' },
                    ],
                }),
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
        new ExtractTextPlugin('style.css', {
            allChunks: true,
        })
    ]
};
