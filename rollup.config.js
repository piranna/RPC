import path from 'path';
import fs from 'fs';

const LIB_DIR = path.join('.', 'lib');
const CJS_DIR = path.join('.');

const files = fs.readdirSync(LIB_DIR);

const config = files.map((file) => ({
    external: [
        '.', '@journeyapps/domparser', 'crypto', 'error-to-json', 'object-path',
        'xmlrpc-serialization'
    ],
    input: path.join(LIB_DIR, file),
    output: [
        {
            exports: 'default',
            file: path.join(CJS_DIR, file),
            format: 'cjs',
            sourcemap: false,
        }
    ]
}));

export default config;
