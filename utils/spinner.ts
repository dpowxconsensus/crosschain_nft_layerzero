import process from "process";
const fs = require("fs");
const rdl = require("readline");
const l = console.log;
const std = process.stdout;

const cliSpinners = require("cli-spinners");

class Spinner {
  timer!: NodeJS.Timer;
  spin(spinnerName) {
    process.stdout.write("\x1B[?25l");
    const spin = cliSpinners[spinnerName];
    const spinnerFrames = spin.frames;
    const spinnerTimeInterval = spin.interval;
    let index = 0;

    this.timer = setInterval(() => {
      let now = spinnerFrames[index];

      if (now == undefined) {
        index = 0;
        now = spinnerFrames[index];
      }
      std.write(now);
      rdl.cursorTo(std, 0, 0);
      index = index >= spinnerFrames.length ? 0 : index + 1;
    }, spinnerTimeInterval);
  }
}

export default Spinner;
