import {Brother} from "./brother";
import {rasterize} from "./raster";

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {createCanvas, Image} from "canvas";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(bodyParser.json({limit: "50mb", extended: true}));

app.use(express.static("public"));

app.post("/v2/get-job-attribute", async function (req, res) {
  const uri = req.body.uri;
  const userName = req.body.userName;
  const jobId = req.body.jobId;
});

enum LabelType {
  Label29x90,
  Label38x90
}

namespace LabelType {
  export function width(type: LabelType): number {
    switch (type) {
      case LabelType.Label29x90:
        return 29;
      case LabelType.Label38x90:
        return 38;
    }
  }

  export function height(type: LabelType): number {
    switch (type) {
      case LabelType.Label29x90:
        return 90;
      case LabelType.Label38x90:
        return 90;
    }
  }

  export function fromSize(w: number, h: number): LabelType | undefined {
    if (w === 29 && h === 90) return LabelType.Label29x90;
    else if (w === 38 && h === 90) return LabelType.Label38x90;
    else return undefined;
  }
}

interface Label {
  kind: "label";
  type: LabelType;
}

enum RollType {
  Roll12,
  Roll29,
  Roll38,
  Roll50,
  Roll54,
  Roll62
}

namespace RollType {
  export function width(type: RollType): number {
    switch (type) {
      case RollType.Roll12:
        return 12;
      case RollType.Roll29:
        return 29;
      case RollType.Roll38:
        return 38;
      case RollType.Roll50:
        return 50;
      case RollType.Roll54:
        return 54;
      case RollType.Roll62:
        return 62;
    }
  }

  export function fromSize(w: number): RollType | undefined {
    if (w === 12) return RollType.Roll12;
    else if (w === 29) return RollType.Roll29;
    else return undefined;
  }
}

interface Roll {
  kind: "roll";
  type: RollType;
  length: number;
}

type Paper = Label | Roll;

namespace Paper {
  export function width(paper: Paper): number {
    switch (paper.kind) {
      case "label":
        return LabelType.width(paper.type);
      case "roll":
        return RollType.width(paper.type);
    }
  }
  export function height(paper: Paper): number {
    switch (paper.kind) {
      case "label":
        return LabelType.height(paper.type);
      case "roll":
        return paper.length;
    }
  }
}

app.post("/v2/print", async function (
  req: express.Request,
  res: express.Response
) {
  console.log("request received");

  try {
    let paper: Paper;

    if (req.body.kind === "label") {
      if (req.body.width && req.body.height) {
        const type = LabelType.fromSize(req.body.width, req.body.height);
        if (type) {
          paper = {
            kind: "label",
            type: type
          };
        } else {
          throw Error("INVALID PAPER SIZE");
        }
      } else {
        throw Error("INVALID PAPER SIZE");
      }
    } else if (req.body.kind === "roll") {
      if (req.body.width && req.body.length) {
        const type = RollType.fromSize(req.body.width);
        if (type) {
          paper = {
            kind: "roll",
            type: type,
            length: req.body.length
          };
        } else {
          throw Error("INVALID PAPER SIZE");
        }
      } else {
        throw Error("INVALID PAPER SIZE");
      }
    } else {
      throw Error("INVALID PAPER");
    }

    const listOfPng: string[] = req.body.data.pngs;

    if (!listOfPng || listOfPng.length <= 0) {
      throw Error("Invalid Paramters");
    }

    const uri = req.body.uri;
    const userName = req.body.userName;
    const hires: boolean = req.body.hires || false;

    const promises: Promise<number[]>[] = listOfPng.map(
      (png: string): Promise<number[]> => {
        return pngToRaster(png, paper, hires);
      }
    );
    const rasters: number[][] = await Promise.all(promises);

    const label = new RasterLabel(rasters);
    const jobId: number = await label.print(uri);

    res.status(200).json({
      jobId
    });
  } catch (e) {
    res.status(404).json({
      e
    });
  }
});

const pngToRaster = (
  png: string,
  paper: Paper,
  hires: boolean = false
): Promise<number[]> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const PINS: number = 720;
    const factor = hires ? 2 : 1;

    let h = Paper.height(paper);

    image.onload = () => {
      const canvas = createCanvas(PINS, h * factor);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const raster = rasterize(canvas);
      resolve(raster);
    };

    image.onerror = e => {
      console.log(e);
      reject(e);
    };

    image.src = png;
  });
};

app.listen(5000, "0.0.0.0", () =>
  console.log("Node P-Touch Printing Server listening on port 5000!")
);


class RasterLabel {
  _buffer = [];

  invalidate = new Buffer(200).fill(0);
  initialize = new Buffer([0x1b, 0x40]);
  switchToRaster = new Buffer([0x1b, 0x69, 0x61, 0x01]);
  printInstruction = (paper: Paper, hires: boolean) => {
    return new Buffer([0x1b, 0x69, 0x71, 0b10001110, 0x0b, 29, 90, 0xdf, 0x03, 0x00, 0x00, 0x00, 0x00]);
  }
  autocut = (flag: boolean) => {
    if (flag) {
      return new Buffer([0x1b, 0x69, 0x4d, 0b01000000]);
    } else {
      return new Buffer([0x1b, 0x69, 0x4d, 0b00000000]);
    }
  }
  setExtra = (cutAtEnd: boolean, hires: boolean) => {
    const flagCutAtEnd = cutAtEnd ? 0b00001000 : 0b00000000;
    const flagHires = hires ? 0b01000000 : 0b00000000;

    return new Buffer([0x1b, 0x69, 0x4b, flagCutAtEnd + flagHires]);
  }

  init = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x40, 0x1b, 0x69, 0x61, 0x01, // ESC i a {n1} : 動的コマンドモード切替 P28
    0x1b, 0x69, 0x7a, 0b10001110, 0x0b, 0x1d, 0x5a, 0xdf, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, // ESC i z 印刷情報指令 P30
    //    0x1b, 0x69, 0x7a, 0b10001110, 0x0a, 0x1d, 0x00, 0x40, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x4d, 0x40,
    0x1b, 0x69, 0x41, 0x01, // ESC i A 1 : オートカット枚数指定 P32
    0x1b, 0x69, 0x4b, 0b01001000, // ESC i K 08 :  enable hight quality printing
    0x1b, 0x69, 0x64, 0x00, 0x00, // ESC i d {n1} {n2} : 余白量指定 P27
    0x4d, 0x02 // 4D {n} : 圧縮モード選択 P31
  ];

  // Control-Z : 排出動作を伴う印字指令 P29
  eject = [0x1a];

  constructor(rasters: number[][], paper: Paper, hires: boolean) {
    if (rasters) {
      this.initPage(rasters[0]);

      rasters.shift();
      rasters.forEach(raster => this.addPage(raster));

      this.ejectPages();
    }
  }

  initPage(data: number[]) {
    this._buffer = this.init.concat(data);
  }

  addPage(data: number[]) {
    // 前のページの末尾に印字指令`FF(0x0C)`を付加する P29
    this._buffer.push(0x0c);

    // その他のページであることを指定
    const printInfoCmd = [
      0x1b,
      0x69,
      0x7a,
      0b10001110,
      0x0b,
      0x1d,
      0x5a,
      0xdf,
      0x03,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00 // ESC i z 印刷情報指令 P30
    ];
    Array.prototype.push.apply(this._buffer, printInfoCmd);

    // ラスターデータを付加
    Array.prototype.push.apply(this._buffer, data);
  }

  ejectPages() {
    //     Buffer.from(Array.prototype.concat.apply([], [this.init, this._buffer, this.eject]));
    Array.prototype.push.apply(this._buffer, this.eject);
  }

  async print(uri: string): Promise<number> {
    const brother = new Brother(uri);
    const jobId = await brother.print(Buffer.from(this._buffer));
    return jobId;
  }
}
