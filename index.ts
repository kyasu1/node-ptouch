import fs from 'fs';
import { Brother } from './brother.ts';
import { rasterize, binalize } from './raster';
import { fabric } from 'fabric';

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
  /*
  const canvas = new fabric.Canvas(null, { width: 342, height: 1061} );

  fabric.loadSVGFromString(req.body.svg, function(objects, options) {
    const obj = new fabric.Group(objects, options);
    canvas.add(obj);

    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.8 });
    fs.writeFileSync('a.jpg', dataUrl);

    const mono = binalize(canvas);
    const raster = rasterize(mono);
    const label = new RasterLabel(raster);

    //    const url = 'http://192.168.1.119:631/ipp/print';
    //    const brother = new Brother(url);
    //    brother.print(label.getBuffer());

    res.send( {'result': 'ok' });
  });
  */

  const image = new Image();

  image.onload = () => {
    // const canvas = createCanvas(342, 1061);
    const canvas = createCanvas(720, 1061);
    const ctx = canvas.getContext('2d');
    ctx.antialias = 'none';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 720, 1061);

    ctx.drawImage(image, 0, 0);

    fs.writeFileSync('./a.png', canvas.toDataURL('image/png'));

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
    res.status('error', { error: e } );
  }

  fs.writeFileSync('./a.svg', req.body.svg);

  //  const svgData = new XMLSerializer().serializeToString(req.body.svg);
  //  const data = Buffer.from(svgData).toString('base64');
  //  image.src = 'data:image/svg+xml;charset=utf-8;base64,' + data;
  image.src = './a.svg';
});

app.listen(5000, () => console.log("Example app listening on port 5000!"));


class RasterLabel {
  _buffer = [];

  init = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x61, 0x01,
    0x1b, 0x69, 0x7a, 0b10001110, 0x0a, 0x1d, 0x00, 0x40, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x4d, 0x40,
    0x1b, 0x69, 0x41, 0x01, // ESC i A 1 : enable autocut for each page
    0x1b, 0x69, 0x4b, 0b01001000, // ESC i K 08 :  enable hight quality printing
    0x1b, 0x69, 0x64, /* 0x23 */, 0x00, 0x00,
    0x4d, 0x02,
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

/*
const RiageLabel = async ({ riage, rizumi, kigen }) => {
  const label = RasterLabel();
  const data = await raster({ riage, rizumi, kigen });
  label.setData(data);
  return label.getBuffer();
}

RiageLabel({
  riage: 'H28/09/17',
  rizumi: 'H28/06/05',
  kigen: 'H28/09/05'
})
.then(label => {
  const url = 'http://192.168.1.119:631/ipp/print';
  const brother = new Brother(url);
  brother.print(label);
});
 */
