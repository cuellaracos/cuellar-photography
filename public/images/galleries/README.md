# Fotografías reales

Las fotografías reales se guardan en una carpeta por `gallery.slug`:

```text
public/images/galleries/<gallery-slug>/<photo-slug>.webp
public/images/galleries/<gallery-slug>/<photo-slug>-thumb.webp
```

Desde las vistas, esos archivos se referencian con rutas públicas:

```text
/images/galleries/<gallery-slug>/<photo-slug>.webp
/images/galleries/<gallery-slug>/<photo-slug>-thumb.webp
```

Al incorporar una foto, actualiza en `src/content/catalog.ts` los campos `image`, `thumbnail`, `width`, `height` y `alt` de su registro. `image` se usa en la ficha individual y `thumbnail` en tarjetas y cubiertas de galería.

Los placeholders de `public/images/placeholders/` permanecen activos hasta que cada registro se sustituya de forma individual.