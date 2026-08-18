export type Category =
  | 'Paisaje'
  | 'Naturaleza'
  | 'Fauna'
  | 'Macro'
  | 'Nocturna'
  | 'Astrofotografía'
  | 'Fotografía creativa'
  | 'IA'
  | 'Retratos'
  | 'Creaciones con IA';

export interface Photo {
  id: string;
  slug: string;
  title: string;
  description: string;
  alt: string;
  gallerySlug: string;
  category: Category;
  image: string;
  thumbnail: string;
  width: number;
  height: number;
}

export interface Gallery {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  coverPhotoSlug: string;
}