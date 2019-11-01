# Ron

Ron is a helper script for writing manuscripts in markdown.

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

1. Run the setup script. This will create a directory called `src` in your prject and fills it with sample files.

   ```bash
   $ npx ron --init

   ```

1. Compile.

   ```bash
   $ npx ron
   ```

   Use `npx ron --help` to see available options.

## Directory Structure

```
src/
  index.md
  references.yaml
  figures.yaml
  style.css
```

### Main Manuscript (`index.md`)

This is the main manuscript written in the Markdown format.

### References (`references.yaml`)

Your reference list should be places as `src/references.yaml`. `references` is the list of your references. `style` is a handlebar template that defines how your references will be stringified.

```yaml
style: >
  {{authorList authors max=3}}. <b>{{capitalize title}}</b>. {{journal}} {{issue.year}};{{issue.volume}}({{issue.issue}}): {{{pages issue.pages compact=true delim='&ndash;'}}}.
references:
  yamada2010:
    authors: T Yamada, I Suzuki, H Eto et al.
    title: 'Alice in Wonderland'
    journal: Science
    issue: '2010;5(6): 1038-1053'
```

### Figures (`figures.yaml`)

Ron will convert your figures into TIFF (for submission) and PNG (for HTML previeww) files.

```yaml
my-rabbit:
  caption: My rabbit.
  resolution: 300
my-cat:
  caption: My cat.
```

Source image files can be PDF (`*.pdf`), PNG (`*.png`) or JPEG (`*.jpg`). They must be placed under your source directory with appropreate extentions (e.g., `src/my-rabbit.pdf`, `src/my-cat.jpg`).

Specify `resolution` to determine the resolution to your PDF.
