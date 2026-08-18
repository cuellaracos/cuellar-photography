export type Category =
  | 'Paisaje'
  | 'Naturaleza'
  | 'Fauna'
  | 'Macro'
  | 'Nocturna'
  | 'Astrofotografía'
  | 'Fotografía creativa'
  | 'IA';

export type ImageVariant = 'card' | 'gallery' | 'detail';

export interface Photo {
  slug: string;
  title: string;
  alt: string;
  gallerySlug: string;
  category: Category;
  width: number;
  height: number;
  placeholder: 'landscape' | 'nature' | 'wildlife' | 'macro' | 'night' | 'creative';
}

export interface Gallery {
  slug: string;
  title: string;
  description: string;
  category: Category;
  coverPhotoSlug: string;
}