import { env } from './env.js';

export const paymentConfig = {
  provider: 'WAAFIPAY',
  environment: env.waafiEnv,
  paymentMethod: env.waafiPaymentMethod,
  serviceName: 'API_PURCHASE',
  currency: env.waafiCurrency,
  merchantName: env.waafiMerchantDisplayName,
  merchantPhone: env.waafiMerchantPhone,
  minimumAmount: env.waafiMinimumAmount,
  maximumAmount: env.waafiMaximumAmount,
  timeoutMs: env.waafiRequestTimeoutMs,
  endpoint: env.waafiEnv === 'production' ? env.waafiProductionUrl : env.waafiSandboxUrl,
  credentials: {
    merchantUid: env.waafiMerchantUid,
    apiUserId: env.waafiApiUserId,
    apiKey: env.waafiApiKey
  }
};
