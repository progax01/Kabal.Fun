import mongoose from "mongoose";
import envConfigs from "./envConfigs";

class dbConfig {
  static connectDb = () => {
    try {
      mongoose.connect(envConfigs.dbUrl).then((res) => {
        console.log(`Connected to db: ${res.connection.host}`);
      });
    } catch (err: any) {
      console.error(`Error while connecting to db: ${err.message}`);
    }
  };

  static disconnectDb = async () => {
    try {
      await mongoose.disconnect();
    } catch (err: any) {
      console.error(`Error while disconnecting to db: ${err.message}`);
    }
  };
}

export default dbConfig;
