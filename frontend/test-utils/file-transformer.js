/**
 * Generate a string so that React components which import SCSS or SVG files (via webpack)
 * can still be tested.
 * Configured for Jest in package.json ("transform" setting)
 */

module.exports = {
    process(src, filename, config, options) {
        const path = filename.substr(filename.lastIndexOf('frontend/')); // Remove the previx like "/Users/foo/Documents/boris" that will vary
        // Add the hash like file-loader does, converting 'frontend/images/foo.png' to 'frontend/images/foo-HASH.png'
        const outputPath = path.substr(0, path.lastIndexOf('.')) + '-HASH' + path.substr(path.lastIndexOf('.'));
        return 'module.exports = ' + JSON.stringify(outputPath) + ';';
    },
};
