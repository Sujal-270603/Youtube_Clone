// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from './db/index.js'

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

dotenv.config({
    path: './env'
})

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("ERRR: ", error);
        throw error;
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
    
.catch((err) => {
    console.log("MONGO DB connection failed !!! ", err);
})


//routes import
import userRouter from './routes/user_routes.js'

// //routes declaration
app.use('/api/v1/users', userRouter);


// import express from "express";
// const app = express();

// (async() => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error", (error) => {
//             console.log("Error: ", error);
//             throw error;
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}
//             }`)
//         })
//     }
//     catch (error) {
//         console.log("Error: ", error)
//         throw err
//     }
// })()

