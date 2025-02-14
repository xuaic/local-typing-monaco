var TypeDefinitionSource;
(function (TypeDefinitionSource) {
    TypeDefinitionSource["PACKAGE_JSON"] = "package.json";
    TypeDefinitionSource["BACKEND"] = "backend";
    TypeDefinitionSource["DEFAULT"] = "default";
    TypeDefinitionSource["REFERENCE"] = "reference";
    TypeDefinitionSource["IMPORT"] = "import";
})(TypeDefinitionSource || (TypeDefinitionSource = {}));

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) ; else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

var pathBrowserify = posix;

var pathBrowserify$1 = /*@__PURE__*/getDefaultExportFromCjs(pathBrowserify);

/**
 * Memory cache for storing type definitions
 */
class MemoryCache {
    constructor(prefix = 'typing-cache') {
        this.prefix = prefix;
        this.cache = new Map();
    }
    /**
     * Get cache key for package
     * @param packageName Package name
     * @returns Cache key
     */
    getKey(packageName) {
        return `${this.prefix}:${packageName}`;
    }
    /**
     * Get cached entry for package
     * @param packageName Package name
     * @returns Cached entry or null
     */
    getItem(packageName) {
        try {
            const key = this.getKey(packageName);
            return this.cache.get(key) || null;
        }
        catch (error) {
            console.error('Error reading from cache:', error);
            return null;
        }
    }
    /**
     * Set cache entry for package
     * @param packageName Package name
     * @param results Type definition results
     * @param mainTypePath Main type file path
     */
    set(packageName, results, mainTypePath) {
        try {
            const key = this.getKey(packageName);
            const entry = {
                results,
                mainTypePath,
                fullyResolved: true
            };
            this.cache.set(key, entry);
        }
        catch (error) {
            console.error('Error writing to cache:', error);
        }
    }
    /**
     * Clear all cache entries
     */
    clear() {
        try {
            this.cache.clear();
        }
        catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}

function normalizePath(path) {
    return path.replace(/\\/g, '/');
}
class TypeDefinitionResolver {
    constructor(options = {}) {
        this.options = {
            cacheEnabled: true,
            baseUrl: '/node_modules',
            pathPrefix: '',
            ...options
        };
        this.cache = new MemoryCache('typing-cache');
        this.processedFiles = new Set();
    }
    getFilePath(packageName, relativePath) {
        // 先处理包内路径
        const packagePath = pathBrowserify$1.join(packageName, relativePath);
        // 直接拼接 pathPrefix，不使用 pathBrowserify.join
        return normalizePath(`${this.options.pathPrefix}${packagePath}`);
    }
    /**
     * Resolve type definitions for a package
     * @param packageName Package name
     * @returns Type definition results
     */
    async resolveTypeDefinition(packageName) {
        // Reset processed files set
        this.processedFiles.clear();
        if (this.options.cacheEnabled) {
            const cached = this.cache.getItem(packageName);
            if (cached && cached.fullyResolved) {
                return cached.results;
            }
        }
        try {
            const results = [];
            // 确定要查找的包名
            let typesPackageName;
            if (packageName.startsWith('@types/')) {
                // 如果已经是 @types 包,直接使用
                typesPackageName = packageName;
            }
            else {
                // 否则转换为 @types 包名
                typesPackageName = `@types/${packageName.replace('@', '').replace('/', '__')}`;
                // 检查 @types 包是否已经缓存
                if (this.options.cacheEnabled) {
                    const typesCache = this.cache.getItem(typesPackageName);
                    if (typesCache && typesCache.fullyResolved) {
                        return typesCache.results;
                    }
                }
            }
            try {
                const typesPackageJson = await this.fetchPackageJson(typesPackageName);
                results.push({
                    content: JSON.stringify(typesPackageJson),
                    filePath: this.getFilePath(typesPackageName, 'package.json'),
                    source: TypeDefinitionSource.PACKAGE_JSON
                });
                const typesPaths = await this.resolveTypePaths(typesPackageJson);
                for (const typePath of typesPaths) {
                    const typeResults = await this.resolveTypeFiles(typesPackageName, typePath);
                    if (typeResults.length > 0) {
                        results.push(...typeResults);
                    }
                }
                // 如果找到了 @types 包的类型定义
                if (results.length > 1) {
                    if (this.options.cacheEnabled) {
                        // 同时缓存原始包名和 @types 包名的结果
                        this.cache.set(packageName, results);
                        if (typesPackageName !== packageName) {
                            this.cache.set(typesPackageName, results);
                        }
                    }
                    return results;
                }
            }
            catch (error) {
                // 忽略错误,继续尝试从原始包获取类型
                console.debug(`No @types package found for ${packageName}, trying original package`);
            }
            const packageJson = await this.fetchPackageJson(packageName);
            results.push({
                content: JSON.stringify(packageJson),
                filePath: this.getFilePath(packageName, 'package.json'),
                source: TypeDefinitionSource.PACKAGE_JSON
            });
            const typePaths = await this.resolveTypePaths(packageJson);
            let mainTypePath;
            for (const typePath of typePaths) {
                const typeResults = await this.resolveTypeFiles(packageName, typePath);
                if (typeResults.length > 0) {
                    results.push(...typeResults);
                    // Record main type file path
                    if (!mainTypePath && typePath.endsWith('index.d.ts')) {
                        mainTypePath = typePath;
                    }
                }
            }
            // If no type definitions found, use default any type
            if (results.length === 0) {
                results.push(this.generateDefaultTypings(packageName));
            }
            if (this.options.cacheEnabled) {
                this.cache.set(packageName, results, mainTypePath);
            }
            return results;
        }
        catch (error) {
            console.error(`Error resolving types for ${packageName}:`, error);
            // Return default type on error
            return [this.generateDefaultTypings(packageName)];
        }
    }
    /**
     * Generate default any type definition
     * @param packageName Package name
     * @returns Default type definition result
     */
    generateDefaultTypings(packageName) {
        const content = this.generateDefaultTypeDefinition(packageName);
        return {
            content,
            filePath: this.getFilePath(packageName, 'index.d.ts'),
            source: TypeDefinitionSource.DEFAULT
        };
    }
    /**
     * Generate default type definition content
     * @param packageName Package name
     * @returns Type definition content
     */
    generateDefaultTypeDefinition(packageName) {
        return `
/**
 * Default type definition for ${packageName}
 * This is an auto-generated fallback definition.
 */

declare module '${packageName}' {
    const content: any;
    export default content;
    export * from '${packageName}/*';
}

declare module '${packageName}/*' {
    const content: any;
    export default content;
    export * as namespace ${packageName};
}
`;
    }
    /**
     * Fetch package.json content
     * @param packageName Package name
     * @returns package.json content
     */
    async fetchPackageJson(packageName) {
        const response = await fetch(`${this.options.baseUrl}/${packageName}/package.json`);
        if (!response.ok) {
            throw new Error(`Failed to fetch package.json for ${packageName}`);
        }
        return response.json();
    }
    /**
     * Resolve all possible type definition file paths
     * @param packageJson package.json content
     * @returns Array of type definition file paths
     */
    async resolveTypePaths(packageJson) {
        const paths = new Set();
        // 1. Check typeVersions
        if (packageJson.typeVersions) {
            for (const version in packageJson.typeVersions) {
                const typeVersionPaths = packageJson.typeVersions[version];
                if (Array.isArray(typeVersionPaths)) {
                    typeVersionPaths.forEach(path => {
                        if (path.includes('*')) {
                            // Handle wildcards for packages like rxjs
                            const basePath = path.replace('*', '');
                            // Add main entry
                            paths.add(pathBrowserify$1.join(basePath, 'index.d.ts'));
                            // Add all possible submodules
                            const subModules = ['internal', 'ajax', 'operators', 'testing', 'webSocket', 'fetch'];
                            for (const module of subModules) {
                                paths.add(pathBrowserify$1.join(basePath, module, 'index.d.ts'));
                            }
                        }
                        else {
                            paths.add(path);
                        }
                    });
                }
                else if (typeof typeVersionPaths === 'object') {
                    // Handle mapped type versions
                    Object.values(typeVersionPaths).forEach(pathArray => {
                        if (Array.isArray(pathArray)) {
                            pathArray.forEach(path => paths.add(path));
                        }
                    });
                }
            }
        }
        // 2. Check exports.types
        if (packageJson.exports) {
            const addExportTypes = (obj, prefix = '') => {
                for (const [key, value] of Object.entries(obj)) {
                    if (value && typeof value === 'object') {
                        if ('types' in value && typeof value.types === 'string') {
                            paths.add(value.types);
                        }
                        if (!key.startsWith('.')) {
                            addExportTypes(value, `${prefix}${key}/`);
                        }
                        else {
                            addExportTypes(value, prefix);
                        }
                    }
                    else if (typeof value === 'string' && key === 'types') {
                        paths.add(value);
                    }
                }
            };
            addExportTypes(packageJson.exports);
        }
        // 3. Check traditional type fields
        if (packageJson.types) {
            paths.add(packageJson.types);
        }
        if (packageJson.typings) {
            paths.add(packageJson.typings);
        }
        // 4. Default paths
        paths.add('index.d.ts');
        paths.add('dist/index.d.ts');
        paths.add('dist/types/index.d.ts');
        return Array.from(paths);
    }
    /**
     * Normalize relative path
     * @param currentDir Current directory
     * @param relativePath Relative path
     * @returns Normalized path
     */
    normalizeRelativePath(currentDir, relativePath) {
        return pathBrowserify$1.normalize(pathBrowserify$1.join(currentDir, relativePath));
    }
    /**
     * Resolve type file contents
     * @param packageName Package name
     * @param typesPath Type file path
     * @returns Type definition results array
     */
    async resolveTypeFiles(packageName, typesPath) {
        const results = [];
        const baseUrl = `${this.options.baseUrl}/${packageName}`;
        const filePath = pathBrowserify$1.normalize(pathBrowserify$1.join(baseUrl, typesPath));
        // Check if file has been processed
        if (this.processedFiles.has(filePath)) {
            return [];
        }
        this.processedFiles.add(filePath);
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return [];
            }
            const content = await response.text();
            results.push({
                content,
                filePath: this.getFilePath(packageName, typesPath),
                source: TypeDefinitionSource.BACKEND
            });
            // Resolve referenced type files
            await this.resolveReferences(content, packageName, typesPath, results);
            // Resolve import statements
            await this.resolveImports(content, packageName, typesPath, results);
        }
        catch (error) {
            console.error(`Error resolving type files for ${packageName}:`, error);
        }
        return results;
    }
    /**
     * Resolve type references in file
     * @param content File content
     * @param packageName Package name
     * @param currentPath Current file path
     * @param results Results array
     */
    async resolveReferences(content, packageName, currentPath, results) {
        const referenceRegex = /\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/g;
        const matches = content.matchAll(referenceRegex);
        const currentDir = pathBrowserify$1.dirname(currentPath);
        for (const match of matches) {
            const referencePath = match[1];
            const baseUrl = `${this.options.baseUrl}/${packageName}`;
            const relativePath = this.normalizeRelativePath(currentDir, referencePath);
            const fullPath = pathBrowserify$1.normalize(pathBrowserify$1.join(baseUrl, relativePath));
            // Check if file has been processed
            if (this.processedFiles.has(fullPath)) {
                continue;
            }
            this.processedFiles.add(fullPath);
            try {
                const response = await fetch(fullPath);
                if (response.ok) {
                    const referenceContent = await response.text();
                    results.push({
                        content: referenceContent,
                        filePath: this.getFilePath(packageName, relativePath),
                        source: TypeDefinitionSource.REFERENCE
                    });
                    // Recursively resolve references in referenced file
                    await this.resolveReferences(referenceContent, packageName, relativePath, results);
                    await this.resolveImports(referenceContent, packageName, relativePath, results);
                }
            }
            catch (error) {
                console.error(`Error resolving reference ${referencePath}:`, error);
            }
        }
    }
    /**
     * Resolve import statements in file
     * @param content File content
     * @param packageName Package name
     * @param currentPath Current file path
     * @param results Results array
     */
    async resolveImports(content, packageName, currentPath, results) {
        const importRegex = /(?:import|export)\s+(?:{[^}]*}|\*\s+as\s+[^;]+)?\s*(?:from\s+)?['"]([^'"]+)['"]/g;
        const matches = content.matchAll(importRegex);
        const currentDir = pathBrowserify$1.dirname(currentPath);
        for (const match of matches) {
            const importPath = match[1];
            // Handle relative and package internal paths
            if (importPath.startsWith('.') || importPath.startsWith(packageName)) {
                const baseUrl = `${this.options.baseUrl}/${packageName}`;
                const resolvedPath = importPath.startsWith('.')
                    ? this.normalizeRelativePath(currentDir, importPath)
                    : pathBrowserify$1.normalize(importPath.replace(packageName, ''));
                const relativeTypePath = resolvedPath.endsWith('.d.ts')
                    ? resolvedPath
                    : resolvedPath.endsWith('.ts')
                        ? resolvedPath.replace(/\.ts$/, '.d.ts')
                        : `${resolvedPath}.d.ts`;
                const fullPath = pathBrowserify$1.normalize(pathBrowserify$1.join(baseUrl, relativeTypePath));
                // Check if file has been processed
                if (this.processedFiles.has(fullPath)) {
                    continue;
                }
                this.processedFiles.add(fullPath);
                try {
                    const response = await fetch(fullPath);
                    if (response.ok) {
                        const importContent = await response.text();
                        results.push({
                            content: importContent,
                            filePath: this.getFilePath(packageName, relativeTypePath),
                            source: TypeDefinitionSource.IMPORT
                        });
                        // Recursively resolve references in imported file
                        await this.resolveReferences(importContent, packageName, relativeTypePath, results);
                        await this.resolveImports(importContent, packageName, relativeTypePath, results);
                    }
                    else {
                        // Try looking in dist/types directory
                        const altPath = pathBrowserify$1.normalize(pathBrowserify$1.join(baseUrl, 'dist/types', relativeTypePath));
                        const altResponse = await fetch(altPath);
                        if (altResponse.ok) {
                            const importContent = await altResponse.text();
                            results.push({
                                content: importContent,
                                filePath: this.getFilePath(packageName, `dist/types/${relativeTypePath}`),
                                source: TypeDefinitionSource.IMPORT
                            });
                            await this.resolveReferences(importContent, packageName, `dist/types/${relativeTypePath}`, results);
                            await this.resolveImports(importContent, packageName, `dist/types/${relativeTypePath}`, results);
                        }
                    }
                }
                catch (error) {
                    console.error(`Error resolving import ${importPath}:`, error);
                }
            }
        }
    }
}

export { MemoryCache, TypeDefinitionResolver, TypeDefinitionSource, normalizePath };
//# sourceMappingURL=index.esm.js.map
