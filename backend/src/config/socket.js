import {Server} from 'socket.io';
let io;

const users = {}; // This will store userId and socketId mappings

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET", "POST","DELETE","PATCH"],
        },
    });


    io.on('connection',(socket) => {
        console.log('User connected:', socket.id);

        //Store the user's id and socket id when they join
        socket.on('join', (userId) => {
            users[userId] = socket.id;
            console.log(`User ${userId} joined with socket ID: ${socket.id}`);
        });

        // Send message from sender to recipient
        socket.on('sendMessage', ({sender,recipient,message}) => {
            const recipientSocketId = users[recipient];
            if(recipientSocketId){
                io.to(recipientSocketId).emit('receiveMessage',{sender,message})// Emit message to recipient
            }
        });

        //Handle user disconnect
        socket.on('disconnect', () => {
            for(const userId in users){
                if(users[userId] === socket.id){
                    delete users[userId];// Remove the user from users mapping
                }
            }
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

export {initSocket,users, io};
