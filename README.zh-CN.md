# @xuaic/local-typing-monaco

一个专门为 Monaco Editor 设计的本地类型定义解析器，用于从本地 node_modules 中解析和加载 TypeScript 类型定义。

[English](./README.md)

## 主要特性

- 🔍 从本地 node_modules 解析类型定义
- 🚀 递归解析包内的引用和导入
- 💾 内置内存缓存
- 🛠 可配置的解析选项
- 📦 支持多种类型定义来源：
  - ✨ 优先从 `@types` 包获取类型定义
  - 📝 包自带的类型定义文件
  - 🎯 package.json 中的 types、typings、exports、typeVersions 等字段
  - 🔄 自动生成默认类型（当找不到类型定义时）

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
  cacheEnabled: true, // 是否启用缓存
  baseUrl: '/node_modules', // node_modules 目录的路径
  pathPrefix: '', // 类型定义文件路径前缀
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
    fs: {
      // 允许访问上层目录的 node_modules
      allow: ['..']
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
  /**
   * 是否启用内存缓存
   * @default true
   */
  cacheEnabled?: boolean;
  
  /**
   * node_modules 的基础路径
   * @default '/node_modules'
   */
  baseUrl?: string;
  
  /**
   * 类型定义文件路径前缀
   * @default ''
   */
  pathPrefix?: string;
}
```

## 示例

查看 [example](./example) 目录获取完整的示例项目。示例使用原生 JavaScript 实现，没有构建依赖。

## 工作原理

当请求一个包的类型定义时，解析器会按以下顺序查找：

1. 首先检查是否存在对应的 `@types` 包（例如：对于 `lodash` 包，会先查找 `@types/lodash`）
2. 如果找到 `@types` 包，则使用其类型定义
3. 如果没有找到 `@types` 包，则尝试从原始包中获取类型定义：
   - 检查 package.json 中的类型相关字段
   - 查找默认的类型定义文件位置
   - 解析所有引用和导入
4. 如果以上都没有找到类型定义，则生成默认的 `any` 类型定义

所有解析到的类型定义都会被缓存，无论是通过 `@types` 包获取的还是从原始包获取的，以提高后续访问的性能。

## 局限性

- 只从根目录的 node_modules 解析类型
- 不处理嵌套的依赖关系
- 不解决包版本冲突问题
- 最适合开发环境使用

## 许可证

MIT 