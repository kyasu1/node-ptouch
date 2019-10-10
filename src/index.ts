import {Brother, PrintConfig} from "./brother";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {LabelType, RollType, Paper} from "./paper";

const brother = Brother.getInstance('http://192.168.1.119:631/ipp/print');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(bodyParser.json({limit: "50mb", extended: true}));

app.use(express.static("public"));

app.post("/v2/get-job-attribute", async function (req, res) {
  try {
    const userName = req.body.userName;
    const jobId = req.body.jobId;

    if (!userName && !jobId) {
      throw Error('userName and jobId must be supplied');
    } else {
      const attributes = await brother.getJobAttributes(userName, jobId);
      res.status(200).json(attributes);
    }
  } catch (e) {
    res.status(404).json(e);
  }
});

app.post("/v2/print", async function (
  req: express.Request,
  res: express.Response
) {
  console.log("request received");

  try {
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
          throw Error("SPECIFIED PAPER SIZE IS INVALID");
        }
      } else {
        throw Error("PROPER PAPER SIZE MUST BE SPECIFIED WITH REQUEST");
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
          throw Error("SPECIFIED PAPER SIZE IS INVALID");
        }
      } else {
        throw Error("PROPER PAPER SIZE MUST BE SPECIFIED WITH REQUEST");
      }
    } else {
      throw Error("INVALID PAPER");
    }

    const base64images: string[] = req.body.data.pngs;

    if (!base64images || base64images.length <= 0) {
      throw Error("Invalid Paramters");
    }

    const userName = req.body.userName || 'anonymous';

    const config: PrintConfig = {
      hires: req.body.config.hires || false,
      biColor: req.body.config.biColor || false,
      autoCutBy: req.body.config.autoCutBy || 1,
      autoCut: req.body.config.autoCut || false,
      cutAtEnd: req.body.config.cutAtEnd || true,
    }

    const jobId = await brother.print(base64images, paper, config, userName);

    res.status(200).json({
      jobId
    });
  } catch (e) {
    console.log(`ERROR at Index catch : ${e} `);
    res.status(404).json({
      error: e,
    });
  }
});

app.listen(5000, "0.0.0.0", () =>
  console.log("Node P-Touch Printing Server listening on port 5000!")
);

