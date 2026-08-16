require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const sosRoutes = require('./routes/sos');
const userRoutes = require('./routes/user');
const nearbyRoutes = require('./routes/nearby');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

connectDB();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.set('io', io);

app.use('/api/sos', sosRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nearby', nearbyRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-sos', (sosId) => {
    socket.join(sosId);
  });

  socket.on('location-update', (data) => {
    if (data && data.sosId) {
      io.to(data.sosId).emit('location-broadcast', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
