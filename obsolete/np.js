import printer from 'printer';

const selectField = (field) => {
  const ascii = toAscii(field);
  return [0x5e, 0x4f, 0x4e].concat(ascii, [0x00]);
};

const setField = (text) => {
  const ascii = toAscii(text);
  const length = ascii.length; // TODO check if longer than 256
  const mod = length % 256;
  const len = Math.floor(length / 256);
  return [0x5e, 0x44, 0x49].concat(mod, len, ascii);
}

const toAscii = (text) => {
  let myBuffer = [];
  const buf = Buffer.from(text);
  for (let i=0 ; i < buf.length ; i++) {
    myBuffer.push(buf[i]);
  }
  return myBuffer;
//  return text.split('').map((item) => item.charCodeAt(0));
}


const initialize = [
  0x1b, 0x40,
  0x1b, 0x69, 0x61, 0x03, // ESC i a 03 : switch to P-touch template mode
  0x5e, 0x49, 0x49,  // ^ | | : initialize
  0x5e, 0x54, 0x53, 0x30, 0x30, 0x31, // ^ T S 00 00 01 : select tamplate no 1
 ];

const startPrinting = [
//  0x5e, 0x46, 0x46, // ^ F F : pintout
    0x1b, 0x69, 0x61, 0x00, // ESC i a 01 : switch to Raster mode
    0x13,
];

const buffer = new Buffer([].concat(
  initialize,
  selectField('t1'),
  setField('H28/07/21'),
  selectField('t2'),
  setField('H28/10/21'),
  selectField('q'),
  setField('利上日H28/09/12 利済日H28/07/21 次期限H28/10/21 tel://048-987-1020'),
  startPrinting
  ));

const MODEL = 'Brother_QL_720NW'; 

printer.printDirect({
  data: buffer,
  printer: MODEL,
  type: 'RAW',
  success: (jobId) => console.log('success: ', jobId),
  error: (error) => console.log('error: ', error),
  options: {
    waitjob: false,
    waitprinter: false,
  }
});


