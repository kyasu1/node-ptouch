  
const RiageLabel2 = ({riage, rizumi, kigen}) => {

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
  }
  
  const init = [
    0x1b, 0x69, 0x61, 0x03, // ESC i a 03 : switch to P-touch template mode
    0x5e, 0x49, 0x49,  // ^ | | : initialize
    0x5e, 0x54, 0x53, 0x30, 0x30, 0x31, // ^ T S 00 00 01 : select tamplate no 1
   ];
  
  const print = [
    0x5e, 0x46, 0x46,
  ];
  
  const escp = new Buffer([
    0x1b, 0x69, 0x61, 0x00,
    0x1b, 0x40,
    0x1b, 0x69, 0x4c, 0x01,
    0x1b, 0x28, 0x43, 0x02, 0x00, 0x68, 0x04,
    0x1b, 0x24, 0x96, 0x00,
    0x1b, 0x28, 0x56, 0x00, 0x1a, 0x01,
    0x1b, 0x6b, 0x08,
    0x1b, 0x58, 0x00, 0x43, 0x00,
    0x41, 0x74, 0x20, 0x79, 0x6f, 0x75, 0x72, 0x20, 0x73, 0x69, 0x64, 0x65,
    0x0c,
  ]);
  
  const raster = new Buffer([
    0x1b, 0x40,
    0x1b, 0x69, 0x61, 0x01,
    0x1b, 0x69, 0x7a, 0x8e, 0x0a, 0x3e, 0x00, 0xd2, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1b, 0x69, 0x64, 0x00, 0x00,
    0x67, 0x00, 0x00,
    0x1a,
  ]);
  
  const esctemplate = new Buffer([].concat(
    init,
    selectField('t1'),
    setField(riage),
    selectField('t2'),
    setField(rizumi),
    selectField('t3'),
    setField(kigen),
    selectField('q'),
    setField(`取引日${riage} 利済日${rizumi} 次期限${kigen} tel://048-987-1020`),
    print,
    /*
    init,
    selectField('t1'),
    setField('H28/09/17'),
    selectField('t2'),
    setField('H28/08/03'),
    selectField('t3'),
    setField('H28/11/03'),
    selectField('q'),
    setField('取引日H28/09/17 H28/08/03 H28/11/03 tel://048-987-1020'),
    print,
    */
  ));

  const save = (filename) => {
    fs.writeFile(filename, esctemplate, (error) => {
      if (error) {
        console.log('===================== FILE SAVE ERROR ====================');
        console.log(error);
      }
    });
  }

  return {
    escp,
    raster,
    esctemplate,
    save,
  };
}


