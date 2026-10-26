import {defineConfig} from 'vite';

export default defineConfig({
  base:'./',
  plugins:[{
    name:'vite-plugin-elora-module-entry',
    // Keep the source HTML usable via file:// while Vite serves/builds the live module.
    transformIndexHtml:{order:'pre',handler:html=>html.replace(/<script src="app\.bundle\.js[^\"]*"><\/script>/,'<script type="module" src="/src/main.js"></script>')}
  }]
});
