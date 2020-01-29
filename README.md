# Ron

Ron is a helper script for writing manuscripts in markdown.

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
   $ npm install @smikitky/ron
   ```

1. Run the setup script. This will create a directory called `src` in your project and fills it with sample files.

   ```bash
   $ npx ron --init
   ```

1. Write your manuscript and compile.

   ```bash
   $ npx ron
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
  - References list: `` `references` ``
  - Figure reference `` `fig:<tag>` `` (e.g., `` `fig:mydog` ``)
  - Figures list: `` `figures` ``

### References (`references.yaml`)

Your reference list should be placed as `src/references.yaml`.

```yaml
yamada2010:
  authors: T Yamada, I Suzuki, H Eto et al.
  title: 'Alice in Wonderland'
  journal: Science
  issue: '2010;5(6): 1038-1053'
```

Here `yamda2010` is the "tag" of this entry. In the main manuscript file, this entry is referred to like `` `ref:yamada2010` ``.

Near the end of your manuscript, you can output the references list by writing `` `references` ``.

### Figures (`figures.yaml`)

Ron will convert your figures into TIFF (for submission) and PNG (for HTML previeww) files. The format is similar to that of `references.yaml`.

```yaml
my-rabbit:
  caption: My rabbit.
  resolution: 300
my-cat:
  caption: My cat.
```

Source image files can be PDF (`*.pdf`), PNG (`*.png`) or JPEG (`*.jpg`). They must be placed under your source directory with appropreate extentions (e.g., `src/my-rabbit.pdf`, `src/my-cat.jpg`).

Specify `resolution` to determine the resolution to your PDF.

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
```

Values named `format` are processed using the Handlebar template engine.

- `reference.format`: Defines the references format.
- `citation.format`: Defines the citation format. For example, you can set this to `<sup>{{{items}}}</sup>` instead of the default.
- `citation.itemSep` (default: `','`): Defines the comma between cite index. ([])
- `citation.hyphen` (default: `'-'`)

### Custom HTML (`style.css`)

Anything inside this CSS will be joined to the ron's default CSS rules.
