import mongoose from "mongoose"
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connection.connection.host}`)
    } catch (error) {
        console.log("MONGODB connection error", error);
        process.exit
    }
}

export default connectDB;