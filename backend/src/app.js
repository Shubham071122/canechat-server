import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import {initSocket}  from './config/socket.js';

const app = express();

// Initialize HTTP server
const server = http.createServer(app);

//Initialize socket.io with HTTP server
const io = initSocket(server);

app.get("/",(req,res) =>{
  return res.send("Can'e Chat");
});
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods:["POST","GET","DELETE","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookies", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
    credentials: true,
}))

app.use(express.json({limit: "20kb"})) 
app.use(express.urlencoded({extended:true, limit:"20kb"})) 
app.use(cookieParser())


//router
import userRouter from "./routes/User.route.js";
import messageRouter from "./routes/Message.route.js";
import friendRouter from "./routes/Friend.route.js";

app.use("/api/v1/users",userRouter);
app.use("/api/v1/messages",messageRouter);
app.use("/api/v1/friend",friendRouter);


export{app};