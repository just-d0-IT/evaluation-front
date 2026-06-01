const {defineConfig} = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    devServer: {
        proxy: {
            '/api': {
                target: 'http://localhost:19999', // 目标地址
                changeOrigin: true, // 是否改变源地址
                pathRewrite: {
                    '^/api': '' // 将 /api 重写为 ''
                }
            }
        }
    }
})
