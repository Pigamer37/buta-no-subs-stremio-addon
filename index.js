//npm run devStart
const express = require("express")
const app = express()

const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk')

function setCORS(req, res, next) {
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
      "logo": "https://www.stremio.com/website/stremio-logo-small.png",
      "description": packageJSON.description,
      "catalogs": [],
      "resources": [
        "subtitles"
      ],
      "types": [
        "movie",
        "anime",
        "other"
      ],
      "idPrefixes": [
        "tt"
      ]/*,
      "behaviorHints": { "configurable": true }*/
    }
    return manifest;
  })
}

app.get("/manifest.json", (req, res) => {
  ReadManifest().then((manif) => {
    //manif.behaviorHints.configurationRequired = true
    res.json(manif);
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})

app.get("/:config/manifest.json", (req, res) => {
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

app.listen(3000);