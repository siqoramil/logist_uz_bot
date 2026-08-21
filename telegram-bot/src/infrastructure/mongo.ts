import mongoose from "mongoose";

export const connectMongo = async (uri: string): Promise<void> => {
  await mongoose.connect(uri);
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
