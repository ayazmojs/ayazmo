import figlet from 'figlet'
import chalk from 'chalk'

export default function printAyazmo (): void {
  const fonts = figlet.fontsSync()
  console.log(
    chalk.blueBright(figlet.textSync('AYAZMO', {
      font: fonts[Math.floor(Math.random() * fonts.length)],
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 100,
      whitespaceBreak: true
    })
    )
  )
}
