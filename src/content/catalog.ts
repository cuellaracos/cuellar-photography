
import type { Gallery, Photo } from '../types/content';
import { photos as horizontesAbiertosPhotos } from '../data/photos/horizontes-abiertos'
import { photos as materiaVivaPhotos } from '../data/photos/materia-viva';
import { photos as encuentrosSilvestresPhotos } from '../data/photos/encuentros-silvestres';
import { photos as despuesDelSolPhotos } from '../data/photos/despues-del-sol';
import { photos as cieloProfundoPhotos } from '../data/cielo-profundo';
import { photos as realidadRecompuestaPhotos } from '../data/realidad-recompuesta';
import { photos as imagenesSinteticasPhotos } from '../data/imagenes-sinteticas';
import { photos as retratosPhotos } from '../data/retratos';
import { photos as creacionesIaPhotos } from '../data/creaciones-ia';

export const categories = [
  'Paisaje',
  'Naturaleza',
  'Fauna',
  'Macro',
  'Nocturna',
  'Astrofotografía',
  'Fotografía creativa',
  'IA',
  'Retratos',
  'Creaciones con IA',
] as const;

export const galleries: Gallery[] = [
  {
    id: 'gallery-landscape',
    slug: 'horizontes-abiertos',
    title: 'Paisaje',
    description: 'Luz, relieve y horizontes abiertos. Selección visual provisional.',
    category: 'Paisaje',
    coverPhotoSlug: 'eclipse-carabelas',
  },
  {
    id: 'gallery-nature',
    slug: 'materia-viva',
    title: 'Naturaleza',
    description: 'Formas, ritmos y materia en el entorno natural. Selección visual provisional.',
    category: 'Naturaleza',
    coverPhotoSlug: 'silencio-vegetal',
  },
  {
    id: 'gallery-wildlife',
    slug: 'encuentros-silvestres',
    title: 'Fauna',
    description: 'Presencias discretas y encuentros en libertad. Selección visual provisional.',
    category: 'Fauna',
    coverPhotoSlug: 'el-vigia-de-la-roca',
  },
  {
    id: 'gallery-macro',
    slug: 'vida-en-detalle',
    title: 'Macro',
    description: 'Textura, patrón y escala en los detalles que pasan inadvertidos. Selección visual provisional.',
    category: 'Macro',
    coverPhotoSlug: 'geometria-organica',
  },
  {
    id: 'gallery-night',
    slug: 'despues-del-sol',
    title: 'Nocturna',
    description: 'Tiempo lento, sombra y luz residual. Selección visual provisional.',
    category: 'Nocturna',
    coverPhotoSlug: 'linea-de-noche',
  },
  {
    id: 'gallery-astro',
    slug: 'cielo-profundo',
    title: 'Astrofotografía',
    description: 'La escala del cielo nocturno en una selección visual provisional.',
    category: 'Astrofotografía',
    coverPhotoSlug: 'trazo-celeste',
  },
  {
    id: 'gallery-creative',
    slug: 'realidad-recompuesta',
    title: 'Fotografía creativa',
    description: 'Interpretaciones visuales donde la imagen propone otro lugar. Selección visual provisional.',
    category: 'Fotografía creativa',
    coverPhotoSlug: 'campo-imaginado',
  },
  {
    id: 'gallery-ai',
    slug: 'imagenes-sinteticas',
    title: 'IA',
    description: 'Exploraciones visuales generadas como parte de un archivo en evolución.',
    category: 'IA',
    coverPhotoSlug: 'forma-sintetica',
  },
  {
    id: 'gallery-portraits',
    slug: 'retratos',
    title: 'Retratos',
    description: 'Presencia, gesto y luz en una selección visual provisional.',
    category: 'Retratos',
    coverPhotoSlug: 'presencia-retratada',
  },
  {
    id: 'gallery-ai-creations',
    slug: 'creaciones-ia',
    title: 'Creaciones con IA',
    description: 'Imágenes creadas con inteligencia artificial como parte de un archivo en evolución.',
    category: 'Creaciones con IA',
    coverPhotoSlug: 'escena-generada',
  },
];

export const photos: Photo[] = [
   ...horizontesAbiertosPhotos,
  ...materiaVivaPhotos,
  ...encuentrosSilvestresPhotos,
  ...despuesDelSolPhotos,
  ...cieloProfundoPhotos,
  ...realidadRecompuestaPhotos,
  ...imagenesSinteticasPhotos,
  ...retratosPhotos,
  ...creacionesIaPhotos,
 
  
  {
    id: 'photo-macro-geometry',
    slug: 'geometria-organica',
    title: 'Geometría orgánica',
    description: 'Estudio provisional de estructuras orgánicas a escala cercana.',
    alt: 'Placeholder identificado para una fotografía macro.',
    gallerySlug: 'vida-en-detalle',
    category: 'Macro',
    image: '/images/placeholders/macro-detail.svg',
    thumbnail: '/images/placeholders/macro-card.svg',
    width: 1200,
    height: 1500,
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
