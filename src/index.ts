import { Brother } from './brother';
import { rasterize, binalize } from './raster';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createCanvas, Image } from 'canvas';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/print', function(req, res) {
  
  console.log('request received');

  const image = new Image();

  image.onload = () => {
    const canvas = createCanvas(720, 991);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const mono = binalize(canvas);
    const raster = rasterize(mono);
    const label = new RasterLabel(raster);
    
    const url = 'http://192.168.1.119:631/ipp/print';
    const brother = new Brother(url);
    brother.print(label.getBuffer());
    
    res.send( {'result': 'ok' });
  }

  image.onerror = (e) => {
    res.status(500);
    res.send({ error: e } );
  }

  image.src = req.body.png;
});

app.listen(5000, () => console.log("Node P-Touch Printing Server listening on port 5000!"));

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
  
  eject = [
    0x1a
  ];

  constructor(data) {
    this._buffer = data;
  }

  public getBuffer() {
    return Buffer.from(Array.prototype.concat.apply([], [this.init, this._buffer, this.eject]));
  }
}


