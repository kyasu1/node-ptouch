import fs from 'fs';
import Brother from './brother';
import raster from './raster';

const TemplateLabel = () => {
  let _buffer = [];

  const toAscii = (text) => {
    let myBuffer = [];
    const buf = Buffer.from(text);
    for (let i=0 ; i < buf.length ; i++) {
      myBuffer.push(buf[i]);
    }
    return myBuffer;
  }

  const selectField = (field) => {
    const ascii = toAscii(field);
    _buffer = _buffer.concat([0x5e, 0x4f, 0x4e], ascii, [0x00]);
  };
  
  const setValue = (value) => {
    const ascii = toAscii(value);
    const length = ascii.length; // TODO check if longer than 256
    const mod = length % 256;
    const len = Math.floor(length / 256);
    _buffer = _buffer.concat([0x5e, 0x44, 0x49, mod, len], ascii);
  }

  const setObject = (field, value) => {
    selectField(field);
    setValue(value);
  }
 
  const init = [
    0x1b, 0x69, 0x61, 0x03, // ESC i a 03 : switch to P-touch template mode
    0x5e, 0x49, 0x49,  // ^ | | : initialize
    0x5e, 0x54, 0x53, 0x30, 0x30, 0x31, // ^ T S 00 00 01 : select tamplate no 1
    0x5e, 0x43, 0x4f, 0x00, 0x00, 0x00, 0x00, // disable all cut functions
   ];
  
  const print = [
    0x5e, 0x46, 0x46,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x61, 0x01,
    0x1b, 0x69, 0x7a, 0b11001110, 0x0a, 0x1d, 0x00, /* 0xc4*/ 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x4d, 0x40,
    0x1b, 0x69, 0x41, 0x01, // ESC i A 1 : enable autocut for each page
    0x1b, 0x69, 0x4b, 0b01001000, // ESC i K 48 :  enable hight quality printing
    0x1b, 0x69, 0x64, 0x00, 0x00, // ESC i d 00 00 : set no margin 
    0x4d, 0x02,
    0x1a
  ];

  const getBuffer = () => {
    return Buffer.from(Array.prototype.concat.apply([], [init, _buffer, print]));
  }

  const save = (filename) => {
    fs.writeFile(filename, getBuffer(), (error) => {
      if (error) {
        console.log('===================== FILE SAVE ERROR ====================');
        console.log(error);
      }
    });
  }

  return {
    setObject,
    getBuffer,
    save,
  }
}

const RasterLabel = () => {
  let _buffer = [];

  const init = [
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
  const eject = [
    0x1a
  ];

  const setData = (data) => {
    _buffer = data;
  }

  const getBuffer = () => {
    return Buffer.from(Array.prototype.concat.apply([], [init, _buffer, eject]));
  }

  return {
    setData,
    getBuffer,
  }
}

const RiageLabel = ({ riage, rizumi, kigen }) => {
  const label = RasterLabel();
  const data = raster({ riage, rizumi, kigen });
  label.setData(data);
  return label.getBuffer();
}

/*
const RiageLabel = ({riage, rizumi, kigen}) => {
  const label = TemplateLabel();
  label.setObject('t1', riage);
  label.setObject('t2', rizumi);
  label.setObject('t3', kigen);

  const qrcode = `取引日${riage} 利済日${rizumi} 次期限${kigen} tel://048-987-1020`;
  label.setObject('q', qrcode);

  label.save('test.prn');

  return label.getBuffer();
}
*/

const label = RiageLabel({
  riage: 'H28/09/17',
  rizumi: 'H28/06/05',
  kigen: 'H28/09/05'
});
/*
fs.readFile('./raster-null.prn', (err, data) => {
  if (err) {
    console.log('ERROR');
    return
  }
  const raster = Buffer(data);
  const url = 'http://192.168.1.109:631/ipp/print';
  const brother = new Brother(url);
  brother.print(raster);
})
*/

const url = 'http://192.168.1.109:631/ipp/print';
const brother = new Brother(url);
// brother.print(label);
