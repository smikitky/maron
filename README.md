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

1. Your reference list should be places as `src/references.md`.

   ```md
   1. `tag:doe2015` John Doe. Global Warming. Science (2015) 1(2) 100-105.
   ```

1. Compile.

   ```
   npx ron
   ```
