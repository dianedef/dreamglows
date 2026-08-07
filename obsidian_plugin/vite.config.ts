import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: parseInt(process.env.PORT) || 3000
    }
  },
    plugins: [
        vue(),
        nodeResolve({
            browser: true,
            preferBuiltins: true
        }),
        commonjs({
            include: [/node_modules/],
            transformMixedEsModules: true,
            requireReturnsDefault: 'auto'
        })
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            formats: ['cjs'],
            fileName: () => 'main.js',
            cssFileName: 'styles'
        },
        rollupOptions: {
            external: ['obsidian'],
            output: {
                format: 'cjs',
                exports: 'named',
                entryFileNames: 'main.js',
                chunkFileNames: 'main.js',
                assetFileNames: '[name].[ext]',
                globals: {
                    obsidian: 'obsidian'
                },
                inlineDynamicImports: true
            }
        },
        commonjsOptions: {
            include: [
                /node_modules\/p-queue/,
                /node_modules\/@langchain/
            ],
            transformMixedEsModules: true
        },
        outDir: '.',
        emptyOutDir: false,
        sourcemap: 'inline',
        minify: false,
        target: 'es2018'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            'p-queue': resolve(__dirname, 'node_modules/p-queue/dist/index.js')
        }
    }
});
