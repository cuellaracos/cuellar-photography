import type { Gallery, ImageVariant, Photo } from '../types/content';

export const categories = [
  'Paisaje',
  'Naturaleza',
  'Fauna',
  'Macro',
  'Nocturna',
  'Astrofotografía',
  'Fotografía creativa',
  'IA',
] as const;

export const galleries: Gallery[] = [
  {
    slug: 'horizontes-abiertos',
    title: 'Horizontes abiertos',
    description: 'Una selección provisional dedicada a la amplitud del paisaje.',
    category: 'Paisaje',
    coverPhotoSlug: 'luz-en-el-valle',
  },
  {
    slug: 'vida-en-detalle',
    title: 'Vida en detalle',
    description: 'Apuntes provisionales sobre textura, escala y observación.',
    category: 'Macro',
    coverPhotoSlug: 'geometria-organica',
  },
  {
    slug: 'despues-del-sol',
    title: 'Después del sol',
    description: 'Una serie provisional de atmósferas nocturnas.',
    category: 'Nocturna',
    coverPhotoSlug: 'linea-de-noche',
  },
];

export const photos: Photo[] = [
  {
    slug: 'luz-en-el-valle',
    title: 'Luz en el valle',
    alt: 'Placeholder identificado para una fotografía de paisaje.',
    gallerySlug: 'horizontes-abiertos',
    category: 'Paisaje',
    width: 1600,
    height: 1067,
    placeholder: 'landscape',
  },
  {
    slug: 'silencio-vegetal',
    title: 'Silencio vegetal',
    alt: 'Placeholder identificado para una fotografía de naturaleza.',
    gallerySlug: 'horizontes-abiertos',
    category: 'Naturaleza',
    width: 1600,
    height: 1067,
    placeholder: 'nature',
  },
  {
    slug: 'geometria-organica',
    title: 'Geometría orgánica',
    alt: 'Placeholder identificado para una fotografía macro.',
    gallerySlug: 'vida-en-detalle',
    category: 'Macro',
    width: 1200,
    height: 1500,
    placeholder: 'macro',
  },
  {
    slug: 'presencia-silvestre',
    title: 'Presencia silvestre',
    alt: 'Placeholder identificado para una fotografía de fauna.',
    gallerySlug: 'vida-en-detalle',
    category: 'Fauna',
    width: 1200,
    height: 1500,
    placeholder: 'wildlife',
  },
  {
    slug: 'linea-de-noche',
    title: 'Línea de noche',
    alt: 'Placeholder identificado para una fotografía nocturna.',
    gallerySlug: 'despues-del-sol',
    category: 'Nocturna',
    width: 1600,
    height: 1067,
    placeholder: 'night',
  },
  {
    slug: 'campo-imaginado',
    title: 'Campo imaginado',
    alt: 'Placeholder identificado para una fotografía creativa.',
    gallerySlug: 'despues-del-sol',
    category: 'Fotografía creativa',
    width: 1600,
    height: 1067,
    placeholder: 'creative',
  },
];

export function getGallery(slug: string) {
  return galleries.find((gallery) => gallery.slug === slug);
}

export function getPhoto(slug: string) {
  return photos.find((photo) => photo.slug === slug);
}

export function getGalleryPhotos(gallerySlug: string) {
  return photos.filter((photo) => photo.gallerySlug === gallerySlug);
}

export function getImageSource(photo: Photo, variant: ImageVariant) {
  // The variant is retained as an explicit delivery contract for a future R2 source.
  return `/images/placeholders/${photo.placeholder}-${variant}.svg`;
}