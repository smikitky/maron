import { type MaRonStyle } from './types.ts';

const defaultStyle: MaRonStyle = {
  reference: {
    format: '{{authors}} ({{year}}) {{title}}'
  },
  citation: {
    format: '[{{{items}}}]',
    itemSep: ',',
    hyphen: '-'
  },
  figCaption: {
    position: 'bottom',
    format: '<b>Figure {{index}}</b>: {{{caption}}}'
  },
  tabCaption: {
    position: 'top',
    format: '<b>Table {{index}}</b>: {{{caption}}}'
  }
};

export default defaultStyle;
