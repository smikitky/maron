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

1. Prepare your manuscripts in a file named `src/index.md`.

   ```md
   # My Splendid Research

   ## Background

   Doe et al has revealed the following `ref:doe2015`.

   ## References

   `references`
   ```

1. Your reference list should be places as `src/references.yaml`. `references` is the list of your references. `style` is a handlebar template that defines how your references will be stringified.

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

1. Compile.

   ```
   npx ron
   ```
