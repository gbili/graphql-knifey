import { LoadDict } from "di-why/build/src/DiContainer";
import app from "../../loaders/app";
import httpDrainApolloPlugin from "../../loaders/httpDrainApolloPlugin";
import httpServer from "../../loaders/httpServer";

export const apolloDepsDict: LoadDict = {
  app,
  httpServer,
  httpDrainApolloPlugin,
};