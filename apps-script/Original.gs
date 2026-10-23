function legacyGet_(e) {
  try {
    var ss = db_();
    
    // 1. OBTENER CURSOS
    var sheetCursos = ss.getSheetByName("Cursos");
    var rawCursos = sheetCursos ? sheetCursos.getDataRange().getValues() : [];
    var cursos = [];
    for (var i = 1; i < rawCursos.length; i++) {
      if(rawCursos[i][0]) {
        cursos.push({
          id: rawCursos[i][0].toString().trim(),
          nombre: rawCursos[i][1].toString().trim(),
          categoria: rawCursos[i][2].toString().trim(),
          instructor: rawCursos[i][3].toString().trim(),
          foto: rawCursos[i][4].toString().trim(),
          silaboLink: rawCursos[i][5].toString().trim()
        });
      }
    }

    // 2. OBTENER CLASES CON BÚSQUEDA BLINDADA DE COLUMNAS
    var sheetClases = ss.getSheetByName("Clases");
    var rawClases = sheetClases ? sheetClases.getDataRange().getValues() : [];
    var headers = rawClases.length > 0 ? rawClases[0] : [];
    var clases = [];

    // Crear mapa de columnas (ignora espacios, mayúsculas y guiones bajos automáticamente)
    var hMap = {};
    for(var k = 0; k < headers.length; k++) {
       // Ej: "Meet G1", "Meet_G1", "meet g1" -> TODO se convierte en "meetg1"
       var hName = headers[k].toString().toLowerCase().replace(/[\s_]+/g, ''); 
       hMap[hName] = k;
    }

    for (var j = 1; j < rawClases.length; j++) {
      if(!rawClases[j][0]) continue; // Saltar filas vacías
      
      var claseObj = {
        // Busca las columnas base
        cursoId: rawClases[j][hMap["cursoid"] !== undefined ? hMap["cursoid"] : 0].toString().trim(),
        code: rawClases[j][hMap["semanacode"] !== undefined ? hMap["semanacode"] : 1].toString().trim(),
        title: rawClases[j][hMap["titulo"] !== undefined ? hMap["titulo"] : 2].toString().trim(),
        focus: rawClases[j][hMap["enfoque"] !== undefined ? hMap["enfoque"] : 3].toString().trim(),
        
        // Busca PPT y PDF
        pptLink: hMap["ppt"] !== undefined ? rawClases[j][hMap["ppt"]].toString().trim() : "",
        pdfResumenLink: hMap["pdfresumen"] !== undefined ? rawClases[j][hMap["pdfresumen"]].toString().trim() : "",
        
        meetLinks: {},
        videoLinks: {}
      };

      // Rastrear hasta 10 grupos automáticamente (G1, G2 ... G10)
      var groupNumbers = Object.keys(hMap).filter(function(key){return /^(meet|video)g[0-9]+$/.test(key);}).map(function(key){return Number(key.match(/[0-9]+$/)[0]);});
      var uniqueGroups = groupNumbers.filter(function(n,i,a){return a.indexOf(n)===i;});
      for(var gi = 0; gi < uniqueGroups.length; gi++) {
         var g = uniqueGroups[gi];
         // Aseguramos que la búsqueda se haga en minúsculas y sin espacios, 
         // tal cual como se formatearon los encabezados en hMap
         var mKey = "meetg" + g;
         var vKey = "videog" + g;
         
         if(hMap[mKey] !== undefined) {
           claseObj.meetLinks["G"+g] = rawClases[j][hMap[mKey]].toString().trim();
         }
         if(hMap[vKey] !== undefined) {
           claseObj.videoLinks["G"+g] = rawClases[j][hMap[vKey]].toString().trim();
         }
      }

      clases.push(claseObj);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      cursos: cursos,
      clases: clases
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// Compatibility login: retains original credentials; supports generated password hashes.
// ==========================================
function legacyPost_(e) {
  try {
    var sheet = db_().getSheetByName("Usuarios") || db_().getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "login") {
      var email = data.email.trim().toLowerCase();
      var password = data.password.trim();
      var rows = sheet.getDataRange().getValues();
      
      for (var i = 1; i < rows.length; i++) {
        var userEmail = rows[i][1].toString().trim().toLowerCase();
        var userPass = rows[i][2].toString().trim();
        var userStatus = rows[i][3].toString().trim().toUpperCase();
        var cursosInscritos = rows[i][4] ? rows[i][4].toString().split(',').map(function(c){return c.trim();}) : [];
        var userGroup = rows[i][5] ? rows[i][5].toString().trim().toUpperCase() : "G1";
        
        if (userEmail === email && verifyStudentPassword_(password, userPass)) {
          if (userStatus === "ACTIVO") {
            return ContentService.createTextOutput(JSON.stringify({
              success: true,
              nombre: rows[i][0],
              email: rows[i][1],
              cursosInscritos: cursosInscritos,
              grupo: userGroup,
              _row: i + 1
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
            return ContentService.createTextOutput(JSON.stringify({
              success: false, message: "Tu cuenta está pendiente de activación."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: false, message: "Correo o contraseña incorrectos."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: "Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}