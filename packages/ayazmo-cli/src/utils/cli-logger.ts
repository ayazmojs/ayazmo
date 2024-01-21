import chalk from 'chalk';
import ora from 'ora';
import figures from 'figures';

interface Task {
  message: string;
  run: () => Promise<void>;
}

const CliLogger = {
  error: (msg: string): void => {
    console.log(chalk.red(figures.cross), chalk.red(msg));
  },
  warn: (msg: string): void => {
    console.log(chalk.yellow(figures.warning), chalk.yellow(msg));
  },
  success: (msg: string): void => {
    console.log(chalk.green(figures.tick), chalk.green(msg));
  },
  info: (msg: string): void => {
    console.log(chalk.cyan(msg));
  },
  list: async (tasks: Task[]): Promise<void> => {
    for (const task of tasks) {
      const spinner = ora(task.message).start();
      await task.run();
      spinner.succeed(`${task.message}`);
    }
  },
  task: async (message: string, task: () => Promise<void>): Promise<void> => {
    const spinner = ora(message).start();
    await task();
    spinner.succeed(`${message}`);
  }
};

export default CliLogger;