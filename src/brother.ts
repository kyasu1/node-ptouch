import ipp from 'ipp';

export class Brother {
  _printer;
  _username: string;

  constructor(url: string, username: string = 'User') {
    this._printer = ipp.Printer(url);
    this._username = username;
  }

  execute(job: string, msg) {
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

  public getJobs() {
    return this.execute('Get-Jobs', null);
  };
 
  createJob() {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': this._username,
        'job-name': 'Riage Label',
      }
    };
    return this.execute('Create-Job', msg);
  };

  sendDocument(jobId, data, isLast) {
    if (data) {
      let msg = {
        'operation-attributes-tag': {
          'job-id': jobId,
          'requesting-user-name': this._username,
          'document-format': 'application/octet-stream',
          'last-document': isLast,
          'compression': 'none',
        },
        data: data,
      }
      return this.execute('Send-Document', msg);
      } else {
      return new Promise((resolve, reject) => {
        reject('no print data supplied');
        })
    }
  };

  sendDocumentLast(jobId) {
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
   // not supported on the QL-720NW ...
  closeJob(id: string) {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': this._username,
        'job-id': id,
      }
    };
    this.execute('Close-Job', msg);
  }

  validateJob() {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': this._username,
        'document-format': 'application/octet-stream',
      }
    };
    return this.execute('Validate-Job', msg);
   }

  getPrinterAttributes() {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': this._username,
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

  getJobAttributes = jobId => {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": this._username,
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

  public cancelJob(id) {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": this._username,
        'job-id': id,
      }
    }
    return this.execute('Cancel-Job', msg);
  };

  printJob(data) {
    const msg = {
      "operation-attributes-tag": {
        "requesting-user-name": this._username,
        "document-format": "application/octet-stream",
      },
      data: data
    };
    return this.execute('Print-Job', msg);
  };

  public async print(data) {
    try {
      await this.getPrinterAttributes();
      const res = await this.createJob();
      const jobId = res['job-attributes-tag']['job-id'];
      // DEBUG
      this.log(await this.getJobAttributes(jobId), "DEBUG CHECK JOB ATTR");

      await this.sendDocument(jobId, data, true);

      // DEBUG
      this.log(await this.getJobAttributes(jobId), "DEBUG CHECK JOB ATTR");

      return jobId;
      /* polling till the printing state become completed */
      /*
      const id = setInterval(async () => {
        await this.getPrinterAttributes();
        const res = await this.getJobAttributes(jobId);
        if (res && res['job-attributes-tag']['job-state'] === 'completed') {
          clearInterval(id);
        }
      }, 1000);
       */
    } catch (error) {
      console.log('==================== ERROR ===================='); 
      console.log(error);
    }
  }


  public async print_working_old(data) {
    try {
      
      const prevId = 369;
      await this.validateJob();
      await this.getJobs()
      await this.getPrinterAttributes();
      await this.getJobAttributes(prevId);
      await this.cancelJob(prevId);
      //      return;
      
      await this.getPrinterAttributes();
      const res = await this.createJob();
      const jobId = res['job-attributes-tag']['job-id'];
      await this.sendDocument(jobId, data, true);
      // await sendDocument(jobId, null, true);
      // await closeJob(jobId);
      /* polling till the printing state become completed */
      const id = setInterval(async () => {
        await this.getPrinterAttributes();
        const res = await this.getJobAttributes(jobId);
        if (res && res['job-attributes-tag']['job-state'] === 'completed') {
          clearInterval(id);
        }
      }, 1000);
    } catch (error) {
      console.log('==================== ERROR ===================='); 
      console.log(error);
    }
  }

  public async print2(data) {
    try {
      const res = await this.printJob(data);
      const id = res['job-attributes-tag']['job-id'];
  
      const iid = setInterval(async () => {
        const tmp = await this.getPrinterAttributes();
        const res = await this.getJobAttributes(id);

        if (tmp['printer-attributes-tag']['printer-state'] === 'idle') {
          this.cancelJob(id);
          clearInterval(iid);
          console.log('DONE!');
        }
      }, 1000);
    } catch (err) {
      console.log('ERROR:', err);
    }
  }
}


