declare module "midtrans-client" {
  type SnapConfig = {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  };

  type SnapTransactionPayload = {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    item_details?: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    customer_details?: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    custom_field1?: string;
    custom_field2?: string;
    custom_field3?: string;
  };

  class Snap {
    constructor(config: SnapConfig);
    createTransaction(payload: SnapTransactionPayload): Promise<{
      token: string;
      redirect_url: string;
    }>;
  }

  const midtransClient: {
    Snap: typeof Snap;
  };

  export default midtransClient;
}
