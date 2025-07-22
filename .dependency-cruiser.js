/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /* rules from the 'recommended' preset: */
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration. By default " +
        "this rule does not scrutinize dot-files (e.g. .eslintrc.js), TypeScript declaration " +
        "files (.d.ts), tsconfig.json and some of the babel and webpack configs.",
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
          '\\.d\\.ts$', // TypeScript declaration files
          '(^|/)tsconfig\\.json$', // tsconfig
          '(^|/)package\\.json$', // package.json
          '(^|/)next\\.config\\.(js|ts)$', // Next.js config
          '(^|/)tailwind\\.config\\.(js|ts)$', // Tailwind config
          '(^|/)postcss\\.config\\.(js|ts)$', // PostCSS config
          '(^|/)jest\\.config\\.(js|ts)$', // Jest config
          '(^|/)vitest\\.config\\.(js|ts)$', // Vitest config
          '(^|/)playwright\\.config\\.(js|ts)$', // Playwright config
          '(^|/)middleware\\.(js|ts)$', // Next.js middleware
          '(^|/)(layout|page|loading|not-found|error|global-error)\\.(js|ts|tsx)$', // Next.js app router files
          '(^|/)app/.*/(layout|page|loading|not-found|error|global-error)\\.(js|ts|tsx)$', // Next.js app router nested files
          '(^|/).*\\.(test|spec)\\.(js|ts|tsx)$', // test files
          '(^|/).*\\.stories\\.(js|ts|tsx)$', // Storybook files
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      comment:
        'A module depends on a node core module that has been deprecated. Find an alternative - these are ' +
        "bound to exist - node doesn't deprecate lightly.",
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^(v8/tools/codemap)$',
          '^(v8/tools/consarray)$',
          '^(v8/tools/csvparser)$',
          '^(v8/tools/logreader)$',
          '^(v8/tools/profile_view)$',
          '^(v8/tools/profile)$',
          '^(v8/tools/SourceMap)$',
          '^(v8/tools/splaytree)$',
          '^(v8/tools/tickprocessor-driver)$',
          '^(v8/tools/tickprocessor)$',
          '^(node-inspect/lib/_inspect)$',
          '^(node-inspect/lib/internal/inspect_client)$',
          '^(node-inspect/lib/internal/inspect_repl)$',
        ],
      },
    },
    {
      name: 'not-to-deprecated-npm',
      comment:
        'This module uses a (version of an) npm module that has been deprecated. Either upgrade to a later ' +
        'version of that module, or find an alternative. Deprecated modules are a security risk.',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['deprecated'],
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "That's problematic as the package either (1) won't be available on live (2 - worse) will be " +
        "available on live with an non-guaranteed version. Fix it by adding the package to the dependencies " +
        "in your package.json.",
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'not-to-unresolvable',
      comment:
        "This module depends on a module that cannot be found ('resolved to disk'). If it's an npm " +
        'module: add it to your package.json. In all other cases you likely already know what to do.',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-duplicate-dep-types',
      comment:
        "Likely this module depends on an external ('npm') package that occurs more than once " +
        "in your package.json i.e. bot as a devDependencies and in dependencies. This will cause " +
        "maintenance problems later on.",
      severity: 'warn',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        // as it's pretty common to have a type import be a type only import
        // _and_ (e.g.) a devDependency - don't consider type-only dependency
        // types for this rule
        dependencyTypesNot: ['type-only'],
      },
    },

    /* rules you might want to tweak for your specific situation: */
    {
      name: 'not-to-spec',
      comment:
        'This module depends on a spec (test) file. The sole responsibility of a spec file is to test code. ' +
        "If there's something in a spec that's of use to other modules, it doesn't have that single " +
        'responsibility anymore. Factor it out into (e.g.) a separate utility/ helper or a mock.',
      severity: 'error',
      from: {},
      to: {
        path: '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
      },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        "This module depends on an npm package from the 'devDependencies' section of your " +
        'package.json. It looks like something that ships to production, though. To prevent problems ' +
        "with npm packages that aren't there on production declare it (only!) in the 'dependencies'" +
        'section of your package.json. If this module is development only - add it to the ' +
        'from.pathNot re of the not-to-dev-dep rule in the dependency-cruiser configuration',
      from: {
        path: '^(src)',
        pathNot: [
          '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
          '\\.(stories)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
          '(^|/)\\.[^/]+\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
        ],
      },
      to: {
        dependencyTypes: ['npm-dev'],
        // type only dependencies are not a problem as they don't end up in the
        // production code or are ignored by the runtime.
        dependencyTypesNot: ['type-only'],
        pathNot: [
          'node_modules/@types/',
          'node_modules/@typescript-eslint/',
          'node_modules/eslint',
        ],
      },
    },
    {
      name: 'optional-deps-used',
      severity: 'info',
      comment:
        "This module depends on an npm package that is declared as an optionalDependency " +
        "in your package.json. As this makes sense in limited situations only, it's flagged here. " +
        "If you're using an optionalDependency here by design - add an exception to your" +
        'dependency-cruiser configuration.',
      from: {},
      to: {
        dependencyTypes: ['npm-optional'],
      },
    },
    {
      name: 'peer-deps-used',
      comment:
        "This module depends on an npm package that is declared as a peerDependency " +
        'in your package.json. This makes sense if your package is e.g. a plugin, but in ' +
        'other cases - maybe not so much. If the use of a peerDependency is intentional ' +
        'add an exception to your dependency-cruiser configuration.',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['npm-peer'],
      },
    },

    /* ZK-Agent 项目特定规则 */
    {
      name: 'no-server-to-client',
      comment:
        '服务端代码不应该依赖客户端特定的代码。请检查导入路径。',
      severity: 'error',
      from: {
        path: '^(app/api|lib/server|middleware)',
      },
      to: {
        path: '^(components|hooks|contexts|app/(?!api))',
      },
    },
    {
      name: 'no-client-to-server-internals',
      comment:
        '客户端代码不应该直接访问服务端内部模块。请使用 API 路由。',
      severity: 'error',
      from: {
        path: '^(components|hooks|contexts|app/(?!api))',
      },
      to: {
        path: '^(lib/server)',
      },
    },
    {
      name: 'no-deep-imports',
      comment:
        '避免深层导入。请使用模块的公共 API。',
      severity: 'warn',
      from: {},
      to: {
        path: 'node_modules/[^/]+/.+/.+',
        pathNot: [
          'node_modules/@types/',
          'node_modules/@typescript-eslint/',
        ],
      },
    },
    {
      name: 'no-relative-parent-imports',
      comment:
        '避免使用过多的相对路径导入父级目录。考虑使用绝对路径或重构代码结构。',
      severity: 'warn',
      from: {},
      to: {
        path: '(\\.\\./){3,}',
      },
    },
  ],
  options: {
    /* conditions to select the modules for which to run the dependency analysis */
    doNotFollow: {
      path: 'node_modules',
    },

    /* conditions to select the dependencies to exclude from the analysis */
    exclude: {
      path: [
        'node_modules',
        '\\.next',
        'dist',
        'build',
        'coverage',
        '\\.git',
        '\\.vscode',
        '\\.idea',
      ],
    },

    /* pattern specifying which files not to follow further when encountered */
    includeOnly: {
      path: '^(src|app|lib|components|hooks|contexts|middleware|scripts)',
    },

    /* list of module systems to cruise */
    moduleSystems: ['amd', 'cjs', 'es6', 'tsd'],

    /* prefix for links in html and svg output */
    prefix: '',

    /* false (default): ignore dependencies that only exist before typescript-to-javascript compilation
       true: also detect dependencies that only exist before typescript-to-javascript compilation
       "specify": for each dependency identify whether it only exists before compilation or also after
     */
    tsPreCompilationDeps: true,

    /* TypeScript project file ('tsconfig.json') to use for
       (1) compilation and
       (2) resolution (e.g. with the paths property)

       The (optional) fileName attribute specifies which file to take (relative to
       dependency-cruiser's current working directory). When not provided
       defaults to './tsconfig.json'.
     */
    tsConfig: {
      fileName: 'tsconfig.json',
    },

    /* Webpack configuration to use to get resolve options from.

       The (optional) fileName attribute specifies which file to take (relative
       to dependency-cruiser's current working directory. When not provided defaults
       to './webpack.conf.js'.

       The (optional) `env` and `args` attributes contain the parameters to be passed if
       your webpack config is a function and takes them (see webpack documentation
       for details)
     */
    // webpackConfig: {
    //  fileName: 'webpack.config.js',
    //  env: {},
    //  args: {},
    // },

    /* How to resolve external modules - use "yarn-pnp" if you're using yarn's Plug'n'Play.
       otherwise leave it out (or set to the default, which is 'node_modules')
     */
    externalModuleResolutionStrategy: 'node_modules',

    /* List of strings you have in use in addition to cjs/ es6 requires
       & imports to declare module dependencies. Use this e.g. if you've
       re-declared require, use a require-wrapper or use window.require as
       a hack.
    */
    // exoticRequireStrings: [],

    /* options to pass on to enhanced-resolve, the package dependency-cruiser
       uses to resolve module references to disk. You can set most of these
       options in a webpack.conf.js - this section is here for those
       projects that don't have a separate webpack config file.

       Note: settings in webpack.conf.js override the ones specified here.
     */
    enhancedResolveOptions: {
      /* List of strings to consider as 'exports' fields in package.json. Use
         ['exports'] when you use packages that use such a field and your environment
         supports it (e.g. node ^12.19 || >=14.7 or recent versions of webpack).

        If you have an `exportsFields` attribute in your webpack config, that one
         will have precedence over the one specified here.
      */
      exportsFields: ['exports'],
      /* List of conditions to check for in the exports field. e.g. use ['imports']
         if you're only interested in exposed es6 modules, ['require'] for commonjs,
         or all conditions at once `(['import', 'require', 'node', 'default'])`
         if anything goes for you. Only works when the 'exportsFields' array is
         non-empty.

        If you have a 'conditionNames' attribute in your webpack config, that one will
        have precedence over the one specified here.
      */
      conditionNames: ['import', 'require', 'node', 'default'],
      /*
         The extensions array. Default: ['.js', '.json', '.node', '.ts', '.d.ts']
         When passed via the command line --extensions will override this
      */
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.node'],
      /*
         If passed, the mainFields array will override the default mainFields.
         Default: ['main']
      */
      mainFields: ['main', 'types', 'typings'],
    },
    reporterOptions: {
      dot: {
        /* pattern of modules that can be consolidated in the detailed
           graphical dependency graph. The default pattern in this configuration
           collapses everything in node_modules to one folder deep so you see
           the external modules, but not the innards your app depends upon.
         */
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',

        /* Options to tweak the appearance of your graph.See
           https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md#reporteroptions
           for details and some examples. If you don't specify a theme
           don't worry - dependency-cruiser will fall back to the default one.
        */
        // theme: {
        //   graph: {
        //     /* use splines: 'ortho' for straight lines. Be aware though
        //        graphviz might take a long time calculating ortho(gonal)
        //        routings.
        //      */
        //     splines: 'true'
        //   },
        //   modules: [
        //     {
        //       criteria: { source: '^src' },
        //       attributes: { fillcolor: 'lightblue' }
        //     }
        //   ],
        //   dependencies: [
        //     {
        //       criteria: { "rules[0].severity": 'error' },
        //       attributes: { fontcolor: 'red', color: 'red' }
        //     }
        //   ]
        // }
      },
      archi: {
        /* pattern of modules that can be consolidated in the high level
          graphical dependency graph. If you use the high level graphical
          dependency graph reporter (`archi`) you probably want to tweak
          this collapsePattern to your situation.
        */
        collapsePattern:
          '^(src|app|lib|components|hooks|contexts|middleware|scripts)/[^/]+|node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};