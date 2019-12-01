import {Brother, PrintConfig} from "./brother";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {LabelType, RollType, Paper} from "./paper";
import {handleError} from './error';
import boom from '@hapi/boom';

const P_TOUCH_PRINTER = process.env.P_TOUCH_PRINTER || 'http://192.168.1.119:631/ipp/print';
const brother = Brother.getInstance(P_TOUCH_PRINTER);

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(bodyParser.json({limit: "50mb"}));
app.use(express.static("public"));

app.post("/v2/get-job-attribute", async function (req, res) {
  try {
    const userName = req.body.userName;
    const jobId = req.body.jobId;

    if (!userName && !jobId) {
      throw boom.badData('userName and jobId must be supplied');
    } else {
      const attributes = await brother.getJobAttributes(userName, jobId);
      res.status(200).json(attributes);
    }
  } catch (e) {
    res.status(404).json(e);
  }
});

app.post("/v2/print", function (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  console.log("request received");

  let paper: Paper;

  if (req.body.paper.kind === "label") {
    if (req.body.paper.width && req.body.paper.height) {
      const type = LabelType.fromSize(req.body.paper.width, req.body.paper.height);
      if (type !== null) {
        paper = {
          kind: "label",
          type: type
        };
      } else {
        throw boom.badData("SPECIFIED PAPER SIZE IS INVALID");
      }
    } else {
      throw boom.badData("PROPER PAPER SIZE MUST BE SPECIFIED WITH REQUEST");
    }
  } else if (req.body.kind === "roll") {
    if (req.body.paper.width && req.body.paper.length) {
      const type = RollType.fromSize(req.body.paper.width);
      if (type !== null) {
        paper = {
          kind: "roll",
          type: type,
          length: req.body.paper.length
        };
      } else {
        throw boom.badData("SPECIFIED PAPER SIZE IS INVALID");
      }
    } else {
      throw boom.badData("PROPER PAPER SIZE MUST BE SPECIFIED WITH REQUEST");
    }
  } else {
    throw boom.badData("INVALID PAPER");
  }

  const base64images: string[] = req.body.data.pngs;

  if (!base64images || base64images.length <= 0) {
    throw boom.badData("NO IMAGE DATA FOUND");
  }

  const userName = req.body.userName || 'anonymous';

  const config: PrintConfig = {
    hires: req.body.config.hires || false,
    biColor: req.body.config.biColor || false,
    autoCutBy: req.body.config.autoCutBy || 1,
    autoCut: req.body.config.autoCut || false,
    cutAtEnd: req.body.config.cutAtEnd || true,
  };
  
  (async () => {
    const jobId = await brother.print(base64images, paper, config, userName)
      .catch((err: Error) => {
        console.log('CAUGHT AT INDEX: ', err);
        throw boom.badImplementation(err.message);
      });

    res.status(200).json({
      jobId
    });
  })().catch((err) => {
    next(boom.badImplementation(err.message));
  });
   
});

app.use(function logErrors(err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) {
  console.error('ERROR LOGGER: ', err);
  return next(err);
});

app.use(handleError);

app.listen(5000, "0.0.0.0", () =>
  console.log("Node P-Touch Printing Server listening on port 5000!")
);


