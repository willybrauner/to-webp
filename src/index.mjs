import sharp from "sharp"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import fs from "fs"
import path from "path"
import { log } from "./log.mjs"
import { slugify } from "./slugify.mjs"
const argv = yargs(hideBin(process.argv)).argv

const options = {
  target: argv._[0] ? argv._[0] : process.cwd(),
  width: argv.width,
  height: argv.height,
  fit: argv.fit,
  position: argv.position,
  quality: argv.quality ?? 80,
  prefix: argv.prefix ?? "",
  overwrite: argv.overwrite ?? false,
}

console.log(options)

const addTempPrefixToFilePath = (filePath) =>
  path.join(
    path.dirname(filePath),
    `${path.parse(filePath).name}-temp${path.extname(filePath)}`
  )

/**
 * Convert image files to WebP format and rename them
 * @param {*} file
 */
const convertAndRenameToWebp = async (file) => {
  const originalfilePath = path.join(options.target, file)
  const originalFileNameWithoutExt = path.parse(originalfilePath).name
  const originalSlugifiedName = slugify(originalFileNameWithoutExt)

  const newFileName = `${originalSlugifiedName}${options.prefix}.webp`
  const newFilePath = path.join(options.target, newFileName)
  const newFilePathPrefixTemp = addTempPrefixToFilePath(newFilePath)

  const outputFilePath = options.overwrite ? newFilePathPrefixTemp : newFilePath

  if (originalfilePath === newFilePath && !options.overwrite) {
    log.warning(
      `Same file path, Add '--overwrite=true' option to replace the original. return.`
    )
    return
  }

  try {
    // Write
    const shp = await sharp(originalfilePath)
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
    const oldFileSize = (fs.statSync(originalfilePath).size / 1000).toFixed(2)

    // if overwrite option is set to true, remove the original file
    if (options.overwrite) {
      fs.unlinkSync(originalfilePath)
    }

    // rename the new file to the original file name
    if (options.overwrite) {
      fs.renameSync(outputFilePath, originalfilePath)
    }

    const newFileSize = (fs.statSync(newFilePath).size / 1000).toFixed(2) // size in KB

    log.info(file, `→ ${oldFileSize} KB`)
    log.success(`${newFileName}`, `→ ${newFileSize} KB`)
    log.info(`${(newFileSize - oldFileSize).toFixed(2)} KB \n`)
  } catch (err) {
    log.error(`Error converting ${file}:`, err)
  }
}

/**
 * When the script is executed
 *  Read the directory and convert each image file to WebP format
 */
fs.readdir(options.target, (err, files) => {
  if (err) throw err

  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase()
    return ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp"
  })

  // If no images are found, log a message
  if (imageFiles.length === 0) {
    log.warning(`No images to convert founded in ${options.target}`)
    return
  }

  // Convert each image file to WebP format and rename
  imageFiles.forEach(convertAndRenameToWebp)
})
