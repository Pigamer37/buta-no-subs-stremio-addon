//npm run devStart
const express = require("express")
const app = express()

//const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk')

function setCORS(_req, res, next) {
  res.header(`Access-Control-Allow-Origin`, `*`);
  res.header(`Access-Control-Allow-Methods`, `GET,PUT,POST,DELETE`);
  res.header(`Access-Control-Allow-Headers`, `Content-Type`);
  next();
}
app.use(setCORS);

app.use(express.static('public'))
app.set('view engine', 'ejs');

const fsPromises = require("fs/promises")
function ReadManifest() {
  return fsPromises.readFile('./package.json', 'utf8').then((data) => {
    const packageJSON = JSON.parse(data);
    const nameVec = packageJSON.name.split('-');
    let humName = "";
    for (let i = 0; i < nameVec.length; i++) {
      let word = nameVec[i];
      humName += word.charAt(0).toUpperCase() + word.slice(1);
      if (i !== nameVec.length - 1) humName += " ";
    }

    let manifest = {
      "id": 'com.' + packageJSON.name.replaceAll('-', '.'),
      "version": packageJSON.version,
      "name": humName,
      "logo": "https://i.imgur.com/VZK8qw2.png",
      "description": packageJSON.description,
      "catalogs": [],
      "resources": [
        "subtitles"
      ],
      "types": [
        "movie",
        "series",
        "anime",
        "other"
      ],
      "idPrefixes": [
        "tt",
        "anilist",
        "kitsu",
        "mal",
        "anidb"
      ]/*,
      "behaviorHints": { "configurable": true }*/
    }
    return manifest;
  })
}

app.get("/manifest.json", (_req, res) => {
  ReadManifest().then((manif) => {
    //manif.behaviorHints.configurationRequired = true
    res.json(manif);
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})

app.get("/:config/manifest.json", (_req, res) => {
  ReadManifest().then((manif) => {
    //console.log("Params:", decodeURIComponent(req.params[0]))
    res.json(manif);
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})

/*app.get("/configure", (req, res) => {
  ReadManifest().then((manif) => {
    let base_url = req.hostname;
    if (req.hostname === "127.0.0.1") base_url += ":3000";
    res.render('config', {
      logged_in: false,
      base_url: base_url,
      manifest: manif
    })
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})
//WIP
app.get("/:config/configure", (req, res) => {
  ReadManifest().then((manif) => {
    let base_url = req.hostname;
    if (req.hostname === "127.0.0.1") base_url += ":3000";
    res.render('config', {
      logged_in: true,
      config: req.params.config,
      user: req.params.config,
      base_url: base_url,
      manifest: manif
    })
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})*/

const subtitles = require("./routes/subtitles");
app.use(subtitles);

app.listen(process.env.PORT || 3000, () => {
  console.log(`\x1b[32mbuta-no-subs-stremio-addon is listening on port ${process.env.PORT || 3000}\x1b[33m`)
  console.log(`                                                                    
                                                                    
    @@@@@@@@@#.    .@@@@@@@@@@.  @@@@@@@@@- @@@@@@@@@@@@@@@@@@@@    
    @@@@@@@@@@   #@@@@@@@@@@@    @@*    #@-         .@@@@.          
    @@@@@@@@:  @@@@@@@@@@@@@.   .@@@@@@@@@=      .@@@@#@@.          
    @@@@@@@..@@@@@@@@@@@@@@@    #@@..-+=@@=   =@@@@=  -@@-          
    @@@@@@@@@@@@@@@@@@@@@@@@    @@@@@+. @@- @@@@=@@@.  @@@    #@    
    @@@@@@@@@@@@@@@@@@@@@@@    #@@:#@@@@@@-       *@@= #@@-#@@@@    
    @@@@@@@@@@@@@@@@@@@@@@.   .@@:    .@@@:     .@@@@@= @@@@@*      
    @@@@@@@@@@@@@@@@@@@@@     @@        @@-   #@@@# -@@ =@@.        
    @@@@@@@@@@@@@@@@@@@@   :@@=         @@- #@@@.    +@@ #@*        
    @@@@@@@@@@@@@@@@@@                  @@:         #@@@* @@=       
    @@@@@@@@@@@@@@#.  .@@               @@:       @@@@@@@. @@*      
    @@@@@@@@@@@:  .=@@@@@:              @@.    *@@@.  *@@:  +@@     
    @@@@@@@@@@@@@@@@@@@@@@              @@. :@@@*     @@@     +@:   
    @@@@@@@@@@@@@@@@@@@@@@@          . .@@           #@@            
    @@@@@@@@@@@@@@@@@@@@@@@@.        @@@@@         #@@              
    @@@@@@@@@@@@@@@@@@@@@@@@@#         *#                           
    @@@@@@@@@@@@@@@@@@@@@@@@@@@.       .#@@@@-        -*#@@:        
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@*.@@@@@ #@@@@@=    #@@=.+@@@@@+     
    @@@@@@@@@@@@@@@@@.   #@@@@@@@@@@@@@@@@@@@@-   @@#    +@@.@@@    
    @@@@@@@@@@@@@@@-   .@@@@@@@@@@@@@@@@*-@@@@    @@.    @@# .@@.   
    @@@@@@@@@@@@@:   .@@@@@@@@@@@@@@@@@@@+#@@@    @@@-.-@@#  .@@.   
    @@@@@@@@@@    .#@@@@@@@@@@@@@@@@@@@@@@@@@*     .@@@@@.   +@*    
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#.                           
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@=                                
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@.  -@@#. #@   #@  #@@@+    @@@+     
    @@@@@@@@@@@@@@@@@@@@@@@@#    #@@  @# @@   @@  @@  @@ =@#  @-    
    @@@@@@@@@@@@@@@@@@@@@@=      #@@@@.  @@   @@  @@=@@@ =@@@+      
    @@@@@@@@@@@@@@@@@@@@#          .#@@@.@@   @@  @@@@@@.  .#@@+    
    @@@@@@@@@@@@@@@@@@@@        @@=  .@@ #@+ +@@  @@  @@# .  @@@    
    @@@@@@@@@@@@@@@@@@@@#        *@@@@@  .@@@@@#  #@@@@# :@@@@@     
    @@@@@@@@@@@@@@@@@@@@@@@#:                                       
    @@@@@@@@@@@@@@@@@@@@@@@@@@@#.    #@@@@@@@@@@@@@@@@@@@@@@@@@@    
    @@@+.  ..:*@@@@@@@@@@#-      .*#@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
                                                                    
                                                                    
  \x1b[39m`)
  const kitsunekkoAPI = require('./routes/kitsunekko.js')
  kitsunekkoAPI.UpdateKitsunekkoTitleFile().then(() => {
    console.log('\x1b[32mKitsunekko titles "cached" successfully!\x1b[39m')
    setInterval(kitsunekkoAPI.UpdateKitsunekkoTitleFile, 86400000); //Update every 24h
  })
});
