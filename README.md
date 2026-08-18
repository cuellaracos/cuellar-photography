# Cuellar Photography

Sitio estático de fotografía construido con Astro y TypeScript.

## Desarrollo

```sh
npm install
npm run dev
```

## Producción

```sh
npm run build
```

El resultado se genera en `dist/` y puede desplegarse como sitio estático en Cloudflare Pages.

## Contenido

El catálogo temporal vive en `src/content/catalog.ts`. La interfaz consume un `src` por variante de imagen (`card`, `gallery`, `detail`) para que el origen local actual pueda reemplazarse por R2 o un CMS sin cambiar las páginas.