/**
 * 构建开发环境
 *
 * node scripts/dev.js --format cjs
 */
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
    values: { format },
    positionals,
} = parseArgs({
    allowPositionals: true,
    options: {
        format: {
            type: 'string',
            short: 'f',
            default: 'esm',
        },
    },
});

// 创建esm的filename和dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const target = positionals.length ? positionals[0] : 'vue';

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);

// 打包的文件输出位置
const outfile = resolve(
    __dirname,
    `../packages/${target}/dist/${target}.${format}.js`,
);

const pkg = require('../packages/' + target + '/package.json');

esbuild
    .context({
        entryPoints: [entry], // 入口文件
        outfile, // 输出文件
        bundle: true, // 是否打包依赖(把所有依赖打包到一个文件中)
        sourcemap: true, // 生成source map文件，方便调试
        format, // 输出格式 esm/cjs/iife
        platform: format === 'esm' ? 'browser' : 'node', // 打包平台
        globalName: pkg.buildOptions?.name, // 全局变量名称，只在iife格式下有效
    })
    .then(ctx => {
        // 启动监听文件变化并重新构建
        ctx.watch().then(() => {
            console.log(`正在监听 ${target} 文件的变化...`);
        });
    });
