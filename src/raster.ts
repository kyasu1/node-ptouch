import {Canvas, createCanvas, Image} from 'canvas';
import {Paper} from './paper';

const packBits = (src) => {
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

const binalize = (canvas: Canvas): number[][] => {
  const width: number = canvas.width;
  const height: number = canvas.height;
  const threshold: number = 128;

  const image = canvas.getContext('2d').getImageData(0, 0, width, height);

  const mono: number[][] = [];
  for (let j = 0; j < height; j++) {
    const row = [];
    for (let i = 0; i < width; i += 8) { // 0 - 90
      let byte = 0b00000000;
      for (let k = 0; k < 8; k++) {
        const m = ((j * width + (width - i - 1)) + k) * 4;
        //        const avg = (image.data[m] + image.data[m+1] + image.data[m+2]) / 3

        // get approximate luma valur from RGB
        const avg = image.data[m] * 0.3 + image.data[m + 1] * 0.59 + image.data[m + 2] * 0.11;
        const bw = avg > threshold ? 0b00000001 : 0b00000000;

        byte |= (bw << k);
      }
      row.push(~byte);
    }
    // push the row twice to print at 600DPI
    mono.push(row);
  }

  return mono;
}

const rasterizeHelper = (canvas: Canvas): number[] => {
  const rows: number[][] = binalize(canvas);
  const raster: number[] = [];

  rows.map((row, _j) => {
    const tmp: number[] = packBits(row)
    raster.push(0x67);
    raster.push(0x00);
    raster.push(tmp.length);
    Array.prototype.push.apply(raster, tmp);
  });

  return raster;
}

const rasterize = (
  base64image: string,
  paper: Paper,
  hires: boolean = false
): Promise<number[]> => {
  return new Promise((resolve, reject) => {
    const spec = Paper.spec(paper);
    const image = new Image();
    const PINS: number = 720;
    const factor = hires ? 2 : 1;

    let h = spec.dots; // 991 // Paper.height(paper);

    image.onload = () => {
      const canvas = createCanvas(PINS, h * factor);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const raster = rasterizeHelper(canvas);
      resolve(raster);
    };

    image.onerror = e => {
      console.log(`Rasterrize: image.onerror: ${e}`);
      reject(e);
    };

    image.src = base64image;
  });
};

export {rasterize};

