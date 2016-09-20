import Canvas, { Image } from 'canvas';
import QRCode from 'qrcode';

import http from 'http';
import fs from 'fs';

const PackBits = (src) => {
	const LITERAL = 1;
	const FILL = -1;

  const length = src.length;
	const dst = [];
 
	let mode = LITERAL;
	let counter = 1;
	let count = 0;

	let c = src[0];
	while (counter < length) {
		if (mode === LITERAL) {
			const buf = [];
			buf.push(c);

			while (buf.length < length) {
				if (src[counter] === c) break;
				c = src[counter++];
				buf.push(c);
			}
			if (buf.length > 1) {
				dst.push(buf.length - 2);
				Array.prototype.push.apply(dst, buf.slice(0, buf.length - 1));
			}
			if (buf.length === length) {
				break;
			} else {
				mode = FILL;
				c = src[counter++];
				count = 2;
			}
		} else {
			while (counter < length) {
				if (c != src[counter]) {
					dst.push((256 - (count - 1)));
					dst.push(c);
					break;
				}
				count++;
        counter++;
			}
			if (counter === length) {
        dst.push((256 - (count - 1)));
        dst.push(c);
				break;
			} else {
				mode = LITERAL;
				c = src[counter++]
			}
		}
	}
	return dst;
}

const DrawRiageQRCode = ({ riage, rizumi, kigen}) => {
  return new Promise((resolve, reject) => {
    const text = `利上日${riage}\n利済日${rizumi}\n次期限${kigen}\ntel://048-987-1020`;
    QRCode.draw(text, (error, canvas) => {
      if (error) reject(new Error(error));
      resolve(canvas);
    });
  });
}

const DrawRiageLabel = ({ riage, rizumi, kigen }) => {
  return new Promise((resolve, reject) => {
    const L_OFFSET = 408;;
    const R_OFFSET = 6;
    const WIDTH = 720;
    const HEIGHT = 416;
  
    const canvas = new Canvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.antialias = 'none';
  
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
    ctx.font = '34px Osaka';
    ctx.fillStyle = '#000000';
  
    const lmargin = 5; // px
    const tmargin = 40; // px
    ctx.fillText('利上日', L_OFFSET + lmargin, tmargin);
    ctx.fillText(riage , L_OFFSET + lmargin + 104, tmargin);
    ctx.fillText('利済日', L_OFFSET + lmargin, tmargin + 42);
    ctx.fillText(rizumi, L_OFFSET + lmargin + 104, tmargin + 42);
    ctx.fillText('次期限', L_OFFSET + lmargin, tmargin + 84);
    ctx.fillText(kigen , L_OFFSET + lmargin + 104, tmargin + 84);
    ctx.stroke();

    resolve(canvas);
  })
};

const binalize = (canvas) => {
  const width = canvas.width;
  const height = canvas.height;
  const image = canvas.getContext('2d').getImageData(0, 0, width, height);

  const mono = [];
  for (let j = 0; j < height; j++) {
    const row = [];
    for (let i = 0; i < width; i += 8) { // 0 - 90
      let byte  =  0b00000000;
      for (let k = 0; k < 8; k++) {
        const m = ((j * width + (width - i - 1)) + k) * 4;
        const bw = image.data[m] === 0 ? 0b00000000 : 0b00000001;
        byte |= (bw << k);
      }
      row.push(~byte);
    }
    mono.push(row);
    mono.push(row);
  }
  return mono;
}

const rasterize = (rows) => {
  const raster = [];

  rows.map((row, j) => {
    const tmp = PackBits(row)
    raster.push(0x67);
    raster.push(0x00);
    raster.push(tmp.length);
    Array.prototype.push.apply(raster, tmp);
  });

  return raster;
}

const raster = ({ riage, rizumi, kigen }) => {
  return Promise.all([
    DrawRiageLabel({ riage, rizumi, kigen }),
    DrawRiageQRCode({ riage, rizumi, kigen}),
  ])
  .then(canvases => {
    const label = canvases[0];
    const qrcode = new Image;
    qrcode.src = canvases[1].toBuffer();
    label.getContext('2d').drawImage(qrcode, 440, 150);
    fs.writeFile('label.png', label.toBuffer(), (err) => { if (err) console.log(err) });
    return label;
  })
  .then(binalize)
  .then(rasterize)
  .catch(err => console.log(err));
}

export default raster;

