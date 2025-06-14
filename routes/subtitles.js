const express = require("express")
const subtitles = express.Router()

require('dotenv').config()//process.env.var

//MetadataHandler = import("./TMDB.js")
const Metadata = require('./metadata_copy.js')

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
  console.log('\x1b[33mGot a movie\x1b[39m')
  //console.log('Extra parameters:', res.locals.extraParams)
  const videoID = req.params.videoId
  Metadata.GetTMDBMeta(videoID).then((TMDBmeta) => {
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
  })
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