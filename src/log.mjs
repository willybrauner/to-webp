import chalk from "chalk"

export const log = {
  error: (...rest) => console.log(chalk.bold.red(...rest)),
  info: (...rest) => console.log(chalk.gray(...rest)),
  success: (...rest) => console.log(chalk.cyan(...rest)),
  warning: (...rest) => console.log(chalk.hex("#FFA500")(...rest)),
}
