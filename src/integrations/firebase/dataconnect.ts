import {
  getDataConnect,
  type DataConnect,
} from "firebase/data-connect";
import { connectorConfig } from "@assess-buddy/dataconnect";

import { getFirebaseApp } from "./client";

export function getFirebaseDataConnect(): DataConnect {
  // Garante que o aplicativo Firebase padrão foi inicializado.
  getFirebaseApp();

  return getDataConnect(connectorConfig);
}
