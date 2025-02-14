# @xuaic/local-typing-monaco

一个专门为 Monaco Editor 设计的本地类型定义解析器，用于从本地 node_modules 中解析和加载 TypeScript 类型定义。

[English](./README.md)

## 主要特性

- 🔍 从本地 node_modules 解析类型定义
- 🚀 递归解析包内的引用和导入
- 💾 内置内存缓存
- 🛠 可配置的解析选项
- 📦 支持多种类型定义格式（package.json 中的 types、typings、typeVersions 等）

## 重要说明

- 本库只从根目录的 node_modules 解析类型定义
- 不会递归解析包内的 node_modules 目录
- 不处理包版本冲突，因为只使用根目录下的包
- 适合在开发环境中使用本地类型定义的场景

## 安装

```bash
npm install @xuaic/local-typing-monaco
# 或
yarn add @xuaic/local-typing-monaco
```

## 使用方法

```typescript
import { TypeDefinitionResolver } from '@xuaic/local-typing-monaco';

const resolver = new TypeDefinitionResolver({
  cacheEnabled: true,
  recursionLimit: 10,
  baseUrl: '/node_modules', // node_modules 目录的路径
  cachePrefix: 'typing-cache' // 内存缓存前缀
});

// 解析包的类型定义
const typeDefinitions = await resolver.resolveTypeDefinition('lodash');

// 将类型定义添加到 Monaco Editor
typeDefinitions.forEach(def => {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    def.content,
    def.filePath
  );
});
```

## 静态资源托管

本库需要通过 HTTP 请求访问你的 node_modules 目录。你需要为 node_modules 目录设置静态文件托管。以下是几种方式：

1. 使用 Express.js：
```javascript
app.use('/node_modules', express.static('node_modules'));
```

2. 使用 Vite：
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/node_modules': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node_modules/, '')
      }
    }
  }
}
```

3. 使用 Nginx：
```nginx
location /node_modules {
    alias /path/to/your/node_modules;
    autoindex off;
}
```

注意事项：
- 根据需要设置正确的 CORS 头
- 配置适当的安全措施
- 仅在开发环境中启用

## 配置选项

```typescript
interface TypesResolveOptions {
  // 是否启用内存缓存
  cacheEnabled?: boolean;
  // node_modules 的基础路径
  baseUrl?: string;
  // 类型定义文件路径前缀
  pathPrefix?: string;
}
```

## 示例

查看 [example](./example) 目录获取完整的示例项目。示例使用原生 JavaScript 实现，没有构建依赖。

## 工作原理

1. 首先尝试从 package.json 中读取类型定义相关信息
2. 按照以下优先级查找类型定义：
   - typeVersions 字段
   - exports.types 字段
   - types/typings 字段
   - 默认的 index.d.ts
3. 递归解析包内所有的引用（/// <reference>）和导入语句
4. 将结果缓存到内存中

## 局限性

- 只从根目录的 node_modules 解析类型
- 不处理嵌套的依赖关系
- 不解决包版本冲突问题
- 最适合开发环境使用

## 许可证

MIT 