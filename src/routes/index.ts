import { Router } from "express";
import { healthRouter } from "./health";
import { speakersRouter } from "./speakers";
import { seriesRouter } from "./series";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/speakers", speakersRouter);
apiRouter.use("/series", seriesRouter);