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

const raster = ({ riage, rizumi, kigen }) => {
  const px = (mm) => Math.floor(mm / 25.4 * 300);

  const L_OFFSET = 408;;
  const R_OFFSET = 6;
  const WIDTH = 720;
  const HEIGHT = 416;

  const canvas = new Canvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.antialias = 'none';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.font = '34px Osaka';
  ctx.fillStyle = '#FFFFFF';

  const lmargin = 5; // px
  const tmargin = 40; // px
  ctx.fillText('利上日', L_OFFSET + lmargin, tmargin);
  ctx.fillText(riage , L_OFFSET + lmargin + 104, tmargin);
  ctx.fillText('利済日', L_OFFSET + lmargin, tmargin + 42);
  ctx.fillText(rizumi, L_OFFSET + lmargin + 104, tmargin + 42);
  ctx.fillText('次期限', L_OFFSET + lmargin, tmargin + 84);
  ctx.fillText(kigen , L_OFFSET + lmargin + 104, tmargin + 84);
  ctx.stroke();

  const text = `利上日${riage} 利済日${rizumi} 次期限${kigen} tel://048-987-1020`;
  const qrcode = (text, cb) => {
    QRCode.draw(text, (error, bits, width) => {
      if (error) console.log(error);
      cb(bits, width);
    });
  };

  fs.writeFile('test.png', canvas.toBuffer(), (err) => {
    if (err) console.log(err);
  });
  
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);

  const mono = new Uint8Array(WIDTH * HEIGHT * 2 / 8);
  for (let j = 0; j < HEIGHT; j++) {
    for (let i = 0; i < WIDTH; i += 8) { // 0 - 90
      const l = (2 * j * WIDTH + i) / 8;
      const l2 = (l + 2 * j * WIDTH / 8);
      mono[l] =  0b00000000;
      mono[l2] = 0b00000000;
      for (let k = 0; k < 8; k++) {
        // const m = (l * 8 + k) * 4;
        const m = ((j * WIDTH + (WIDTH - i - 1)) + k) * 4;
        const bw = image.data[m] === 0 ? 0b00000000 : 0b00000001;
        // mono[l] = mono[l] | (bw << (7 - k));
        mono[l] = mono[l] | (bw << k);
        mono[l2] = mono[l2] | (bw << k);
      }
    }
  }
 
  const raster = [];
  const len = WIDTH / 8;

  for (let j = 0; j < HEIGHT * 2; j++) {
    const src = mono.slice(j * len, (j + 1) * WIDTH / 8);
    const row = PackBits(src)
    raster.push(0x67);
    raster.push(0x00);
    raster.push(row.length);
    Array.prototype.push.apply(raster, row);
  }
  /*
  fs.writeFile('mono.tiff', Buffer.from(raster), (err) => {
    if (err) console.log(err);
  });
  */
  return raster;
}

export default raster;

/*
http.createServer((req, res) => {
  const data = raster( {
    riage: 'h28/09/17',
    rizumi = 'h28/07/25',
    kigen = 'h28/10/25',
  });

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<img src="' + canvas.toDataURL() + '" />');
}).listen(3000);
*/
