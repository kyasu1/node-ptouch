import { Brother } from './brother';
import { rasterize } from './raster';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createCanvas, Image } from 'canvas';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb', extended: true }));

app.use(express.static('public'));

app.post('/print', function(req, res) {
  
  console.log('request received');

  const pngs = req.body.data.pngs;

  if (pngs && pngs.length > 0) {
    Promise.all(pngs.map(png => {
      return pngToRaster(png);
    }))
      .then((rasters: number[][]) => {
        const label = new RasterLabel(rasters);
        const jobId = label.print('http://192.168.1.119:631/ipp/print');
      })
      .catch(e => {
        console.log(e);
        res.status(500);
        res.send({ error: e });
      });
  } else {
      res.status(404);
      res.send({ error: 'no data' });
  }
});

const pngToRaster = (png) => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = createCanvas(720, 991);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const raster = rasterize(canvas);
      resolve(raster);
    }

    image.onerror = (e) => {
      console.log(e);
      reject(e);
    }

    image.src = png;
  })
};


app.listen(5000, '0.0.0.0', () => console.log("Node P-Touch Printing Server listening on port 5000!"));

class RasterLabel {
  _buffer = [];

  init = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x40,
    0x1b, 0x69, 0x61, 0x01, // ESC i a {n1} : 動的コマンドモード切替 P28
    0x1b, 0x69, 0x7a, 0b10001110, 0x0b, 0x1d, 0x5a, 0xdf, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, // ESC i z 印刷情報指令 P30
    //    0x1b, 0x69, 0x7a, 0b10001110, 0x0a, 0x1d, 0x00, 0x40, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x4d, 0x40,
    0x1b, 0x69, 0x41, 0x01, // ESC i A 1 : オートカット枚数指定 P32
    0x1b, 0x69, 0x4b, 0b01001000, // ESC i K 08 :  enable hight quality printing
    0x1b, 0x69, 0x64, 0x00, 0x00, // ESC i d {n1} {n2} : 余白量指定 P27
    0x4d, 0x02, // 4D {n} : 圧縮モード選択 P31
  ];

  // Control-Z : 排出動作を伴う印字指令 P29
  eject = [
    0x1a
  ];

  constructor(rasters: number[][]) {
    if (rasters) {
      this.initPage(rasters[0]);

      rasters.shift();
      rasters.forEach(raster =>
        this.addPage(raster)
      );

      this.ejectPages();
    }
  }

  initPage(data: number[]) {
    this._buffer = this.init.concat(data);
  }

  addPage(data: number[]) {
    // 前のページの末尾に印字指令`FF(0x0C)`を付加する P29
    this._buffer.push(0x0C);

    // その他のページであることを指定
    const printInfoCmd = [
      0x1b, 0x69, 0x7a, 0b10001110, 0x0b, 0x1d, 0x5a, 0xdf, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00 // ESC i z 印刷情報指令 P30
    ];
    Array.prototype.push.apply(this._buffer, printInfoCmd);

    // ラスターデータを付加
    Array.prototype.push.apply(this._buffer, data);
  }

  ejectPages() {
    //     Buffer.from(Array.prototype.concat.apply([], [this.init, this._buffer, this.eject]));
    Array.prototype.push.apply(this._buffer, this.eject);
  }

  public async print(uri: string) {
    const brother = new Brother(uri);
    const jobId = await brother.print(Buffer.from(this._buffer));
  }
}


