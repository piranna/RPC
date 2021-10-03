import fs from 'fs';
import { basename, join } from 'path';

const LIB_DIR = join('.', 'lib');
const CJS_DIR = join('.');

const external = [
    '.', '@journeyapps/domparser', '@xmldom/xmldom', 'crypto', 'error-to-json',
    'object-path', 'xmlrpc-serialization'
]

const files = fs.readdirSync(LIB_DIR);

const config = files.map(function(file)
{
    const outputFile = basename(file, '.js') + '.cjs';

    return {
        external,
        input: join(LIB_DIR, file),
        output: [
            {
                exports: 'default',
                file: join(CJS_DIR, outputFile),
                format: 'cjs',
                sourcemap: false,
            }
        ]
    }
});

export default config;
