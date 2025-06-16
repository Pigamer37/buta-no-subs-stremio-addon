const express = require("express")
const subtitles = express.Router()

require('dotenv').config()//process.env.var

const Metadata = require('./metadata_copy.js')
const jimakuAPI = require('./jimaku.js')
const aniListAPI = require('./anilist.js')

/**
 * Tipical express middleware callback.
 * @callback subRequestMiddleware
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response
 * @param {function} [next] - The next middleware function in the chain, should end the response at some point
 */
/** 
 * Handles requests to /subtitles that contain extra parameters, we should append them to the request for future middleware, see {@link SearchParamsRegex} to see how these are handled
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, we don't end it because this function/middleware doesn't handle the full request!
 * @param {subRequestMiddleware} next - REQUIRED: The next middleware function in the chain, should end the response at some point
 */
function HandleLongSubRequest(req, res, next) {
  console.log(`\x1b[96mEntered HandleLongSubRequest with\x1b[39m ${req.originalUrl}`)
  res.locals.extraParams = SearchParamsRegex(req.params[0])
  next()
}
/** 
 * Handles requests to /subtitles whether they contain extra parameters (see {@link HandleLongSubRequest} for details on this) or just the type and videoID.
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, note we use next() just in case we need to add middleware, but the response is handled by sending an empty subtitles Object.
 * @param {subRequestMiddleware} [next] - The next middleware function in the chain, can be empty because we already responded with this middleware
 */
function HandleSubRequest(req, res, next) {
  console.log(`\x1b[96mEntered HandleSubRequest with\x1b[39m ${req.originalUrl}`)
  const idDetails = req.params.videoId.split(':')
  const videoID = idDetails[0] //We only want the first part of the videoID, which is the IMDB ID, the rest would be the season and episode
  const season = idDetails[1] //undefined if we don't get a season number in the query, which is fine
  const episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
  console.log(`\x1b[33mGot a ${req.params.type} with ID:\x1b[39m ${videoID}`)
  console.log('Extra parameters:', res.locals.extraParams)
  //get title from TMDB or Cinemeta metadata
  const titlePromise = Metadata.GetTMDBMeta(videoID).then((TMDBmeta) => {
    console.log('\x1b[36mGot TMDB metadata:\x1b[39m', TMDBmeta.shortPrint())
    return TMDBmeta.title //We can use this to search for Jimaku subtitles
  }).catch((reason) => {
    console.error("\x1b[31mDidn't get TMDB metadata because:\x1b[39m " + reason + ", trying Cinemeta...")
    return Metadata.GetCinemetaMeta(videoID).then((Cinemeta) => {
      console.log('\x1b[36mGot Cinemeta metadata:\x1b[39m', Cinemeta.shortPrint())
      return Cinemeta.title //We can use this to search for Jimaku subtitles
    })
  }).catch((err) => {
    console.error('\x1b[31mFailed on metadata:\x1b[39m ' + err)
    res.json({ subtitles: [], message: "Failed getting media info" });
    next()
  })
  const jimakuIDPromise = titlePromise.then((title) => {
    if (!title) { throw Error("No title found in metadata!") } //If we don't have a title, we can't search for subtitles
    if (season !== undefined && season !== "1") { title += ` ${season}` } //If we have a season, append it to the title
    console.log('\x1b[33mSearching for Jimaku subtitles for\x1b[39m', title)
    return jimakuAPI.SearchForJimakuEntry(title).then((jimakuEntry) => {
      return jimakuEntry.id
    }).catch((reason) => {
      console.error("\x1b[31mDidn't get Jimaku entry because:\x1b[39m " + reason + ", trying AniList...")
      return aniListAPI.GetAniListID(title).then((aniListID) => {
        console.log('\x1b[36mGot AniList ID:\x1b[39m', aniListID)
        return jimakuAPI.GetJimakuEntryFromAniList(aniListID)
          .then((jimakuEntry) => {
            return jimakuEntry.id
          })
      })
    })
  }).catch((err) => {
    console.error('\x1b[31mFailed on jimakuID:\x1b[39m ' + err)
    res.json({ subtitles: [], message: "Failed getting jimakuID" });
    next()
  })

  jimakuIDPromise.then((jimakuID) => {
    if (!jimakuID) { throw Error("No jimakuID!") } //If we don't have a title, we can't search for subtitles
    console.log('\x1b[36mGot Jimaku ID:\x1b[39m', jimakuID)
    return jimakuAPI.GetJimakuFiles(jimakuID, episode).then((jimakuFiles) => {
      console.log('\x1b[36mGot Jimaku files:\x1b[39m', jimakuFiles)
      //We can now respond with the subtitles
      res.json(jimakuFiles);
      next()
    }).catch((err) => {
      console.error('\x1b[31mFailed getting Jimaku files:\x1b[39m ' + err)
      res.json({ subtitles: [], message: "Failed getting Jimaku files" });
      next()
    })
  }).catch((err) => {
    if (err.message === "No jimakuID!")
      console.error('\x1b[31mFailed getting Jimaku files:\x1b[39m ' + err)
  })
  /*Metadata.GetTMDBMeta(videoID).then((TMDBmeta) => {
    console.log('\x1b[36mGot TMDB metadata:\x1b[39m', TMDBmeta.shortPrint())
    res.json({ subtitles: [{ id: 1, url: "about:blank", lang: "LB-TMDBOK" }], message: "Got TMDB metadata" });
    next()
  }, (reason) => {
    console.error("\x1b[31mDidn't get TMDB metadata because:\x1b[39m " + reason + ", trying Cinemeta...")
    return Metadata.GetCinemetaMeta(videoID).then((Cinemeta) => {
      console.log('\x1b[36mGot Cinemeta metadata:\x1b[39m', Cinemeta.shortPrint())
      res.json({ subtitles: [{ id: 1, url: "about:blank", lang: "LB-CineMOK" }], message: "Got Cinemeta metadata" });
      next()
    })
  }).catch((err) => {
    console.error('\x1b[31mFailed:\x1b[39m ' + err)
    res.json({ subtitles: [], message: "Failed getting movie info" });
    next()
  })*/
}
/** 
 * Parses the extra config parameter we can get when the addon is configured
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, note we use next() just in case we need to add middleware
 * @param {subRequestMiddleware} [next] - The next middleware function in the chain
 */
function ParseConfig(req, res, next) {
  console.log(`\x1b[96mEntered ParseConfig with\x1b[39m ${req.originalUrl}`)
  res.locals.config = new URLSearchParams(decodeURIComponent(req.params.config))
  console.log('Config parameters:', res.locals.config)
  next()
}
//Configured requests
subtitles.get("/:config/subtitles/:type/:videoId/*.json", ParseConfig, HandleLongSubRequest, HandleSubRequest)
subtitles.get("/:config/subtitles/:type/:videoId.json", ParseConfig, HandleSubRequest)
//Unconfigured requests
subtitles.get("/subtitles/:type/:videoId/*.json", HandleLongSubRequest, HandleSubRequest)
subtitles.get("/subtitles/:type/:videoId.json", HandleSubRequest)
/** 
 * Parses the capture group corresponding to URL parameters that stremio might send with its request. Tipical extra info is a dot separated title, the video hash or even file size
 * @param {string} extraParams - The string captured by express in req.params[0] in route {@link subtitles.get("/:type/:videoId/*.json", HandleLongSubRequest, HandleSubRequest)}
 * @return {Object} Empty if we passed undefined, populated with key/value pairs corresponding to parameters otherwise
 */
function SearchParamsRegex(extraParams) {
  //console.log(`\x1b[33mfull extra params were:\x1b[39m ${extraParams}`)
  if (extraParams !== undefined) {
    const paramMap = new Map()
    const keyVals = extraParams.split('&');
    for (let keyVal of keyVals) {
      const keyValArr = keyVal.split('=')
      const param = keyValArr[0]; const val = keyValArr[1];
      paramMap.set(param, val)
    }
    const paramJSON = Object.fromEntries(paramMap)
    //console.log(paramJSON)
    return paramJSON
  } else return {}
}

module.exports = subtitles;