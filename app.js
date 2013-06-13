/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(__dirname + '/public'));
});

// Configuration en développement
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Environnement en production
app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.get('/file-list', routes.getFileList);
app.post('/upload-file', routes.uploadFile);
app.get('/file/:id/:name', routes.getFile);

// Chat
io.sockets.on('connection', function (socket)
{
  // Création d'un pseudo
  var i = 0, nick;
  do { nick = 'Anonyme ' + (++ i); }
  while (nicknameExists(nick));
  socket.nickname = nick;
  
  // Couleur grise
  socket.color = null;
  
  // Envoi du message de bienvenue
  socket.emit('welcome', { nickname: socket.nickname, users: io.sockets.clients().length });
  io.sockets.emit('user connected', { nickname: socket.nickname });
  
  
  // Propager un message
  socket.on('message', function (data)
  {
    if (typeof data.message === 'string' && data.message.length >= 1)
      io.sockets.emit('message', { type: data.type || 'normal', nickname: socket.nickname, color: socket.color, message: data.message.substr(0, 512).trim() });
  });
  
  // Envoyer la liste des utilisateurs
  function sendUserlist()
  {
    var sockets = io.sockets.clients(), users = [];
    for (var i in sockets)
      users.push({nickname: sockets[i].nickname, color: sockets[i].color});
    socket.emit('user list', { users: users });
  }
  
  // Envoyer la liste des utilisateur si elle est demandée
  socket.on('get user list', sendUserlist);
  
  // Changer de pseudo
  socket.on('change nickname', function (data)
  {
    var prevNick = socket.nickname;
    
    if (typeof data.nickname === 'string' && data.nickname.length > 1 && ! nicknameExists(data.nickname))
    {
      socket.nickname = data.nickname.substr(0, 20).trim();
      socket.emit('your nickname changed', { nickname: socket.nickname });
      io.sockets.emit('nickname changed', { newNick: socket.nickname, prevNick: prevNick });
    }
    else if (nicknameExists(data.nickname))
      socket.emit('error nickname already exists', { nickname: data.nickname })
  });
  
  // Changer de couleur
  socket.on('change color', function (data)
  {
    if (parseInt(data.color) !== NaN)
    {
      socket.color = Math.floor(data.color % 360);
      socket.emit('your color changed', { color: socket.color });
    }
  });
  
  // Changer de pseudo
  socket.on('disconnect', function()
  {
    io.sockets.emit('user disconnected', { nickname: socket.nickname });
  });
});

// Vérifier si un pseudo existe
function nicknameExists(nick)
{
  var clients = io.sockets.clients();
  for (var client in clients)
    if (clients[client].nickname == nick)
      return true;
  return false;
}

// Lancement du serveur
app.listen(8080, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
