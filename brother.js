import ipp from 'ipp';

const Brother = (url, username = 'User') => {
  const _printer = ipp.Printer(url);
  const _username = username;

  const execute = (job, msg) => {
    return new Promise((resolve, reject) => {
      _printer.execute(job, msg, (err, res) => {
        if (err) {
          reject(err);
        }
        log(res, job.toUpperCase());
        resolve(res);
      });
    });
  };

  const log = (res, text) => {
    console.log(`==================== ${text} ====================`);
    console.log(JSON.stringify(res, null, 2));
  };

  const getJobs = () => {
    return execute('Get-Jobs', null);
  };
 
  const createJob = () => {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': _username,
        'job-name': 'Riage Label',
      }
    };
    return execute('Create-Job', msg);
  };

  const sendDocument = (jobId, data, isLast) => {
    const msg = {
      'operation-attributes-tag': {
        'job-id': jobId,
        'requesting-user-name': _username,
        'document-format': 'application/octet-stream',
        'last-document': isLast,
        'compression': 'none',
      },
    }
    if (data !== null) {
      msg.data = data;
    }
    return execute('Send-Document', msg);
  };
  const sendDocumentLast = (jobId) => {
    const msg = {
      'operation-attributes-tag': {
        'job-id': jobId,
        'requesting-user-name': _username,
        'document-format': 'application/octet-stream',
        'last-document': true,
        'compression': 'none',
      },
    }
    return execute('Send-Document', msg);
  };
   // not supported on the QL-720NW ...
  const closeJob = (id) => {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': _username,
        'job-id': id,
      }
    };
    return execute('Close-Job', msg);
  }

  const validateJob = () => {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': _username,
        'document-format': 'application/octet-stream',
      }
    };
    return execute('Validate-Job', msg);
   }

  const getPrinterAttributes = () => {
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': _username,
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
    return execute('Get-Printer-Attributes', msg);
  };

  const getJobAttributes = (id) => {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": _username,
        'job-id': id,
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
    return execute('Get-Job-Attributes', msg);
  };

  const cancelJob = (id) => {
    const msg = {
      'operation-attributes-tag': {
        "requesting-user-name": _username,
        'job-id': id,
      }
    }
    return execute('Cancel-Job', msg);
  };

  const printJob = (data) => {
    const msg = {
      "operation-attributes-tag": {
        "requesting-user-name": _username,
        "document-format": "application/octet-stream",
      },
      data: data
    };
    return execute('Print-Job', msg);
  };

  const print = async (data) => {
    try {
      
      const prevId = 369;
      await validateJob();
      await getJobs()
      await getPrinterAttributes();
      await getJobAttributes(prevId);
      await cancelJob(prevId);
      //      return;
      
      await getPrinterAttributes();
      const res = await createJob();
      const jobId = res['job-attributes-tag']['job-id'];
      await sendDocument(jobId, data, true);
      // await sendDocument(jobId, null, true);
      // await closeJob(jobId);
      /* polling till the printing state become completed */
      const id = setInterval(async () => {
        await getPrinterAttributes();
        const res = await getJobAttributes(jobId);
        if (res && res['job-attributes-tag']['job-state'] === 'completed') {
          clearInterval(id);
        }
      }, 1000);
    } catch (error) {
      console.log('==================== ERROR ===================='); 
      console.log(error);
    }
  }

  const print2 = async (data) => {
    try {
      const res = await printJob(data);
      const id = res['job-attributes-tag']['job-id'];
  
      const iid = setInterval(async () => {
        const tmp = await getPrinterAttributes();
        const res = await brother.getJobAttributes(id);

        if (tmp['printer-attributes-tag']['printer-state'] === 'idle') {
          cancelJob(id);
          clearInterval(iid);
          console.log('DONE!');
        }
      }, 1000);
    } catch (err) {
      console.log('ERROR:', err);
    }
  }

  return {
    cancelJob,
    getJobs,
    print,
    print2
  }
}

export default Brother;

