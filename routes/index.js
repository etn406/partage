var formidable = require('formidable')
  , fs = require('fs')

var fileList = []
  , fileListPath = './file-list.json'
  , filesBasePath = './files'
  , maxFileSize = Math.pow(2, 30) * 1

/**
 * Lecture de la liste des fichiers.
 * Les fichiers inexistant sont supprimés de la liste.
 */
function updateFileList()
{
  if (!fs.existsSync(fileListPath))
    fs.writeFile(fileListPath, JSON.stringify([]));
  
  if (!fs.existsSync(filesBasePath))
    fs.mkdirSync(filesBasePath);
  
  fs.readFile(fileListPath, function (err, data)
  {
    fileList = [];
    var precFileList = [];
    
    if (!err)
    {
      precFileList = JSON.parse(data);
      
      for (var i in precFileList)
      {
        if (precFileList[i])
        {
          if (fs.existsSync(filesBasePath + '/' + precFileList[i].id))
          {
            console.log("Fichier existant : " + precFileList[i].name + " (" + precFileList[i].id + ")");
            fileList.push(precFileList[i]);
          }
          else
            console.log("Fichier supprimé : " + precFileList[i].name + " (" + precFileList[i].id + ")");
        }
      }
    }
    
    fs.writeFileSync(fileListPath, JSON.stringify(fileList))
  });
}

// Lance la mise à jour de la liste lors du démarrage du serveur
updateFileList();

// GET : Page d'accueil
exports.index = function(req, res) {
  res.render('index');
};

// GET : Liste des fichiers
exports.getFileList = function(req, res)
{
  updateFileList();
  console.log(fileList)
  res.render('file-list', {fileList: fileList})
};

// GET : Liste des fichiers
exports.getFile = function(req, res)
{
  for (var i in fileList)
  {
    if (req.params.id === fileList[i].id)
    {
      res.sendfile(fs.realpathSync(filesBasePath + '/' + fileList[i].id));
      return;
    }
  }
};

/**
 * [POST] Envoi d'un nouveau fichier sur le serveur.
 */
exports.uploadFile = function(req, res)
{
  var form = new formidable.IncomingForm();
  form.uploadDir = filesBasePath;
  form.encoding = 'binary';
  
  // Début de l'envoi d'un fichier
  form.on('fileBegin', function(name, file)
  {
    console.log("Début de la réception d'un fichier.");
  });
  
  // Vérifier la taille lors de l'envoi
  form.on('progress', function(bytesReceived, bytesExpected)
  {
    if (bytesExpected > maxFileSize)
    {
      console.log("Fichier trop lourd, le téléchargement est annulé.");
      req.connection.destroy();
    }
  });
  
  // Fin de l'envoi du fichier
  form.on('file', function(name, file)
  {
    var fileInfos = {
      name: file.name.replace('/', '').replace('\\', '').replace('"', '').replace('<', '&lt;'),
      urlname: encodeURIComponent(file.name),
      size: file.size,
      type: file.type,
      id: file.path.substr(file.path.search(/\/[0-9a-z]+$/i) + 1)
    }
    
    // Création d'une taille de fichier lisible
    if (file.size < Math.pow(2, 10))
      fileInfos.readableSize = file.size + ' octets';
    else if (file.size < Math.pow(2, 20))
      fileInfos.readableSize = Math.round(file.size / Math.pow(2, 10)) + ' Kio';
    else if (file.size < Math.pow(2, 30))
      fileInfos.readableSize = Math.round(file.size / Math.pow(2, 20) * 10) / 10 + ' Mio';
    else if (file.size < Math.pow(2, 40))
      fileInfos.readableSize = Math.round(file.size / Math.pow(2, 30) * 10) / 10 + ' Gio';
    else
      fileInfos.readableSize = 'taille inconnue'
    
    fileList.splice(0, 0, fileInfos);
    console.log("Fichier ajouté : ", fileInfos);
  });

  form.on('abort', function() {
    console.log("Envoi d'un fichier annulé.");
  });

  form.on('end', function() {
    fs.writeFileSync(fileListPath, JSON.stringify(fileList));
    res.send("Envoi effectué");
    res.status(200);
    res.end();
  });

  form.parse(req, function(err, fields, files) {
    if (err) {
      console.log(err);
    }
  });
};
