# MaRon

MaRon is a helper script for writing manuscripts in markdown.

- Converts a markdown manuscript file into HTML.
- Manages reference list and citation numbers (`[2-3,7]`) in your manuscript.
- Converts PNG/PDF files into TIFF using ImageMagick.

## Usage

1. Install Node.js.

1. Create your project.

   ```bash
   $ mkdir my-research-paper
   $ cd my-research-paper
   $ git init
   $ npm init
   ```

1. Install Ron via NPM.

   ```bash
   $ npm install @smikitky/maron
   ```

1. Run the setup script. This will create a directory called `src` in your project and fills it with sample files.

   ```bash
   $ npx maron --init
   ```

1. Write your manuscript and compile.

   ```bash
   $ npx maron
   ```

   The `--watch` (or `-w`) option is useful to recompile everything when you made some change to the source directory. Use `npx ron --help` to see other available options.

## Directory Structure

```
src/
  index.md
  references.yaml
  figures.yaml
  styles.yaml
  style.css
```

### Main Manuscript (`index.md`)

This is the main manuscript written in the Markdown format. In addition to all the commonmark markups, it supports the following syntax:

- Arbitrary HTML tags
- Custom class/id using [markdown-it-attrs](https://www.npmjs.com/package/markdown-it-attrs)
- Custom backtick tags
  - Article citation: `` `ref:<tag>` `` (e.g., `` `ref:yamada2010` ``)
  - Reference list: `` `references` ``
  - Figure reference `` `fig:<tag>` `` (e.g., `` `fig:mydog` ``)
  - Figure list: `` `figures` ``
  - Table reference `` `tab:<tag>` `` (e.g., `` `tab:prices` ``)
  - Table list: `` `tables` ``

### References (`references.yaml`)

Your reference list should be placed as `src/references.yaml`.

```yaml
yamada2010:
  authors: Yamada T, Suzuki I, Eto H
  title: 'Alice in Wonderland'
  journal: Science
  issue: '2010;5(6): 1038-1053'
online2015:
  literal: Natural number. https://en.wikipedia.org/wiki/Natural_number. Accessed May 10, 2013.
```

Here `yamda2010` and `online2015` are the "tags". In the main manuscript file, the tags are referred to like `` `ref:yamada2010` ``. Near the end of your manuscript, you can output the references list by writing `` `references` ``.

You should list _all_ of the authors in the `authors` attribute. This will be formatted using `authorsList` formatter described below.

Ron supports formatting of typical journal articles, but it does not support atypical references such as those to book chapters and web pages. In such cases, use the `literal` attribute, which will not be formatted at all.

### Figures (`figures.yaml`)

Ron will convert your figures into TIFF (for submission) and PNG (for HTML previeww) files. The format is similar to that of `references.yaml`.

```yaml
my-rabbit:
  caption: My rabbit.
  resolution: 300
  webResolution: 150
my-cat:
  caption: Face (a) and tail (b) of my cat.
  resolution: 150
  subFigures:
    - name: (a)
    - name: (b)
      resolution: 120
```

The format of source image files can be PDF (`*.pdf`), PNG (`*.png`) or JPEG (`*.jpg`). They must be placed under your source directory with appropreate extentions (e.g., `src/my-rabbit.pdf`, `src/my-cat-(a).jpg`).

Specify `resolution` (and `webResolution`) to determine the resolution to your PDF.

When there are sub-figures, they can be specified using the `subFigures` array. The element of the `sugFigures` is an object containing a `name` (typically `a`, `(b)`, etc) and optional `resolution`/`webResolution` which overrides the root resolution.

### Tables (`tables.yml`)

Tables can be authored using HTML (`*.html`, more flexible) or Markdown (`*.md`, suitable for simple tables). Each table should be stored in a separate file and it must be referenced from `tables.yaml`.

```yaml
my-table:
  caption: foo
```

An HTML file should contain only the `<table>` tag and its contents.

### Styles (`styles.yaml`)

Use this file to customize output format.

```yaml
reference:
  format: >
    {{authorList authors max=3}}. <b>{{capitalize title}}</b>. {{journal}} {{issue.year}};{{issue.volume}}({{issue.issue}}): {{{pages issue.pages compact=true delim='&ndash;'}}}.
citation:
  format: >
    [{{{items}}}]
  itemSep: ','
  hyphen: '-'
figCaption:
  position: bottom
  format: '<b>Figure {{index}}</b>: {{{caption}}}'
tabCaption:
  position: top
  format: '<b>Table {{index}}</b>: {{{caption}}}'
```

Values named `format` are processed using the Handlebar template engine.

- `reference.format`: Defines the references format. See the explanation below.
- `citation.format`: Defines the citation format. For example, you can set this to `<sup>{{{items}}}</sup>` instead of the default.
- `citation.itemSep` (default: `','`): Defines the comma between cite index. ([])
- `citation.hyphen` (default: `'-'`): Defines the hyphen used when three or more successive items are cited.
- `figCaption.position` (default: `bottom`): Defines the position of the caption. One of `top`, `bottom` or `none`.
- `figCaption.format`: Defines the format of figure captions.
- `tabCaption.position` (default: `top`): Defines the position of the caption. One of `top`, `bottom` or `none`.
- `tabCaption.format`: Defines the format of table captions.

#### `reference.format` usage

You can use the following Handlebars [helpers](https://handlebarsjs.com/guide/expressions.html#helpers), some of which take hash (i.e., key-value pair) arguments.

- `authorList`: Used with `authors`, formats the author list of the citing material.
  - `max` (default: `3`): When the number of authors exceeds this number, the list will be truncated to `truncateTo` items and " et al" would be added at the end.
  - `truncateTo` (default: the same as `max`): See above.
  - `etAl` (default: ' et al'): Customizes the "et al" string.
  - `delimitor` (default: `, `): Customizes the comma string between authors.
- `capitalize`: Used with `title`, capitalize each words of the title using [capitalize-title](https://www.npmjs.com/package/capitalize-title).
- `pages`: Used with `issue.pages`, formats the pages.
  - `compact` (default: `false`): When true, uses the compact format, e.g., `1025-31` instead of `1025-1031`.
  - `delim` (default: '-'): Customizes the delimiter used between the page numbers.

### Custom HTML (`style.css`)

Anything inside this CSS will be joined to the ron's default CSS rules.
