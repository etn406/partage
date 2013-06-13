(function()
{
  var ragefaces = [
    'areyoufuckingkiddingofme ayfkom',
    'awyeah',
    'bitchplease bp',
    'challengeaccepted ca',
    'genius',
    'foreveralone fv',
    'fuu',
    'fuuu',
    'impossibru',
    'likeaboss lab',
    'megusta mg',
    'no',
    'notbad nb',
    'ohstopityou osiy',
    'ok:(',
    'pcht pfcht',
    'trollface troll tf',
    'youdontsay yds',
    'yuno',
    'wtf'
  ];
  
  var socket = io.connect('/'),
      nickname = null,
      color = null,
      maxScrollTop = 0,
      focus = true;
  
  // Connexion
  socket.on('connect', function (data)
  {
    if (typeof localStorage.nickname !== 'undefined') {
      socket.emit('change nickname', {nickname: localStorage.nickname});
    }
    
    if (typeof localStorage.color !== 'undefined') {
      socket.emit('change color', {color: localStorage.color});
    }
    
    $('#send-message *').removeAttr('disabled')
    $('#send-message input[type="text"]').focus()
  });
  
  // Déconnexion
  socket.on('disconnect', function (data) {
    addMessage('Vous êtes déconnecté(e).', 'error');
    $('#send-message > *').attr('disabled', 'disabled')
  });
  
  // Nouvel utilisateur
  socket.on('user connected', function (data) {
    if (nickname !== data.nickname)
      addMessage('<strong>' + escape(data.nickname) + '</strong> vient de se connecter.', 'info');
  });
  
  // Nouvel utilisateur
  socket.on('user disconnected', function (data) {
    addMessage('<strong>' + escape(data.nickname) + '</strong> vient de se déconnecter.', 'info');
  });
  
  // Première réception des données
  socket.on('welcome', function (data) {
    nickname = data.nickname;
    
    var s = (data.users > 2) ? 's' : '',
        msg = "Bienvenue !<br />Votre pseudo est <strong>" + nickname + "</strong>";
    
    if (data.users > 1)
      msg += ", il y a " + (data.users - 1) + " autre" + s + " utilisateur" + s + " connecté" + s + ".<br />";
    else
      msg += ", et vous êtes la seule personne connectée.<br />";
    
    msg += "Entrez <code>/aide</code> pour d'avantage d'informations (comment changer de pseudo, etc).";
    
    addMessage(msg, 'info')
  });
  
  // Réception d'un message
  socket.on('message', function (data)
  {
    var msg = escape(data.message) + ' ';
    
    // Remplacement des rage faces
    for (var i in ragefaces)
    {
      var aliases = ragefaces[i].split(' ');
      for (var j in aliases)
        msg = msg.replace(new RegExp('\\$' + aliases[j].replace('(', '\\(').replace(')', '\\)') + '( |,|\\.|!|\\?|;|:)', 'i'), "<img src='/images/ragefaces/" + aliases[0] + ".png' alt='" + aliases[0] + "'/>$1");
    }
    
    // Remplacement des phrases en italique/gras/souligné
    msg = msg.replace(/__(.+)__/, '<em>$1</em>')
    msg = msg.replace(/_(.+)_/, '<i>$1</i>')
    msg = msg.replace(/\*(.+)\*/, '<b>$1</b>')
    
    if (data.type == 'normal')
    {
      console.log(data)
      var source = "<div class='left-content' style='background-color:" + hsla(data.color, 80, 50, 0.4) + "'><span class='nickname'>" + escape(data.nickname) + "</span></div>";
      addMessage('<p>' + msg + '</p>', 'message', source)
    }
    else if (data.type == 'me')
      addMessage(escape(data.nickname) + " " + msg, 'user-info')
  });
  
  // Le pseudonyme a été changé
  socket.on('your nickname changed', function (data) {
    nickname = data.nickname
    localStorage.nickname = nickname;
  });
  
  // la couleur a été changée
  socket.on('your color changed', function (data) {
    color = data.color;
    localStorage.color = color;
    $('#send-message [type="submit"]').attr('style', 'background-color:' + hsla(color, 60, 50, 1))
  });
  
  // Quelqu'un a changé de pseudonyme
  socket.on('nickname changed', function (data) {
    if (nickname !== data.newNick)
      addMessage("<strong>" + escape(data.prevNick) + "</strong> a changé son pseudo en <strong>" + escape(data.newNick) + "</strong>", 'info')
    else
      addMessage("Votre pseudo est maintenant <strong>" + escape(data.newNick) + "</strong>.", 'info')
  });
  
  // Quelqu'un a déjà pris ce pseudonyme
  socket.on('error nickname already exists', function (data) {
    addMessage("Quelqu'un a déjà pris le pseudonyme <strong>" + data.nickname + "</strong>. Entrez la commande <code>/tuer " + escape(data.nickname) + "</code> pour tuer " + escape(data.nickname) + " et ainsi pouvoir prendre son pseudo.", 'error')
  });
  
  // Liste des utilisateurs connectés
  socket.on('user list', function (data)
  {
    var str = "";
    for (var i in data.users)
      str += "<strong class='nickname' style='background-color:" + hsla(data.users[i].color, 80, 50, 0.4) + "'>" + escape(data.users[i].nickname) + "</strong> ";
    
    var nbUsers = data.users.length;
    
    addMessage("Il y a " + nbUsers + " utilisateur" + (nbUsers > 1 ? 's' : '') + " connecté" + (nbUsers > 1 ? 's' : '') + " :<br />" + str, 'info')
  });
  
  // Envoyer un message
  $('#send-message').submit(function(evt)
  {
    evt.preventDefault();
    var $input = $('#send-message input[type="text"]'),
        msg = $input.val();
    
    if (msg[0] == '/')
    {
      var params = [];
      
      if (params = msg.match(/^\/aide$/i))
      {
        var aide = "<strong>Liste des commandes :</strong><br />Remplacer les mots en italique par les valeurs souhaitées.<ul>";
        aide += "<li><code>/aide</code> : Afficher cette aide.</li>"
        aide += "<li><code>/pseudo</code> : Pour vous rappeler votre pseudonyme.</li>"
        aide += "<li><code>/pseudo <i>nouveauPseudo</i></code> : Changer de pseudonyme. Celui-ci doit posséder entre 2 et 20 caractères.</li>"
        aide += "<li><code>/couleur <i>nouvelleCouleur</i></code> : Changer votre couleur. "
        aide += "<i>nouvelleCouleur</i> est l'angle d'une couleur sur le cercle chromatique (0 = rouge, 60 = jaune, 120 = vert, 210 = bleu, 285 = violet, <a href='/images/cercle-chromatique.png'>voir le cercle complet</a>).</li>"
        aide += "<li><code>/liste</code> : Renvoie la liste des personnes présentes sur le chat.</li>"
        aide += "<li><code>/moi <i>message</i></code> : Envoyer un message d'information à tout le monde à propos de vous.</li>"
        aide += "</ul><strong>Mettre en forme du texte : </strong> _italique_, __souligné__, *gras*<br />"
        aide += "<strong>Liste des rage faces disponibles :</strong><br /><i>"
        for (var i in ragefaces)
          aide += (i>0?', ':'') + '<code>' + ragefaces[i] + '</code>';
        aide += "</i><br />Entrer le nom de la rage face (ou l'un de ses alias) précédé d'un $ dans un message pour l'afficher. Par exemple <code>$megusta</code> et <code>$mg</code> sont équivalents.<br />"
        
        addMessage(aide, 'info')
      }
      else if (params = msg.match(/^\/pseudo$/i)) {
        addMessage("Votre pseudonyme est <strong>" + nickname + "</strong>", 'info')
      }
      else if (params = msg.match(/^\/pseudo (.+)$/i)) {
        socket.emit('change nickname', {nickname: params[1]});
      }
      else if (params = msg.match(/^\/couleur ([0-9]{1,3}|gris)$/i)) {
        socket.emit('change color', {color: params[1]});
      }
      else if (params = msg.match(/^\/liste$/i)) {
        socket.emit('get user list');
      }
      else if (params = msg.match(/^\/tuer (.+)$/i)) {
        socket.emit('message', {type: 'me', message: " veut tuer " + params[1] + " pour prendre son pseudo. Rien que pour ça."});
      }
      else if (params = msg.match(/^\/moi (.+)$/i)) {
        socket.emit('message', {type: 'me', message: params[1]});
      }
      else
        addMessage("Echec de l'analyse de la commande : <code>" + msg + '</code>', 'error')
    }
    else {
      socket.emit('message', {message: msg});
    }
    
    $input.val('').focus();
  });
  
  // Ajouter un message
  var lastSource = null;
  function addMessage(html, classes, source)
  {
    var messages = document.getElementById('messages');
    
    if (typeof source !== 'undefined' && source !== null)
    {
      if (source === lastSource)
        $(messages).children(':last-child').append(html);
      else
        $(messages).append($('<li />').addClass(classes || '').html(html).prepend(source));
    }
    else
      $(messages).append($('<li />').addClass(classes || '').html(html));
    
    lastSource = source;
    
    // Alerte dans le titre
    if (!focus) {
      newMessagesCounter++;
      startTitleAlert();
    }
    
    // Garder le scroll en bas
    if (messages.scrollTop >= maxScrollTop)
    {
      messages.scrollTop = messages.scrollHeight;
      maxScrollTop = messages.scrollTop;
    
      setTimeout(function() {
        messages.scrollTop = messages.scrollHeight;
      }, 10)
      setTimeout(function() {
        messages.scrollTop = messages.scrollHeight;
      }, 100)
    }
  }
  
  // La fenêtre gagne le focus
  $(window).focus(function() {
    focus = true;
    stopTitleAlert();
  });
  
  // La fenêtre gagne le focus
  $(window).blur(function() {
    focus = false;
  });
  
  // Fonction de toggle du titre de la fenêtre pour signaler les nouveaux messages
  var titleAlertFunc,
      titleAlert = false,
      initialTitle = $('title').text(),
      newMessagesCounter = 0;
  
  function titleAlertToggle()
  {
    if (titleAlert)
      $('title').text(initialTitle)
    else
      $('title').text(newMessagesCounter + " nouveau" + (newMessagesCounter>1?'x':'') + " message" + (newMessagesCounter>1?'s':''));
    
    titleAlert = ! titleAlert;
  }
  
  function startTitleAlert()
  {
    clearInterval(titleAlertFunc);
    titleAlertFunc = setInterval(titleAlertToggle, 800);
    titleAlert = false;
    titleAlertToggle();
  }
  
  function stopTitleAlert()
  {
    clearInterval(titleAlertFunc);
    titleAlert = true;
    titleAlertToggle();
    newMessagesCounter = 0;
  }
  
  // Échapper les caractères d'une chaîne
  function escape(text) {
    return $('<span/>').text(text).html()
  }
  
  // Convertir un angle 0-360 en couleur HTML
  function hsla(h, s, l, a) {
    if (typeof h === 'undefined' || h === null) s = 0;
    return "hsla(" + (h||1) + ", " + (s||1) + "%, " + (l||1) + "%, " + (a||1) + ")";
  }
})();
