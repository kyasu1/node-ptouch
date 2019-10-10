import ipp, {Printer} from 'ipp';
import {rasterize} from './raster';
import {Paper} from './paper';

export class Brother {
  private static instance: Brother;

  _printer: Printer;

  private constructor(uri: string) {
    this._printer = ipp.Printer(uri);
  }

  static getInstance(uri: string) {
    if (!Brother.instance) {
      Brother.instance = new Brother(uri);
    }
    return Brother.instance;
  }

  execute(job: string, msg: object) {
    return new Promise((resolve, reject) => {
      this._printer.execute(job, msg, (err, res) => {
        if (err) {
          reject(err);
        }
        this.log(res, job.toUpperCase());
        resolve(res);
      });
    });
  };

  log(res, text: string) {
    console.log(`==================== ${text} ====================`);
    console.log(JSON.stringify(res, null, 2));
  };

  getJobs() {
    return this.execute('Get-Jobs', null);
  };

  createJob(userName: string) {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': userName,
        'job-name': 'Riage Label',
      }
    };
    return this.execute('Create-Job', msg);
  };

  sendDocument(userName: string, jobId: number, data: Buffer, isLast: boolean) {
    if (data) {
      let msg = {
        'operation-attributes-tag': {
          'job-id': jobId,
          'requesting-user-name': userName,
          'document-format': 'application/octet-stream',
          'last-document': isLast,
          'compression': 'none',
        },
        data: data,
      }
      return this.execute('Send-Document', msg);
    } else {
      throw Error('no print data supplied');
    }
  };
  /* OBSOLETE
  sendDocumentLast(jobId: number) {
    const msg = {
      'operation-attributes-tag': {
        'job-id': jobId,
        'requesting-user-name': this._username,
        'document-format': 'application/octet-stream',
        'last-document': true,
        'compression': 'none',
      },
    }
    return this.execute('Send-Document', msg);
  };
   */
  // not supported on the QL-720NW ...
  closeJob(userName: string, id: string) {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': userName,
        'job-id': id,
      }
    };
    this.execute('Close-Job', msg);
  }

  validateJob(userName: string) {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': userName,
        'document-format': 'application/octet-stream',
      }
    };
    return this.execute('Validate-Job', msg);
  }

  getPrinterAttributes(userName: string) {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': userName,
        'requested-attributes': [
          'compression-supported',
          'job-impressions-supported',
          'operations-supported',
          'multiple-document-jobs-supported',
          'printer-is-accepting-jobs',
          'printer-state',
          'printer-state-message',
          'printer-state-reasons',
          'preferred-attributes-supported',
        ]
      }
    }
    return this.execute('Get-Printer-Attributes', msg);
  };

  getJobAttributes = (userName: string, jobId: number) => {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": userName,
        'job-id': jobId,
        'requested-attributes': [
          'job-id',
          'job-impressions-completed',
          'job-media-sheets-completed',
          'job-name',
          'job-originating-user-name',
          'job-state',
          'job-state-reasons'
        ]
      }
    };
    return this.execute('Get-Job-Attributes', msg);
  };

  cancelJob(userName: string, id: number) {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": userName,
        'job-id': id,
      }
    }
    return this.execute('Cancel-Job', msg);
  };

  printJob(userName: string, data: Buffer) {
    const msg = {
      "operation-attributes-tag": {
        "requesting-user-name": userName,
        "document-format": "application/octet-stream",
      },
      data: data
    };
    return this.execute('Print-Job', msg);
  };

  private printInstruction = (paper: Paper, hires: boolean, isFirst: boolean) => {
    const spec = Paper.spec(paper);

    const w = spec.w;
    const h = spec.h;
    const paperType: number = Paper.isLabel(paper) ? 0x0b : 0x0a;
    const first: number = isFirst ? 0x00 : 0x01;
    const ratio: number = 1 // hires ? 2 : 1;
    const dots = spec.dots;
    const n5 = (dots * ratio) % 256;
    const n6 = Math.trunc(dots * ratio / 256) % 256;
    const n7 = Math.trunc(dots * ratio / 256 / 256) % 256;
    const n8 = Math.trunc(dots * ratio / 256 / 256 / 256) % 256;

    return new Buffer([0x1b, 0x69, 0x7a, 0b10001110, paperType, w, h, n5, n6, n7, n8, first, 0x00]);
  }

  private setExtra = (cutAtEnd: boolean, hires: boolean) => {
    const flagCutAtEnd = cutAtEnd ? 0b00001000 : 0b00000000;
    const flagHires = hires ? 0b01000000 : 0b00000000;

    return new Buffer([0x1b, 0x69, 0x4b, flagCutAtEnd + flagHires]);
  }

  private ejectPages(buf: Buffer): Buffer {
    return Buffer.concat([buf, new Buffer([0x1a])]);
  }

  public async print(base64images: string[], paper: Paper, hires: boolean, userName: string): Promise<number> {
    const promises: Promise<number[]>[] = base64images.map(
      (base64image: string): Promise<number[]> => {
        return rasterize(base64image, paper, hires);
      }
    );

    const rasters: number[][] = await Promise.all(promises);

    let buf = Buffer.concat([
      new Buffer(200).fill(0),
      new Buffer([0x1b, 0x40]),
      new Buffer([0x1b, 0x69, 0x61, 0x01]),
      this.printInstruction(paper, hires, true),
      new Buffer([0x1b, 0x69, 0x4d, true ? 0b01000000 : 0b00000000]),
      new Buffer([0x1b, 0x69, 0x41, 0x01]),
      this.setExtra(true, hires),
      new Buffer([0x1b, 0x69, 0x64, 0x00, 0x00]),
      new Buffer([0x4d, 0x02]),
      new Buffer(rasters[0]),
    ]);

    rasters.shift();
    /*
    buf = rasters.map((raster) => {
      return new Buffer(raster);
    }).reduce((accu, current) => {
      return Buffer.concat([
        accu,
        new Buffer([0xc]),
        this.printInstruction(paper, hires, false),
        new Buffer([0x01, 0x00]), // ESC i z 印刷情報指令 P30
        new Buffer(current)
      ]);
    });
     */
    
    rasters.forEach((raster: number[]) => {
      buf = Buffer.concat([
        buf,
        new Buffer([0xc]),
        this.printInstruction(paper, hires, false),
        new Buffer([0x01, 0x00]), // ESC i z 印刷情報指令 P30
        new Buffer(raster)
      ]);
    });

    buf = this.ejectPages(buf);

    try {
      const attrs = await this.getPrinterAttributes(userName);
      const res = await this.createJob(userName);
      const jobId = res['job-attributes-tag']['job-id'];

      await this.sendDocument(userName, jobId, buf, true);

      return jobId;
    } catch (error) {
      console.log('==================== ERROR ====================');
      console.log(error);
      throw Error(error);
    }
  }
}


