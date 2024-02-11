# to webp

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Description

Quick and dirty code to convert `png` and `jpg` images to `webp` format.

## Requirements

- Nodejs >= 20

## Installation

- Clone the repository.
- install dependencies with `npm i`

## Usage

From the root of this repository, convert all images of another directory to `webp`:

```sh
node src/index.mjs /target-images-directory
```

It will create new files with the same name and the `webp` extension and "slugify" names.

## Credits

[Willy Brauner](https://willybrauner.com)
