import ipp, {Printer} from 'ipp';
import {rasterize} from './raster';
import {Paper} from './paper';
import fs from 'fs';

const SHOW_PRINT_LOG = false;

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
      this._printer.execute(job, msg, (err: Error, res: object) => {
        if (err) {
          reject(err);
        }
        this.log(res, job.toUpperCase());
        resolve(res);
      });
    });
  };

  log(res: object, text: string) {
    if (SHOW_PRINT_LOG) {
      console.log(`==================== ${text} ====================`);
      console.log(JSON.stringify(res, null, 2));
    }
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
      throw (new Error('no print data supplied'));
    }
  };

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

  printJob(userName: string, data: Uint8Array) {
    const msg = {
      "operation-attributes-tag": {
        "requesting-user-name": userName,
        "document-format": "application/octet-stream",
      },
      data: Buffer.from(data)
    };
    return this.execute('Print-Job', msg);
  };

  //
  //
  //
  //
  //
  //
  private printInstruction = (paper: Paper, hires: boolean, isFirst: boolean): number[] => {
    const spec = Paper.spec(paper);

    const w = spec.w;
    const h = spec.h;
    const paperType: number = Paper.isLabel(paper) ? 0x0b : 0x0a;
    const first: number = isFirst ? 0x00 : 0x01;
    const ratio: number = hires ? 2 : 1;
    const dots = spec.dots * ratio;
    const n5 = (dots * ratio) % 256;
    const n6 = Math.trunc(dots / 256) % 256;
    const n7 = Math.trunc(dots / 256 / 256) % 256;
    const n8 = Math.trunc(dots / 256 / 256 / 256) % 256;

    return [0x1b, 0x69, 0x7a, 0b10001110, paperType, w, h, n5, n6, n7, n8, first, 0x00];
  }

  private setExtra = (config: PrintConfig): number[] => {
    const cutAtEnd = config.cutAtEnd ? 0b00001000 : 0b00000000;
    const hires = config.hires ? 0b01000000 : 0b00000000;
    const biColor = config.biColor ? 0b00000001 : 0b00000000;

    return [0x1b, 0x69, 0x4b, cutAtEnd + hires + biColor];
  }

  private ejectPages(): number[] {
    return [0x1a];
  }

  async print(
    base64images: string[],
    paper: Paper,
    config: PrintConfig,
    userName: string
  ): Promise<number> {
    try {
      const attrs = await this.getPrinterAttributes(userName);
      const canonicalName = attrs['printer-attributes-tag']['media-ready'];

      if (Paper.spec(paper).canonicalName !== canonicalName) {
        return Promise.reject(new Error('IMCOMPATIBLE TAPE INSTALLED'));
      }
    } catch (err) {
      return Promise.reject(err);
    }

    const promises: Promise<number[]>[] = base64images.map(
      (base64image: string): Promise<number[]> => {
        return rasterize(base64image, paper, config.hires);
      }
    );

    const rasters: number[][] = await Promise.all(promises);

    let buf = [
      Array(200).fill(0),
      [0x1b, 0x40],
      [0x1b, 0x69, 0x61, 0x01],
      this.printInstruction(paper, config.hires, true),
      [0x1b, 0x69, 0x4d, config.autoCut ? 0b01000000 : 0b00000000],
      [0x1b, 0x69, 0x41, config.autoCutBy],
      this.setExtra(config),
      [0x1b, 0x69, 0x64, 0x00, 0x00],
      [0x4d, 0x02],
      rasters[0],
    ];

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
      Array.prototype.push(buf,
        [
          [0xc],
          this.printInstruction(paper, config.hires, false),
          [0x01, 0x00], // ESC i z 印刷情報指令 P30
          raster
        ]);
    });

    buf.push(this.ejectPages());

    const flattened = [].concat(...buf);

    try {
      const res = await this.createJob(userName);
      const jobId = res['job-attributes-tag']['job-id'];

      await this.sendDocument(userName, jobId, Buffer.from(flattened), true);

      return jobId;
    } catch (error) {
      throw error;
    }
  }
}

export type PrintConfig = {
  hires: boolean,
  biColor: boolean,
  autoCutBy: number,
  autoCut: boolean,
  cutAtEnd: boolean,
}
