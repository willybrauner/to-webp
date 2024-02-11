import sharp from "sharp"
import fs from "fs"
import path from "path"
import chalk from "chalk"

// convert string to dash-case and remove special characters and accents
const slugify = (input) => {
  let slug = input.toLowerCase()
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  slug = slug.replace(/[^a-z0-9\s-]/g, "").trim()
  slug = slug.replace(/[\s-]+/g, "-")
  return slug
}

// log styles
const error = chalk.bold.red
const info = chalk.gray
const success = chalk.cyan
const warning = chalk.hex("#FFA500") // Orange color

// Use the current directory if no argument is passed
const targetDir = process.argv[2] ? process.argv[2] : process.cwd()

// Convert image files to WebP format and rename them
const convertAndRenameToWebp = async (file) => {
  const originalFilePath = path.join(targetDir, file)
  const fileNameWithoutExt = path.parse(originalFilePath).name
  const slugifiedName = slugify(fileNameWithoutExt)
  const newFileName = `${slugifiedName}.webp`
  const newFilePath = path.join(targetDir, newFileName)

  try {
    await sharp(originalFilePath).webp().toFile(newFilePath)
    console.log(info(`${file}`))
    console.log(success(`→ ${newFileName}`))
  } catch (err) {
    console.error(error(`Error converting ${file}:`), err)
  }
}

// Read the directory and filter for image files (PNG, JPG, JPEG)
fs.readdir(targetDir, (err, files) => {
  if (err) throw err

  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase()
    return ext === ".png" || ext === ".jpg" || ext === ".jpeg"
  })

  // If no images are found, log a message
  if (imageFiles.length === 0) {
    console.log(warning(`No images to convert founded in ${targetDir}`))
    return
  }

  // Convert each image file to WebP format and rename
  imageFiles.forEach(convertAndRenameToWebp)
})
