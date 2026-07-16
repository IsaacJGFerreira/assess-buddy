import { getDataConnect, type DataConnect } from "firebase/data-connect";
import { firebaseApp } from "./client";

// TODO: quando o SDK for gerado em `src/generated/dataconnect` via
// `firebase dataconnect:sdk:generate`, importar o `connectorConfig` de lá
// e passar para `getDataConnect` no lugar deste objeto literal.
const connectorConfig = {
  location: import.meta.env.VITE_DATA_CONNECT_LOCATION ?? "southamerica-east1",
  service: import.meta.env.VITE_DATA_CONNECT_SERVICE_ID ?? "assess-buddy",
  connector: import.meta.env.VITE_DATA_CONNECT_CONNECTOR_ID ?? "app",
};

export const dataConnect: DataConnect = getDataConnect(firebaseApp, connectorConfig);