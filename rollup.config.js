import path from 'path';
import fs from 'fs';

const LIB_DIR = path.join('.', 'lib');
const CJS_DIR = path.join('.', 'dist', 'cjs');
const ES_DIR = path.join('.', 'dist', 'es');

const files = fs.readdirSync(LIB_DIR);
console.log(files);

const config = files.map((file) => ({
    input: path.join(LIB_DIR, file),
    output: [
        {
            file: path.join(CJS_DIR, file),
            format: 'cjs',
            sourcemap: false,
        }, {
            file: path.join(ES_DIR, file),
            format: 'es',
            sourcemap: false,
        }
    ]
}));

export default config;
