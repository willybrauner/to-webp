import sharp from 'sharp'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { log } from './log.mjs'
import { slugify } from './slugify.mjs'
const argv = yargs(hideBin(process.argv)).argv
import debugg from '@wbe/debug'
import chalk from 'chalk'
const debug = debugg('towebp')

const options = {
  targets: argv._.length ? argv._.map(String) : [process.cwd()],
  width: argv.width || argv.w,
  height: argv.height || argv.h,
  fit: argv.fit,
  position: argv.position || argv.pos,
  quality: (argv.quality || argv.q) ?? 80,
  prefix: (argv.prefix || argv.p) ?? '',
  overwrite: (argv.overwrite || argv.o) ?? false,
  walker: (argv.walker) ?? false,
  removeOriginalMedia: argv['remove-original-media'] ?? false,
}

debug('options', options)

const addTempPrefixToFilePath = (filePath) =>
  path.join(
    path.dirname(filePath),
    `${path.parse(filePath).name}-temp${path.extname(filePath)}`,
  )

const HEIC_EXTENSIONS = ['.heic', '.heif']

/**
 * sharp's prebuilt libvips does not ship the HEVC decoder (licensing), so it
 * fails to read real iPhone HEIC photos ("Unsupported codec"). macOS itself
 * can decode HEIC natively via `sips`, so pre-convert to a temp PNG with it
 * and let sharp pick up from there.
 */
const convertHeicToTempPng = (filePath) => {
  const tempPngPath = path.join(
    os.tmpdir(),
    `${path.parse(filePath).name}-${Date.now()}.png`,
  )
  execFileSync('sips', ['-s', 'format', 'png', filePath, '--out', tempPngPath], {
    stdio: 'pipe',
  })
  return tempPngPath
}

/**
 * Convert image files to WebP format and rename them
 * @param {*} filePath
 */
const convertAndRenameToWebp = async (filePath) => {
  const originalFileNameWithoutExt = path.parse(filePath).name
  const originalSlugifiedName = slugify(originalFileNameWithoutExt)

  const newFileNameWithExt = `${originalSlugifiedName}${options.prefix}.webp`
  const newFilePath = path.join(path.dirname(filePath), newFileNameWithExt)
  const newFilePathPrefixTemp = addTempPrefixToFilePath(newFilePath)

  const outputFilePath = options.overwrite ? newFilePathPrefixTemp : newFilePath

  debug({
    filePath,
    originalFileNameWithoutExt,
    originalSlugifiedName,
    newFileNameWithExt,
    newFilePath,
    newFilePathPrefixTemp,
    outputFilePath,
  })

  if (filePath === newFilePath && !options.overwrite) {
    log.warning(
      `Same file path ${filePath} \n, Add '--overwrite=true' option to replace the original. return.`,
    )
    return
  }

  const isHeic = HEIC_EXTENSIONS.includes(path.extname(filePath).toLowerCase())
  let sourceFilePath = filePath
  let tempHeicPngPath = null

  try {
    if (isHeic) {
      tempHeicPngPath = convertHeicToTempPng(filePath)
      sourceFilePath = tempHeicPngPath
    }

    // Write
    const shp = await sharp(sourceFilePath)
    if (options.width || options.height || options.fit || options.position) {
      shp.resize({
        width: options.width,
        height: options.height,
        position: options.position,
        fit: options.fit,
      })
    }
    shp.webp({ quality: options.quality })
    await shp.toFile(outputFilePath)

    // Get old size
    const oldFileSize = (fs.statSync(filePath).size / 1000).toFixed(2)

    // if overwrite option is set to true, remove the original file
    if (options.overwrite) {
      fs.unlinkSync(filePath)
    }

    // rename the new file to the original file name
    if (options.overwrite) {
      fs.renameSync(outputFilePath, filePath)
    }

    // if remove option is set to true, delete the original source file
    if (options.removeOriginalMedia && filePath !== newFilePath) {
      fs.unlinkSync(filePath)
    }

    const newFileSize = (fs.statSync(newFilePath).size / 1000).toFixed(2) // size in KB

    log.info(filePath, `→ ${oldFileSize} KB`)
    log.success(`${newFilePath}`, `→ ${newFileSize} KB`)

    const isDecreased = newFileSize - oldFileSize < 0
    const isEquals = newFileSize - oldFileSize === 0

    const diffSymbol = isDecreased ? '↓' : isEquals ? '=' : '↑'
    const diffColor = isDecreased ? 'green' : isEquals ? 'yellow' : 'red'

    console.log(
      chalk[diffColor](
        `${diffSymbol} ${(newFileSize - oldFileSize).toFixed(2)} KB \n`,
      ),
    )
  } catch (err) {
    log.error(`> Error converting ${filePath}:`, err)
  } finally {
    if (tempHeicPngPath && fs.existsSync(tempHeicPngPath)) {
      fs.unlinkSync(tempHeicPngPath)
    }
  }
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', ...HEIC_EXTENSIONS]

const isImageFile = (filePath) =>
  IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())

const collectImagesRecursive = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectImagesRecursive(fullPath)
    if (entry.isFile() && isImageFile(entry.name)) return [fullPath]
    return []
  })
}

/**
 * When the script is executed
 *  Read the directory (or each glob-expanded target) and convert each image file to WebP format
 */
for (const target of options.targets) {
  const isDirectory = fs.lstatSync(target).isDirectory()
  const isFile = fs.lstatSync(target).isFile()

  if (isDirectory) {
    let imageFiles

    if (options.walker) {
      imageFiles = collectImagesRecursive(target)
    } else {
      imageFiles = fs
        .readdirSync(target)
        .filter(isImageFile)
        .map((f) => path.join(target, f))
    }

    if (imageFiles.length === 0) {
      log.warning(`No images to convert founded in ${target}`)
    } else {
      for (const filePath of imageFiles) {
        await convertAndRenameToWebp(filePath)
      }
    }
  }

  if (isFile) {
    await convertAndRenameToWebp(target)
  }
}
