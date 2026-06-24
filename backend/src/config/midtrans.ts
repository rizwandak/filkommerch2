/// <reference path="../types/midtrans-client.d.ts" />
import midtransClient from "midtrans-client";
import { config } from "./config";

export const snap = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey,
});
