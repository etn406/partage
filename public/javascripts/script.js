(function()
{
  // Fixe le clic sur la sélection de dossier dans Firefox
  if($.browser.firefox)
  {
    $(document).on('click', 'label', function(evt) {
      if(evt.currentTarget === this && evt.target.nodeName !== 'INPUT') {
        $(this.control)[0].click();
      }
    });
  }
  
  
  var waitingList = [], wli = 0, uploadAborted = false;
  
  var filesUpload = document.getElementById("files-upload"),
      dropArea = document.getElementById("drop-area"),
      fileList = document.getElementById("file-list");
  
  /**
    * Ajouter un fichier à liste d'attente d'upload
    */
  
  function addToWaitingList(file)
  {
    if (typeof FileReader !== "undefined")
    {
      var fileId = ++ wli, readableSize = 0;
      waitingList[fileId] = file;
      
      if (file.size < Math.pow(2, 10))
        readableSize = file.size + ' octets';
      else if (file.size < Math.pow(2, 20))
        readableSize = Math.round(file.size / Math.pow(2, 10)) + ' Kio';
      else if (file.size < Math.pow(2, 30))
        readableSize = Math.round(file.size / Math.pow(2, 20) * 10) / 10 + ' Mio';
      else if (file.size < Math.pow(2, 40))
        readableSize = Math.round(file.size / Math.pow(2, 30) * 10) / 10 + ' Gio';
      else
        readableSize = 'taille inconnue'
    
      var $li = $('<li />').attr('data-id', fileId);
      $li.append("<div class='controls'><button type='button' class='send' data-id='" + fileId + "'>Envoyer</button>" +
        "<span style='display:none' class='progress-bar'><span class='progress'></span></span>" +
        "<button type='button' class='cancel' data-id='" + fileId + "'>Annuler</button></div>");
      $li.append("<div class='infos'><strong class='name'>" + file.name + "</strong>" +
        "<small class='size'>" + readableSize + "</small>" +
        "<small class='type'>" + file.type + "</small></div>");
      
      $('#waiting-list').prepend($li);
      
      var h = $li.height();
      
      $li.css({ opacity: 0, height: 0, scaleX: 5, scaleY: 5 })
      $li.animate({ opacity: 1, height: h - 10 + 'px', scaleX: 1, scaleY: 1 }, 800, 'ease-out')
    }
    else
      alert("Merci de passer à un navigateur récent, les dinosaures ne sont pas supportés.");
  }
  
  
  /**
    * Supprimer un fichier de la liste d'attente
    */
  
  $('button[data-id].cancel').live('click', function() {
    removeFromWaitingList(parseInt($(this).attr('data-id')));
  });
  
  /**
    * Supprimer un fichier de la liste d'attente
    */
  
  function removeFromWaitingList(fileId)
  {
    var file = waitingList[fileId];
    
    if (typeof file.xhr !== 'undefined' && file.xhr.readyState !== 4) {
      uploadAborted = true;
      file.xhr.abort();
    }
    
    delete waitingList[fileId];
    
    var $li = $('#waiting-list li[data-id="' + fileId + '"]');
    $li.animate({ opacity: 0, scaleX: 1.5, scaleY: 1.5 }, 150, 'ease-out',
      function() { $li.remove(); })
  };
  
  /**
   * Envoyer un fichier de la liste d'attente
   */
  
  $('button[data-id].send').live('click', function()
  {
    $('#waiting-list li[data-id="' + $(this).attr('data-id') + '"] button.send').remove();
    
    var $progressBar = $('#waiting-list li[data-id="' + $(this).attr('data-id') + '"] .progress-bar');
    $progressBar.css('display', 'inline-block');
    
    uploadFile(parseInt($(this).attr('data-id')), $progressBar)
  });
  
  /**
   * Envoyer un fichier
   */
  
  function uploadFile(fileId, $progressBar)
  {
      var file = waitingList[fileId];
      var formData = new FormData();
      var xhr = new XMLHttpRequest();
      file.xhr = xhr;
      
      // Update progress bar
      xhr.upload.addEventListener("progress", function (evt)
      {
        if (evt.lengthComputable)
          $progressBar.children('.progress').css('width', (evt.loaded / evt.total) * 70 + "px");
      }, false);
      
      // File uploaded
      xhr.addEventListener("readystatechange", function(evt) {
        if (evt.currentTarget.readyState == 4)
        {
          if (evt.currentTarget.status !== 200)
          {
            if (evt.currentTarget.status == 0)
            {
              if (uploadAborted)
              {
                $progressBar.html('Annulé').addClass('error');
                alert("L'envoi de \"" + file.name + "\" a été annulé.");
                uploadAborted = false;
              }
              else
              {
                $progressBar.html('Refusé').addClass('error');
                alert("Le fichier \"" + file.name + "\" a été refusé par le serveur.");
              }
            }
            else
            {
              $progressBar.html('Err. ' + evt.currentTarget.status).addClass('error');
              alert("Erreur lors de l'envoi de \"" + file.name + "\" : " + evt.currentTarget.responseText);
            }
          }
          else {
            console.log("Status : " + evt.currentTarget.status);
            removeFromWaitingList(fileId);
            updateFileList();
          }
        }
      }, false);
      
      xhr.addEventListener("onerror", function(evt) {
        console.log('Erreur !', evt);
      }, false);
      
      formData.append('files', file);
      xhr.open("post", "/upload-file", true);
      xhr.send(formData);
  }
  
  /**
   * Récupérer la liste des fichiers
   */
  
  function updateFileList()
  {
    $.ajax({
      url: '/file-list',
      data: {},
      dataType: 'html',
      context: $('#file-list'),
      success: function(data) {
        $(this).html(data);
      },
      error: function(xhr, type) {
        console.log('Impossible de récupérer la liste des fichiers (erreur ' + xhr.status + ') :\n' + xhr.responseText)
      }
    })
  }
  
  updateFileList();
  setInterval(updateFileList, 20000);
  
  /**
   * Ajoute chaque fichier à la liste d'attente
   */
  
  function traverseFiles(files)
  {
    if (typeof files !== "undefined")
    {
      for (var i=0, l=files.length; i<l; i++)
        addToWaitingList(files[i]);
    }
    else
      alert("Merci de passer à un navigateur récent, les dinosaures ne sont pas supportés.")
  }
  
  /**
   * Ajout de fichier avec le bouton
   */
  
  $('#files-upload').live('change', function() {
      traverseFiles(this.files);
  });
  
  /**
   * Gestion de la zone de drop
   */
  
  var dropArea = document.getElementById("drop-area")
  
  dropArea.addEventListener("dragleave", function (evt) {
      var target = evt.target;
      
      if (target && target === dropArea) {
          this.className = "";
      }
      evt.preventDefault();
      evt.stopPropagation();
  }, false);
  
  dropArea.addEventListener("dragenter", function (evt) {
      this.className = "over";
      evt.preventDefault();
      evt.stopPropagation();
  }, false);
  
  dropArea.addEventListener("dragover", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
  }, false);
  
  dropArea.addEventListener("drop", function (evt) {
      traverseFiles(evt.dataTransfer.files);
      this.className = "";
      evt.preventDefault();
      evt.stopPropagation();
  }, false);                                      
})();   
