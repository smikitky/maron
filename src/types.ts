export interface MainOptions {
  init?: boolean;
  src: string;
  out: string;
  watch?: boolean;
  verbose?: boolean;
  no_link?: boolean;
  text_only?: boolean;
  clear?: boolean;
  serve?: boolean;
  help?: boolean;
}

export interface CaptionStyle {
  position: 'bottom' | 'top';
  format: string;
}

export interface MaRonStyle {
  reference: {
    format: string;
  };
  citation: {
    format: string;
    itemSep: string;
    hyphen: string;
  };
  figCaption: CaptionStyle;
  tabCaption: CaptionStyle;
}

export interface ReferenceEntry {
  [key: string]: any;
}

export interface TableEntry {
  [key: string]: any;
}

export interface FigureEntry {
  [key: string]: any;
}

export interface MaRonContext {
  sourceDir: string;
  outDir: string;
  sourceFile: string;
  references: { [tag: string]: ReferenceEntry };
  refTagMap: Map<string, number>;
  figures: { [tag: string]: FigureEntry };
  figTagMap: Map<string, number>;
  tables: { [tag: string]: TableEntry };
  tabTagMap: Map<string, number>;
  styles: MaRonStyle;
  options: MainOptions;
}
