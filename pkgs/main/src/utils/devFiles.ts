import { dirs } from 'boot'

export const serverFiles = {
  src: {
    'index.ts': `export const ext = {}`,
  },
}

export const dbFiles = {
  src: {
    'index.ts': `
import { main } from "./main";

export const db = main
export const dbAll = {
  main
}
    `,
    main: {
      'index.ts': `
      import { PrismaClient } from '@prisma/client'
      export const main = new PrismaClient()
      `,
    },
  },
  prisma: {
    'schema.prisma': `
    generator client {
      provider = "prisma-client-js"
    }
    
    datasource db {
      provider = "postgresql"
      url      = "postgresql://postgres:andromedia123oke@db.plansys.co:5432/base?schema=public"
    }`,
  },
}

export const webPkgs = {
  name: 'web-app',
  main: './build/web/index.js',
  script: {
    'post-install': 'patch-package',
  },
  devDependencies: {
    '@types/lodash.fill': '^3.4.6',
    '@types/lodash.find': '^4.6.6',
    '@types/lodash.get': '^4.4.6',
    '@types/lodash.kebabcase': '^4.1.6',
    '@types/lodash.map': '^4.6.13',
    '@types/lodash.set': '^4.3.6',
    '@types/lodash.sortby': '^4.7.6',
    '@types/lodash.startcase': '^4.4.6',
    '@types/lodash.throttle': '^4.1.6',
    '@types/lodash.trim': '^4.5.6',
    '@types/react': '^17.0.3',
    '@types/react-dom': '^17.0.3',
  },
  dependencies: {
    '@emotion/core': '^11.0.0',
    '@emotion/react': '^11.1.5',
    mobx: '^6.1.8',
    'mobx-react-lite': '^3.2.0',
    react: '^17.0.2',
    'react-dom': '^17.0.2',
  },
}

export const webFiles = {
  cms: {
    templates: {},
    structures: {},
    components: {},
  },
  public: {
    'favicon.ico': [dirs.pkgs.main, 'favicon.ico'],
    'index.html': `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" /> 
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <link rel="shortcut icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Base</title>
  </head>
  <body>
      <div id="root"></div>
  </body>
  </html>
      `,
  },
  'tailwind.config.js': `\
const colors = require('tailwindcss/colors')
delete colors.lightBlue

module.exports = {
  purge: {
    enabled: true,
    content: ['./**/*.tsx', './**/*.html'],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors,
      backgroundColor: colors,
      textColor: colors,
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}`,
  'tsconfig.json': `{
  "include": ["src", "types"],
  "compilerOptions": {
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "node",
    "jsx": "preserve",
    "baseUrl": "./",
    "paths": {
    },
    "noEmit": true,
    "strict": true,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "importsNotUsedAsValues": "error"
  }
}
  `,
  src: {
    'global.ts': `export const globalVar = {}`,
    'external.tsx': `// make sure to export default component not export const
export default {
  'render-html': () => [import('web.utils/components/RenderHTML')],
  'html-head': () => [import('web.utils/components/HtmlHead')],
  'hello-world': () => [import('web.utils/components/HelloWorld')],
  loading: () => [import('web.form/fields/Loading')],
  admin: () => [import('web.form/src/AdminCMS')],
  qform: () => [import('web.form/src/QForm')],
  qlist: () => [import('web.list/src/QList')],
}`,
    'index.tsx': `import { initApp } from 'web.init/src/initApp'
import './index.css'
initApp()   
`,
    'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  padding: 0px;
  margin: 0px;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}`,
  },
}

export const mobileFiles = {
  public: {
    'favicon.ico': [dirs.pkgs.main, 'favicon.ico'],
    'index.html': `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" /> 
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <link rel="shortcut icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Base</title>
  </head>
  <body>
      <div id="root"></div>
  </body>
  </html>
      `,
  },
  src: {
    'index.tsx': `
  import React from 'react';
  import { AppRegistry, StyleSheet, Text, View } from 'react-native';
  
  const App = () => {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>Hello, world!</Text>
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    box: { padding: 10 },
    text: { fontWeight: 'bold', color: 'red' }
  });
  
  AppRegistry.registerComponent('App', () => App);
  AppRegistry.runApplication('App', { rootTag: document.getElementById('root') });
  `,
  },
}
